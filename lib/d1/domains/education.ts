import { randomUUID } from "node:crypto";
import { DataServiceError, type Database, type SqlValue } from "../database";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";

type Input = Record<string, unknown>;
type Row = Record<string, unknown>;
const ADMIN_ROLES = new Set(["super", "designer", "operator"]);
const EIGHT_WEEKS_MS = 56 * 24 * 60 * 60 * 1000;
const aggregateCache = new Map<string, { expiresAt: number; value: unknown }>();

function text(input: Input, key: string, max = 512): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new DataServiceError(400, `${key} is required`);
  }
  return value.trim();
}

function optionalText(input: Input, key: string, max = 2048): string | null {
  const value = input[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new DataServiceError(400, `Invalid ${key}`);
  return value.trim();
}

function integer(input: Input, key: string): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new DataServiceError(400, `Invalid ${key}`);
  return value;
}

async function first<T extends Row>(db: Database, sql: string, values: SqlValue[] = []): Promise<T | null> {
  return db.prepare(sql).bind(...values).first<T>();
}

async function all<T extends Row>(db: Database, sql: string, values: SqlValue[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return result.results;
}

async function assertAdmin(db: Database, adminId: string): Promise<void> {
  const row = await first<{ role: string }>(db, 'SELECT "role" FROM "admins" WHERE "id" = ? LIMIT 1', [adminId]);
  if (!row || !ADMIN_ROLES.has(row.role)) throw new DataServiceError(403, "Forbidden");
}

function normalizePhone(raw: string): { digits: string; formatted: string } {
  const digits = raw.replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(digits)) throw new DataServiceError(400, "Invalid phone");
  const formatted = digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return { digits, formatted };
}

async function effectiveAccess(db: Database, userId: string, startAt: number) {
  const baseEndAt = startAt + EIGHT_WEEKS_MS;
  const approved = await first<{ approvedUntil: number | null }>(db,
    'SELECT MAX("approvedUntil") AS "approvedUntil" FROM "education_extension_requests" WHERE "userId" = ? AND "status" = ? AND "approvedUntil" IS NOT NULL',
    [userId, "approved"],
  );
  return Math.max(baseEndAt, Number(approved?.approvedUntil ?? 0));
}

async function writeEvent(db: Database, input: Input, eventType: string, outcome: string, userId?: string | null, cohortId?: string | null) {
  const metadata = input.metadata === undefined ? null : JSON.stringify(input.metadata);
  await db.prepare(
    'INSERT INTO "education_access_events" ("id","userId","cohortId","eventType","outcome","ipAddress","ipHash","userAgent","country","city","path","metadata","createdAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
  ).bind(
    randomUUID(), userId ?? null, cohortId ?? null, eventType, outcome,
    optionalText(input, "ipAddress", 128), text(input, "ipHash", 128), optionalText(input, "userAgent", 1024),
    optionalText(input, "country", 64), optionalText(input, "city", 128), optionalText(input, "path", 512), metadata, Date.now(),
  ).all();
}

async function checkBlocked(db: Database, ipHash: string): Promise<void> {
  const row = await first<{ blockedUntil: number }>(db, 'SELECT "blockedUntil" FROM "education_ip_blocks" WHERE "ipHash" = ? LIMIT 1', [ipHash]);
  if (row && Number(row.blockedUntil) > Date.now()) throw new DataServiceError(429, "Access temporarily blocked");
}

async function consumeRate(db: Database, keyHash: string, action: string, max: number, windowMs: number, blockMs: number) {
  const now = Date.now();
  const current = await first<{ windowStartedAt: number; count: number; blockedUntil: number | null }>(db,
    'SELECT "windowStartedAt","count","blockedUntil" FROM "education_rate_windows" WHERE "keyHash" = ? LIMIT 1', [keyHash]);
  if (current?.blockedUntil && Number(current.blockedUntil) > now) throw new DataServiceError(429, "Too many requests");
  const reset = !current || now - Number(current.windowStartedAt) >= windowMs;
  const count = reset ? 1 : Number(current.count) + 1;
  const blockedUntil = count > max ? now + blockMs : null;
  await db.prepare(
    'INSERT INTO "education_rate_windows" ("keyHash","action","windowStartedAt","count","blockedUntil","updatedAt") VALUES (?,?,?,?,?,?) ON CONFLICT("keyHash") DO UPDATE SET "action"=excluded."action","windowStartedAt"=excluded."windowStartedAt","count"=excluded."count","blockedUntil"=excluded."blockedUntil","updatedAt"=excluded."updatedAt"',
  ).bind(keyHash, action, reset ? now : Number(current!.windowStartedAt), count, blockedUntil, now).all();
  if (blockedUntil) throw new DataServiceError(429, "Too many requests");
}

async function studentLogin(db: Database, input: Input) {
  const ipHash = text(input, "ipHash", 128);
  await checkBlocked(db, ipHash);
  await consumeRate(db, `login-ip:${ipHash}`, "student-login", 20, 15 * 60_000, 60 * 60_000);
  const phone = normalizePhone(text(input, "phone", 32));
  const accountHash = text(input, "accountHash", 128);
  await consumeRate(db, `login-account:${accountHash}`, "student-login-account", 5, 15 * 60_000, 30 * 60_000);
  const user = await first<{ id: string; name: string; phone: string; cohortId: string; cohortName: string; startAt: number; status: string }>(db,
    'SELECT u."id",u."이름" AS "name",u."연락처" AS "phone",u."cohortId",u."status",c."name" AS "cohortName",c."교육시작일" AS "startAt" FROM "users" u INNER JOIN "cohorts" c ON c."id"=u."cohortId" WHERE (u."연락처"=? OR u."연락처"=?) LIMIT 1',
    [phone.digits, phone.formatted],
  );
  if (!user || user.status === "inactive") {
    await writeEvent(db, input, "login", "denied");
    throw new DataServiceError(401, "등록된 교육생 정보를 찾을 수 없습니다");
  }
  const now = Date.now();
  const endAt = await effectiveAccess(db, user.id, Number(user.startAt));
  const outcome = now < Number(user.startAt) ? "not_started" : now >= endAt ? "expired" : "success";
  await writeEvent(db, input, "login", outcome, user.id, user.cohortId);
  return { ...user, startAt: Number(user.startAt), endAt, outcome };
}

async function extensionRequest(db: Database, input: Input) {
  const ipHash = text(input, "ipHash", 128);
  await checkBlocked(db, ipHash);
  await consumeRate(db, `extension-ip:${ipHash}`, "extension", 10, 60 * 60_000, 2 * 60 * 60_000);
  const phone = normalizePhone(text(input, "phone", 32));
  const user = await first<{ id: string; name: string; cohortId: string; cohortName: string; startAt: number }>(db,
    'SELECT u."id",u."이름" AS "name",u."cohortId",c."name" AS "cohortName",c."교육시작일" AS "startAt" FROM "users" u INNER JOIN "cohorts" c ON c."id"=u."cohortId" WHERE (u."연락처"=? OR u."연락처"=?) LIMIT 1',
    [phone.digits, phone.formatted],
  );
  if (!user) {
    await writeEvent(db, input, "extension_request", "denied");
    throw new DataServiceError(404, "등록된 교육생 정보를 찾을 수 없습니다");
  }
  const existing = await first<{ id: string; status: string; approvedUntil: number | null; requestedAt: number }>(db,
    'SELECT "id","status","approvedUntil","requestedAt" FROM "education_extension_requests" WHERE "userId"=? ORDER BY "requestedAt" DESC LIMIT 1', [user.id]);
  if (existing?.status === "pending") return { ...user, ...existing, currentEndAt: await effectiveAccess(db, user.id, Number(user.startAt)) };
  const now = Date.now();
  const currentEndAt = await effectiveAccess(db, user.id, Number(user.startAt));
  const id = randomUUID();
  await db.prepare('INSERT INTO "education_extension_requests" ("id","userId","currentEndAt","status","requestIp","requestedAt","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, user.id, currentEndAt, "pending", optionalText(input, "ipAddress", 128), now, now, now).all();
  await writeEvent(db, input, "extension_request", "pending", user.id, user.cohortId);
  return { ...user, id, status: "pending", currentEndAt, requestedAt: now };
}

async function securityHit(db: Database, input: Input) {
  const ipHash = text(input, "ipHash", 128);
  const now = Date.now();
  const until = now + 24 * 60 * 60_000;
  await db.prepare('INSERT INTO "education_ip_blocks" ("ipHash","ipAddress","reason","hitCount","blockedUntil","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?) ON CONFLICT("ipHash") DO UPDATE SET "hitCount"="education_ip_blocks"."hitCount"+1,"reason"=excluded."reason","blockedUntil"=MAX("education_ip_blocks"."blockedUntil",excluded."blockedUntil"),"updatedAt"=excluded."updatedAt"')
    .bind(ipHash, optionalText(input, "ipAddress", 128), optionalText(input, "reason", 256) ?? "automated-access", 1, until, now, now).all();
  await writeEvent(db, input, "blocked", "blocked");
  return { blockedUntil: until };
}

function pageParams(input: Input, scope: string) {
  const size = parsePageSize(input.pageSize);
  const secret = text(input, "cursorSecret", 256);
  const cursor = typeof input.cursor === "string" && input.cursor ? verifyCursor(secret, input.cursor, scope, ["createdAt", "id"]) : null;
  const createdAt = cursor ? Number(cursor.sort[0].value) : null;
  const id = cursor?.sort[1].value ?? null;
  if (cursor && (!Number.isSafeInteger(createdAt) || !id)) throw new DataServiceError(400, "Invalid cursor");
  return { size, secret, createdAt, id };
}

async function adminSummary(db: Database, input: Input) {
  await assertAdmin(db, text(input, "adminId", 128));
  const cached = aggregateCache.get("summary");
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const since = Date.now() - 24 * 60 * 60_000;
  const [today, successful, pending, blocked] = await Promise.all([
    first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "education_access_events" WHERE "createdAt">=?', [since]),
    first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "education_access_events" WHERE "eventType"=? AND "outcome"=? AND "createdAt">=?', ["login", "success", since]),
    first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "education_extension_requests" WHERE "status"=?', ["pending"]),
    first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "education_ip_blocks" WHERE "blockedUntil">?', [Date.now()]),
  ]);
  const value = { eventsToday: Number(today?.count ?? 0), successfulLogins: Number(successful?.count ?? 0), pendingExtensions: Number(pending?.count ?? 0), activeBlocks: Number(blocked?.count ?? 0) };
  aggregateCache.set("summary", { expiresAt: Date.now() + 15_000, value });
  return value;
}

async function adminEvents(db: Database, input: Input) {
  await assertAdmin(db, text(input, "adminId", 128));
  const p = pageParams(input, "education-events");
  const where = p.createdAt === null ? "" : 'WHERE (e."createdAt" < ? OR (e."createdAt" = ? AND e."id" < ?))';
  const values: SqlValue[] = p.createdAt === null ? [] : [p.createdAt, p.createdAt, p.id!];
  const rows = await all(db, `SELECT e."id",e."eventType",e."outcome",e."ipAddress",e."userAgent",e."country",e."city",e."path",e."createdAt",u."이름" AS "userName",u."연락처" AS "phone",c."name" AS "cohortName" FROM "education_access_events" e LEFT JOIN "users" u ON u."id"=e."userId" LEFT JOIN "cohorts" c ON c."id"=e."cohortId" ${where} ORDER BY e."createdAt" DESC,e."id" DESC LIMIT ?`, [...values, p.size + 1]);
  const items = rows.slice(0, p.size);
  const last = items[items.length - 1];
  return { items, ...(rows.length > p.size && last ? { nextCursor: signCursor(p.secret, { version: 1, scope: "education-events", sort: [{ field: "createdAt", value: String(last.createdAt) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

async function adminExtensions(db: Database, input: Input) {
  await assertAdmin(db, text(input, "adminId", 128));
  const p = pageParams(input, "education-extensions");
  const where = p.createdAt === null ? "" : 'WHERE (r."requestedAt" < ? OR (r."requestedAt" = ? AND r."id" < ?))';
  const values: SqlValue[] = p.createdAt === null ? [] : [p.createdAt, p.createdAt, p.id!];
  const rows = await all(db, `SELECT r."id",r."status",r."currentEndAt",r."approvedUntil",r."requestedAt",r."reviewedAt",r."adminNote",u."이름" AS "userName",u."연락처" AS "phone",c."name" AS "cohortName" FROM "education_extension_requests" r INNER JOIN "users" u ON u."id"=r."userId" INNER JOIN "cohorts" c ON c."id"=u."cohortId" ${where} ORDER BY r."requestedAt" DESC,r."id" DESC LIMIT ?`, [...values, p.size + 1]);
  const items = rows.slice(0, p.size);
  const last = items[items.length - 1];
  return { items, ...(rows.length > p.size && last ? { nextCursor: signCursor(p.secret, { version: 1, scope: "education-extensions", sort: [{ field: "createdAt", value: String(last.requestedAt) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

async function adminBlocks(db: Database, input: Input) {
  await assertAdmin(db, text(input, "adminId", 128));
  return { items: await all(db, 'SELECT "ipHash","ipAddress","reason","hitCount","blockedUntil","updatedAt" FROM "education_ip_blocks" WHERE "blockedUntil">? ORDER BY "blockedUntil" DESC LIMIT 50', [Date.now()]) };
}

async function extensionReview(db: Database, input: Input) {
  const adminId = text(input, "adminId", 128);
  await assertAdmin(db, adminId);
  const id = text(input, "requestId", 128);
  const action = text(input, "action", 16);
  if (!new Set(["approve", "reject"]).has(action)) throw new DataServiceError(400, "Invalid action");
  const row = await first<{ id: string; status: string; currentEndAt: number }>(db, 'SELECT "id","status","currentEndAt" FROM "education_extension_requests" WHERE "id"=? LIMIT 1', [id]);
  if (!row) throw new DataServiceError(404, "Request not found");
  if (row.status !== "pending") throw new DataServiceError(409, "Request already reviewed");
  const now = Date.now();
  const approvedUntil = action === "approve" ? integer(input, "approvedUntil") : null;
  if (approvedUntil !== null && approvedUntil <= Number(row.currentEndAt)) throw new DataServiceError(400, "Extension must be later than current access end");
  await db.prepare('UPDATE "education_extension_requests" SET "status"=?,"approvedUntil"=?,"reviewedBy"=?,"reviewedAt"=?,"adminNote"=?,"updatedAt"=? WHERE "id"=? AND "status"=?')
    .bind(action === "approve" ? "approved" : "rejected", approvedUntil, adminId, now, optionalText(input, "adminNote", 2000), now, id, "pending").all();
  aggregateCache.delete("summary");
  return { ok: true };
}

async function unblock(db: Database, input: Input) {
  await assertAdmin(db, text(input, "adminId", 128));
  await db.prepare('DELETE FROM "education_ip_blocks" WHERE "ipHash"=?').bind(text(input, "ipHash", 128)).all();
  aggregateCache.delete("summary");
  return { ok: true };
}

export async function educationOperation(db: Database, operation: string, input: Input) {
  switch (operation) {
    case "student-login": return studentLogin(db, input);
    case "extension-request": return extensionRequest(db, input);
    case "security-hit": return securityHit(db, input);
    case "admin-login-event": {
      const ipHash = text(input, "ipHash", 128);
      await checkBlocked(db, ipHash);
      await consumeRate(db, `admin-login:${ipHash}`, "admin-login", 5, 15 * 60_000, 2 * 60 * 60_000);
      await writeEvent(db, input, "admin_login", text(input, "outcome", 32));
      return { ok: true };
    }
    case "document-access": {
      await checkBlocked(db, text(input, "ipHash", 128));
      await consumeRate(db, `document:${text(input, "ipHash", 128)}`, "document", 120, 10 * 60_000, 60 * 60_000);
      await writeEvent(db, input, "page_view", "success", optionalText(input, "userId", 128), optionalText(input, "cohortId", 128));
      return { ok: true };
    }
    case "admin-summary": return adminSummary(db, input);
    case "admin-events": return adminEvents(db, input);
    case "admin-extensions": return adminExtensions(db, input);
    case "admin-blocks": return adminBlocks(db, input);
    case "extension-review": return extensionReview(db, input);
    case "ip-unblock": return unblock(db, input);
    default: throw new DataServiceError(404, "Unknown education operation");
  }
}

export async function pruneEducationSecurity(db: Database): Promise<void> {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const key = `maintenance:education-prune:${day}`;
  const already = await first(db, 'SELECT "keyHash" FROM "education_rate_windows" WHERE "keyHash"=? LIMIT 1', [key]);
  if (already) return;
  await db.batch([
    db.prepare('INSERT INTO "education_rate_windows" ("keyHash","action","windowStartedAt","count","updatedAt") VALUES (?,?,?,?,?)').bind(key, "maintenance", now, 1, now),
    db.prepare('DELETE FROM "education_rate_windows" WHERE "updatedAt"<?').bind(now - 48 * 60 * 60_000),
    db.prepare('DELETE FROM "education_ip_blocks" WHERE "blockedUntil"<?').bind(now - 24 * 60 * 60_000),
    db.prepare('DELETE FROM "education_access_events" WHERE "createdAt"<?').bind(now - 365 * 24 * 60 * 60_000),
  ]);
}
