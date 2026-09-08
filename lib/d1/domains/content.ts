import { z } from "zod";
import { randomUUID } from "node:crypto";
import { DataServiceError, type Database, type SqlValue } from "../database";
import { decodeRow } from "../row-codec";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";
import { encryptSubmissionSecrets } from "@/lib/security/submission-secrets";

const identifier = z.string().min(1).max(128);
const actor = z.object({ userId: identifier });
const paging = { pageSize: z.number().int().min(1).max(50).optional(), cursor: z.string().max(2048).optional() };
const categories = ["instagram", "meta_ads", "naver_blog", "ai"] as const;
const HOMEPAGE_FIELDS = ["홈페이지제작방식", "홈페이지스타일", "홈페이지컬러컨셉", "해외결제카드앞면URL", "해외결제카드뒷면URL", "해외결제카드유효기간", "해외결제카드CVC", "GmailID", "GmailPW"] as const;
const countCache = new Map<string, { value: number; expiresAt: number }>();

async function requireUser(db: Database, userId: string) {
  const user = await db.prepare('SELECT "id", "cohortId" FROM "users" WHERE "id" = ? LIMIT 1')
    .bind(userId).first<{ id: string; cohortId: string }>();
  if (!user) throw new DataServiceError(401, "Unauthorized");
  return user;
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DataServiceError(400, "Invalid input");
  return result.data;
}

async function timePage(db: Database, table: "content_tips" | "announcements", where: string,
  params: SqlValue[], input: { pageSize?: number; cursor?: string }, scope: string, secret: string) {
  const size = parsePageSize(input.pageSize);
  const countParams = [...params];
  let continuation = "";
  if (input.cursor) {
    const cursor = verifyCursor(secret, input.cursor, scope, ["createdAt", "id"]);
    const at = Number(cursor.sort[0].value);
    if (!Number.isSafeInteger(at)) throw new DataServiceError(400, "Invalid cursor");
    continuation = ' AND ("createdAt", "id") < (?, ?)';
    params.push(at, cursor.sort[1].value);
  }
  const result = await db.prepare(`SELECT * FROM "${table}" WHERE ${where}${continuation} ORDER BY "createdAt" DESC,"id" DESC LIMIT ?`)
    .bind(...params, size + 1).all<Record<string, unknown>>();
  const items = result.results.slice(0, size).map(row => decodeRow(table, row));
  const last = result.results.length > size ? result.results[size - 1] : undefined;
  const countKey = JSON.stringify([table, where, countParams]);
  const cachedCount = countCache.get(countKey);
  let total = cachedCount && cachedCount.expiresAt > Date.now() ? cachedCount.value : -1;
  if (total < 0) {
    const countRow = await db.prepare(`SELECT COUNT(*) AS "total" FROM "${table}" WHERE ${where}`).bind(...countParams).first<{ total: number }>();
    total = Number(countRow?.total ?? 0);
    countCache.set(countKey, { value: total, expiresAt: Date.now() + 30_000 });
    if (countCache.size > 100) countCache.delete(countCache.keys().next().value as string);
  }
  return { items, total, nextCursor: last ? signCursor(secret, { version: 1, scope, sort: [
    { field: "createdAt", value: String(last.createdAt) }, { field: "id", value: String(last.id) },
  ] }) : null };
}

export async function contentOperation(db: Database, operation: string, input: unknown, cursorSecret: string, _encryptionKey?: string): Promise<unknown> {
  if (operation === "active-cohorts") {
    parse(z.object({}).strict(), input);
    const rows = await db.prepare('SELECT "id","name","교육시작일","자료제출마감일" FROM "cohorts" WHERE "isActive" = 1 ORDER BY "createdAt" DESC,"id" DESC LIMIT 51').all<Record<string, unknown>>();
    if (rows.results.length > 50) throw new DataServiceError(409, "Active cohort capacity exceeded");
    return rows.results.map(row => decodeRow("cohorts", row));
  }
  if (operation === "homepage-get") {
    const data = parse(actor.passthrough(), input);
    await requireUser(db, data.userId);
    const row = await db.prepare(`SELECT ${HOMEPAGE_FIELDS.map((field) => `"${field}"`).join(",")} FROM "submissions" WHERE "userId" = ? LIMIT 1`).bind(data.userId).first<Record<string, unknown>>();
    return row ? decodeRow("submissions", row) : {};
  }
  if (operation === "homepage-update") {
    const data = parse(actor.extend({ changes: z.object({
      홈페이지제작방식: z.string().max(128), 홈페이지스타일: z.string().max(512).nullable(), 홈페이지컬러컨셉: z.string().max(128).nullable(),
      해외결제카드앞면URL: z.string().max(2048), 해외결제카드뒷면URL: z.string().max(2048).nullable(), 해외결제카드유효기간: z.string().max(16), 해외결제카드CVC: z.string().max(8), GmailID: z.string().max(256), GmailPW: z.string().max(256),
    }).strict() }).strict(), input);
    await requireUser(db, data.userId);
    const existing = await db.prepare('SELECT "id" FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(data.userId).first<{ id: string }>();
    const now = Date.now();
    const encryptedChanges = encryptSubmissionSecrets(data.changes, data.userId, _encryptionKey);
    const values = HOMEPAGE_FIELDS.map((field) => encryptedChanges[field]);
    if (existing) {
      await db.prepare(`UPDATE "submissions" SET ${HOMEPAGE_FIELDS.map((field) => `"${field}" = ?`).join(",")}, "updatedAt" = ? WHERE "userId" = ?`).bind(...values, now, data.userId).all();
    } else {
      await db.prepare(`INSERT INTO "submissions" ("id","userId",${HOMEPAGE_FIELDS.map((field) => `"${field}"`).join(",")},"createdAt","updatedAt") VALUES (?, ?, ${HOMEPAGE_FIELDS.map(() => "?").join(",")}, ?, ?)`).bind(randomUUID(), data.userId, ...values, now, now).all();
    }
    const notification = await db.prepare('SELECT u."이름" AS "name", u."slackChannelId", c."name" AS "cohortName", s."브랜드명" AS "brandName" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" LEFT JOIN "submissions" s ON s."userId" = u."id" WHERE u."id" = ? LIMIT 1').bind(data.userId).first<Record<string, unknown>>();
    return { success: true, notification };
  }
  if (operation === "public-tips" || operation === "announcements" || operation === "category-tips") {
    const data = parse(z.object({ ...paging, userId: identifier.optional(), category: z.enum(categories).optional(), subCategory: z.string().max(128).nullable().optional() }).strict(), input);
    if (operation !== "public-tips") {
      if (!data.userId) throw new DataServiceError(401, "Unauthorized");
      await requireUser(db, data.userId);
    }
    const scope = `${operation}:${data.userId ?? "public"}:${data.category ?? "all"}:${data.subCategory ?? "all"}`;
    const table = operation === "announcements" ? "announcements" : "content_tips";
    let where = '"published" = 1';
    const params: SqlValue[] = [];
    if (operation === "category-tips") {
      if (!data.category) throw new DataServiceError(400, "Category required");
      where += ' AND "category" = ?'; params.push(data.category);
      if (data.subCategory) { where += ' AND "subCategory" = ?'; params.push(data.subCategory); }
    }
    const page = await timePage(db, table, where, params, data, scope, cursorSecret) as { items: unknown[]; total: number; nextCursor: string | null };
    if (operation === "category-tips" && data.category) {
      const subCategories = await db.prepare('SELECT DISTINCT "subCategory" FROM "content_tips" WHERE "published" = 1 AND "category" = ? AND "subCategory" IS NOT NULL ORDER BY "subCategory" LIMIT 100').bind(data.category).all<{ subCategory: string }>();
      return { ...page, availableSubCategories: subCategories.results.map((row) => row.subCategory) };
    }
    return page;
  }
  const data = parse(actor.passthrough(), input);
  const user = await requireUser(db, data.userId);
  if (operation === "deadline") {
    const row = await db.prepare('SELECT "자료제출마감일" FROM "cohorts" WHERE "id" = ? LIMIT 1').bind(user.cohortId).first<{ 자료제출마감일: number }>();
    if (!row) throw new DataServiceError(404, "Cohort not found");
    return { deadline: new Date(row.자료제출마감일) };
  }
  if (operation === "settings-before") {
    const row = await db.prepare('SELECT "SMS수신동의","이메일수신동의","slackChannelId" FROM "users" WHERE "id" = ? LIMIT 1').bind(user.id).first<Record<string, unknown>>();
    return row ? decodeRow("users", row) : null;
  }
  if (operation === "settings-update") {
    const settings = parse(actor.extend({ changes: z.object({
      공지사항이메일수신: z.boolean().optional(), 콘텐츠팁이메일수신: z.boolean().optional(),
      SMS수신동의: z.boolean().optional(), 이메일수신동의: z.boolean().optional(),
    }).strict() }).strict(), input);
    const fields = Object.entries(settings.changes).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean");
    if (fields.length) {
      await db.prepare(`UPDATE "users" SET ${fields.map(([key]) => `"${key}" = ?`).join(",")}, "updatedAt" = ? WHERE "id" = ?`)
        .bind(...fields.map(([, value]) => value ? 1 : 0), Date.now(), user.id).all();
    }
    const row = await db.prepare('SELECT "공지사항이메일수신","콘텐츠팁이메일수신","SMS수신동의","이메일수신동의" FROM "users" WHERE "id" = ? LIMIT 1').bind(user.id).first<Record<string, unknown>>();
    return row ? decodeRow("users", row) : null;
  }
  if (operation === "dismiss-alert") {
    const dismiss = parse(actor.extend({ alertId: identifier }).strict(), input);
    const alert = await db.prepare('SELECT "id" FROM "system_alerts" WHERE "id" = ? AND ("cohortId" IS NULL OR "cohortId" = ?) LIMIT 1').bind(dismiss.alertId, user.cohortId).first();
    if (!alert) throw new DataServiceError(404, "Alert not found");
    const now = Date.now();
    await db.prepare('INSERT INTO "alert_dismissals" ("id","userId","alertId","dismissedAt","expiresAt","createdAt") VALUES (?,?,?,?,?,?) ON CONFLICT("userId","alertId") DO UPDATE SET "dismissedAt" = excluded."dismissedAt", "expiresAt" = excluded."expiresAt"')
      .bind(randomUUID(), user.id, dismiss.alertId, now, now + 86_400_000, now).all();
    return { success: true, message: "24시간 동안 이 알림이 표시되지 않습니다." };
  }
  if (operation === "active-alerts") {
    const now = Date.now();
    const rows = await db.prepare(`SELECT "id","title","content","type","priority","cohortId","phoneNumber","endDate"
      FROM "system_alerts" WHERE "isActive" = 1 AND "startDate" <= ? AND "endDate" >= ?
      AND ("cohortId" IS NULL OR "cohortId" = ?)
      AND NOT EXISTS (SELECT 1 FROM "alert_dismissals" d WHERE d."userId" = ? AND d."alertId" = "system_alerts"."id" AND d."expiresAt" >= ?)
      ORDER BY "priority" DESC, "endDate" ASC, "id" DESC LIMIT 100`).bind(now, now, user.cohortId, user.id, now).all<Record<string, unknown>>();
    const alerts = rows.results.map((row) => decodeRow("system_alerts", row));
    return { success: true, alerts };
  }
  if (operation === "marketing-extension-request") {
    const data = parse(actor.extend({ requestMessage: z.string().max(4000).optional() }).strict(), input);
    const current = await db.prepare('SELECT "marketingSupportEnabled","marketingSupportEndDate","이름","email" FROM "users" WHERE "id" = ? LIMIT 1').bind(user.id).first<Record<string, unknown>>();
    if (!current) throw new DataServiceError(404, "User not found");
    if (current.marketingSupportEnabled !== 1 || typeof current.marketingSupportEndDate !== "number") throw new DataServiceError(400, "마케팅 지원이 활성화되지 않았습니다");
    const pending = await db.prepare('SELECT "id" FROM "marketing_extension_requests" WHERE "userId" = ? AND "status" = ? LIMIT 1').bind(user.id, "pending").first();
    if (pending) throw new DataServiceError(400, "이미 처리 대기 중인 연장 신청이 있습니다");
    const currentEndDate = Number(current.marketingSupportEndDate);
    const newEnd = new Date(currentEndDate);
    newEnd.setDate(newEnd.getDate() + 56);
    const now = Date.now();
    const requestId = randomUUID();
    try {
      await db.prepare(`INSERT INTO "marketing_extension_requests" ("id","userId","requestDate","currentEndDate","newEndDate","requestMessage","status","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?, ?, ?)`)
        .bind(requestId, user.id, now, currentEndDate, newEnd.getTime(), data.requestMessage ?? "", "pending", now, now).all();
    } catch {
      throw new DataServiceError(409, "이미 처리 대기 중인 연장 신청이 있습니다");
    }
    return { success: true, id: requestId, currentEndDate, newEndDate: newEnd.getTime(), requestMessage: data.requestMessage ?? "", userName: current.이름, email: current.email };
  }
  throw new DataServiceError(404, "Unknown content operation");
}
