import { DataServiceError, type Database, type SqlValue } from "../database";
import { createSignup, type SignupInput } from "../commands/signup";
import { confirmDesign, type ConfirmInput } from "../commands/confirm-design";
import { calculateExpectedArrival } from "@/lib/utils/businessDays";
import { calculateDesignDeadline } from "@/lib/utils/dateCalculator";
import { isShippingPolicyCohort } from "@/lib/shipping-policy";
import { buildConfirmSnapshot, validateConfirmPayload, type ShippingSnapshot } from "@/lib/design-confirm";
import { decodeRow } from "../row-codec";
import { dropMaskedSecretFields, encryptSubmissionSecrets } from "@/lib/security/submission-secrets";
import {
  buildCommunicationMessageListQuery,
  pageCommunicationMessages,
  type D1Query,
} from "../queries";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";

export type CoreOperation =
  | "signup"
  | "confirm-design"
  | "submission-get"
  | "submission-update"
  | "submission-save"
  | "request-print"
  | "workflows-list"
  | "workflow-get"
  | "design-thread-get"
  | "design-thread-messages"
  | "design-threads-list"
  | "design-thread-create"
  | "design-thread-message"
  | "design-thread-read"
  | "required-fields"
  | "required-fields-validate"
  | "pending-confirmation"
  | "workflow-order"
  | "workflow-approve"
  | "workflow-feedback"
  | "workflow-save"
  | "workflow-dismiss"
  | "ensure-workflows"
  | "workflow-download"
  | "final-files-list"
  | "final-file-create"
  | "final-file-delete"
  | "user-slack-channel-update";

export type CoreInput = Record<string, unknown>;

const SUBMISSION_FIELDS = new Set([
  "사업자등록증URL", "프로필사진URL", "브랜드명", "brandNameEnglish", "업종", "주소",
  "메타광고관리자값", "네이버검색광고ID", "네이버검색광고PW", "네이버클라우드ID", "네이버클라우드PW",
  "InstagramID", "InstagramPW", "GmailID", "GmailPW", "홈페이지스타일", "홈페이지컬러컨셉",
  "홈페이지제작방식", "아임웹ID", "아임웹PW", "아임웹관리자PW", "도메인주소", "도메인관리사이트",
  "도메인관리ID", "도메인관리PW", "해외결제카드앞면URL", "해외결제카드뒷면URL", "해외결제카드유효기간",
  "해외결제카드CVC", "대표번호", "이메일", "로고URL", "로고선호스타일", "로고선호색상", "로고선호폰트",
  "로고제작요청사항", "명함색상", "명함시안", "계약서시안", "은행명", "계좌번호", "계좌명의자명",
  "대표자생년월일", "대표자신분증URL", "통신서비스이용증명원URL", "신용카드앞면URL", "로고예시디자인URL",
  "로고예시디자인2URL", "인쇄물받을주소", "받는분이름", "수령연락처", "우편번호", "isComplete",
  "completedAt", "시안예정일", "submissionStatus", "progressPercentage", "lastAutoSaveAt", "autoSaveData",
]);

const SHIPPING_FIELDS = ["인쇄물받을주소", "받는분이름", "수령연락처", "우편번호"] as const;
const LOCKED_PRINT_STATUSES = ["발주요청", "발주완료", "제작완료", "발송완료"] as const;

async function assertShippingFieldsUnchanged(
  db: Database,
  userId: string,
  entries: Array<[string, unknown]>,
  current: Record<string, unknown> | null,
): Promise<void> {
  const changedShipping = entries.filter(([key]) => (SHIPPING_FIELDS as readonly string[]).includes(key));
  if (!changedShipping.length) return;
  const locked = await db.prepare(`SELECT \"id\" FROM \"workflows\"
    WHERE \"userId\" = ? AND \"type\" IN ('명함', '명찰', '대봉투', '자문계약서 표지', '자문계약서 내지')
      AND \"status\" IN (${LOCKED_PRINT_STATUSES.map(() => "?").join(", ")})
    LIMIT 1`).bind(userId, ...LOCKED_PRINT_STATUSES).first();
  if (!locked) return;
  if (changedShipping.some(([key, value]) => value !== (current?.[key] ?? null))) {
    throw new DataServiceError(409, "발주 요청 이후 배송지는 변경할 수 없습니다.");
  }
}

function shippingLockPredicate(entries: Array<[string, unknown]>): { sql: string; values: SqlValue[] } {
  const fields = entries.filter(([key]) => (SHIPPING_FIELDS as readonly string[]).includes(key));
  if (!fields.length) return { sql: "", values: [] };
  return {
    sql: ` AND (NOT EXISTS (SELECT 1 FROM \"workflows\" WHERE \"userId\" = ? AND \"type\" IN ('명함', '명찰', '대봉투', '자문계약서 표지', '자문계약서 내지') AND \"status\" IN (${LOCKED_PRINT_STATUSES.map(() => "?").join(", ")})) OR (${fields.map(([key]) => `\"${key}\" IS ?`).join(" AND ")}))`,
    values: ["__LOCK_USER__", ...LOCKED_PRINT_STATUSES, ...fields.map(([, value]) => sqlValue(value))],
  };
}

function stringValue(input: CoreInput, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new DataServiceError(400, `${key} is required`);
  }
  return value;
}

function userId(input: CoreInput): string { return stringValue(input, "userId"); }

function sqlValue(value: unknown): SqlValue {
  if (value === null || typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return JSON.stringify(value);
}

async function submission(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const row = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(id).first();
  if (row) return decodeRow("submissions", row);
  const user = await db.prepare('SELECT "id" FROM "users" WHERE "id" = ? LIMIT 1').bind(id).first();
  if (!user) throw new DataServiceError(404, "User not found");
  const now = Date.now();
  await db.batch([db.prepare('INSERT OR IGNORE INTO "submissions" ("id", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), id, now, now)]);
  const created = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(id).first();
  return created ? decodeRow("submissions", created) : null;
}

async function submissionGet(db: Database, input: CoreInput): Promise<unknown> {
  const result = await submission(db, input) as Record<string, unknown> | null;
  const cohort = await db.prepare('SELECT c."교육시작일" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" WHERE u."id" = ? LIMIT 1').bind(userId(input)).first<{ 교육시작일: number | string | null }>();
  return {
    ...(result ?? {}),
    _배송지필수: isShippingPolicyCohort(cohort?.교육시작일 ? new Date(cohort.교육시작일) : null),
  };
}

async function updateSubmission(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const values = input.data;
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new DataServiceError(400, "Invalid submission data");
  const entries = Object.entries(values).filter(([key]) => SUBMISSION_FIELDS.has(key));
  if (entries.length === 0) return submission(db, input);
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const current = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(id).first<Record<string, unknown>>();
  await assertShippingFieldsUnchanged(db, id, entries, current);
  const shippingGuard = shippingLockPredicate(entries);
  if (shippingGuard.values.length) shippingGuard.values[0] = id;
  const assignments = entries.map(([key]) => `"${key.replaceAll('"', '""')}" = ?`);
  const params: SqlValue[] = entries.map(([, value]) => sqlValue(value));
  params.push(now, id, ...shippingGuard.values);
  const statements = [
    db.prepare('INSERT OR IGNORE INTO "submissions" ("id", "userId", "createdAt", "updatedAt") SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM "users" WHERE "id" = ?)').bind(crypto.randomUUID(), id, now, now, id),
    db.prepare(`UPDATE "submissions" SET ${assignments.join(", ")}, "updatedAt" = ? WHERE "userId" = ?${shippingGuard.sql}`).bind(...params),
  ];
  const user = await db.prepare('SELECT "id" FROM "users" WHERE "id" = ? LIMIT 1').bind(id).first();
  if (!user) throw new DataServiceError(404, "User not found");
  const result = await db.batch(statements);
  if (!result[0]?.success) throw new DataServiceError(503, "Submission update failed");
  if (shippingGuard.values.length && (result[1]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "발주 요청 이후 배송지는 변경할 수 없습니다.");
  return submission(db, input);
}

async function saveSubmission(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const values = input.data;
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new DataServiceError(400, "Invalid submission data");
  const entries = Object.entries(values).filter(([key]) => SUBMISSION_FIELDS.has(key));
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const current = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(id).first<Record<string, unknown>>();
  const user = await db.prepare('SELECT "id" FROM "users" WHERE "id" = ? LIMIT 1').bind(id).first();
  if (!user) throw new DataServiceError(404, "User not found");
  const merged = { ...(current ?? {}), ...values };
  await assertShippingFieldsUnchanged(db, id, entries, current);
  const shippingGuard = shippingLockPredicate(entries);
  if (shippingGuard.values.length) shippingGuard.values[0] = id;
  if (merged.isComplete === true) {
    const required = ["브랜드명", "업종", "주소", "사업자등록증URL", "프로필사진URL", "명함시안"];
    const missing = required.filter((field) => !merged[field]);
    if (missing.length) throw new DataServiceError(400, `필수 항목을 모두 입력해주세요: ${missing.join(", ")}`);
  }
  const statements: import("../database").Statement[] = [];
  statements.push(db.prepare('INSERT OR IGNORE INTO "submissions" ("id", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), id, now, now));
  if (entries.length) {
    const assignments = entries.map(([key]) => `"${key.replaceAll('"', '""')}" = ?`);
    const params: SqlValue[] = entries.map(([, value]) => sqlValue(value));
    params.push(now, id, ...shippingGuard.values);
    statements.push(db.prepare(`UPDATE "submissions" SET ${assignments.join(", ")}, "updatedAt" = ? WHERE "userId" = ?${shippingGuard.sql}`).bind(...params));
  }
  const logoId = crypto.randomUUID();
  statements.push(db.prepare(`INSERT INTO "workflows" ("id", "userId", "type", "status", "isDraft", "draftSavedAt", "createdAt", "updatedAt")
    SELECT ?, ?, '로고', '대기', 1, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM "workflows" WHERE "userId" = ? AND "type" = '로고')`).bind(logoId, id, now, now, now, id));
  const hasHomepage = Object.prototype.hasOwnProperty.call(values, "홈페이지스타일") || Object.prototype.hasOwnProperty.call(values, "홈페이지컬러컨셉");
  if (hasHomepage) {
    const homepageId = crypto.randomUUID();
    statements.push(db.prepare(`INSERT INTO "workflows" ("id", "userId", "type", "status", "isDraft", "자료제출일", "createdAt", "updatedAt")
      SELECT ?, ?, '홈페이지', '제작 진행 중', 0, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM "workflows" WHERE "userId" = ? AND "type" = '홈페이지')`).bind(homepageId, id, now, now, now, id));
  }
  if (merged.isComplete === true) {
    const deadline = calculateDesignDeadline(new Date(now));
    statements.push(db.prepare('UPDATE "submissions" SET "isComplete" = 1, "completedAt" = COALESCE("completedAt", ?), "시안예정일" = ?, "updatedAt" = ? WHERE "userId" = ?').bind(now, deadline.getTime(), now, id));
    for (const type of ["명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지"]) {
      statements.push(db.prepare(`INSERT INTO "workflows" ("id", "userId", "type", "status", "자료제출일", "createdAt", "updatedAt") VALUES (?, ?, ?, '시안중', ?, ?, ?)
        ON CONFLICT ("userId", "type") DO UPDATE SET "status" = '시안중', "자료제출일" = excluded."자료제출일", "updatedAt" = excluded."updatedAt"`).bind(crypto.randomUUID(), id, type, now, now, now));
    }
  }
  if (statements.length) {
    const result = await db.batch(statements);
    if (shippingGuard.values.length && (result[1]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "발주 요청 이후 배송지는 변경할 수 없습니다.");
  }
  const saved = await submission(db, input) as Record<string, unknown>;
  const person = await db.prepare('SELECT u."email", u."이름", u."englishName", u."연락처", u."slackChannelId", c."name" AS "cohortName", c."englishName" AS "cohortEnglishName" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" WHERE u."id" = ? LIMIT 1').bind(id).first();
  return { ...saved, __d1Meta: { previous: current, user: person } };
}

async function requestPrint(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const printTypes = input.printTypes;
  if (!Array.isArray(printTypes) || printTypes.length === 0 || printTypes.length > 7 || printTypes.some((value) => typeof value !== "string" || value.length > 64)) {
    throw new DataServiceError(400, "Invalid print types");
  }
  const current = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(id).first<Record<string, unknown>>();
  if (!current) throw new DataServiceError(404, "Submission not found");
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const statements = (printTypes as string[]).map((type) => db.prepare(`INSERT INTO "workflows" ("id", "userId", "type", "status", "자료제출일", "createdAt", "updatedAt") VALUES (?, ?, ?, '시안중', ?, ?, ?)
    ON CONFLICT ("userId", "type") DO UPDATE SET "status" = '시안중', "자료제출일" = excluded."자료제출일", "updatedAt" = excluded."updatedAt"`).bind(crypto.randomUUID(), id, type, now, now, now));
  statements.push(db.prepare('UPDATE "submissions" SET "isComplete" = 1, "completedAt" = COALESCE("completedAt", ?), "updatedAt" = ? WHERE "userId" = ?').bind(now, now, id));
  await db.batch(statements);
  const rows = await db.prepare('SELECT "id", "type", "status", "자료제출일" FROM "workflows" WHERE "userId" = ? AND "type" IN (' + printTypes.map(() => '?').join(',') + ') ORDER BY "type"').bind(id, ...printTypes as string[]).all();
  return { workflows: rows.results.map((row) => decodeRow("workflows", row)) };
}

async function listWorkflows(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const size = parsePageSize(input.pageSize);
  const cursor = typeof input.cursor === "string" ? input.cursor : undefined;
  const secret = typeof input.cursorSecret === "string" ? input.cursorSecret : "";
  const params: SqlValue[] = [id];
  let continuation = "";
  if (cursor) {
    const decoded = verifyCursor(secret, cursor, `core-workflows:user:${id}`, ["updatedAt", "id"]);
    const updatedAt = Number(decoded.sort[0]?.value);
    const workflowId = decoded.sort[1]?.value ?? "";
    if (!Number.isSafeInteger(updatedAt)) throw new DataServiceError(400, "Invalid cursor");
    continuation = ' AND ("updatedAt", "id") < (?, ?)';
    params.push(updatedAt, workflowId);
  }
  params.push(size + 1);
  const rows = await db.prepare(`SELECT * FROM "workflows" WHERE "userId" = ?${continuation} ORDER BY "updatedAt" DESC, "id" DESC LIMIT ?`).bind(...params).all();
  if (!rows.success) throw new DataServiceError(503, "Workflow lookup failed");
  const items = rows.results.slice(0, size);
  const last = rows.results.length > size ? items[items.length - 1] as Record<string, unknown> : undefined;
  return {
    items: items.map((row) => decodeRow("workflows", row)),
    ...(last && secret ? { nextCursor: signCursor(secret, { version: 1, scope: `core-workflows:user:${id}`, sort: [{ field: "updatedAt", value: String(last.updatedAt) }, { field: "id", value: String(last.id) }] }) } : {}),
  };
}

async function getWorkflow(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const workflowId = stringValue(input, "workflowId");
  const row = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? AND "userId" = ? LIMIT 1').bind(workflowId, id).first();
  if (!row) throw new DataServiceError(404, "Workflow not found");
  return decodeRow("workflows", row);
}

async function getThread(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const threadId = stringValue(input, "threadId");
  const row = await db.prepare(`SELECT t.*, w."id" AS "workflowId", w."userId", w."type" AS "workflowType", w."status" AS "workflowStatus", u."id" AS "userId", u."이름" AS "userName", u."email" AS "userEmail", u."연락처" AS "userPhone", s."브랜드명" AS "brandName", c."name" AS "cohortName"
    FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId" INNER JOIN "users" u ON u."id" = w."userId" LEFT JOIN "submissions" s ON s."userId" = u."id" LEFT JOIN "cohorts" c ON c."id" = u."cohortId"
    WHERE t."id" = ? AND w."userId" = ? LIMIT 1`).bind(threadId, id).first();
  if (!row) throw new DataServiceError(404, "Thread not found");
  const pageSize = parsePageSize(input.pageSize);
  const secret = typeof input.cursorSecret === "string" ? input.cursorSecret : "";
  const scope = `core-design-thread-messages:${threadId}`;
  const params: SqlValue[] = [threadId];
  let continuation = "";
  if (typeof input.cursor === "string" && input.cursor) {
    const decoded = verifyCursor(secret, input.cursor, scope, ["createdAt", "id"]);
    continuation = ' AND ("createdAt", "id") < (?, ?)';
    params.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? ""));
  }
  params.push(pageSize + 1);
  const messages = await db.prepare(`SELECT * FROM "design_thread_messages" WHERE "threadId" = ?${continuation} ORDER BY "createdAt" DESC, "id" DESC LIMIT ?`).bind(...params).all<Record<string, unknown>>();
  if (!messages.success) throw new DataServiceError(503, "Messages lookup failed");
  const items = messages.results.slice(0, pageSize);
  const last = messages.results.length > pageSize ? items[items.length - 1] : undefined;
  const unreadIds = items.filter((message) => message.authorType === "admin" && Number(message.isReadByUser) === 0).map((message) => String(message.id));
  if (unreadIds.length > 0) {
    await db.batch([db.prepare(`UPDATE "design_thread_messages" SET "isReadByUser" = 1 WHERE "id" IN (${unreadIds.map(() => "?").join(",")})`).bind(...unreadIds)]);
  }
  return {
    id: row.id,
    status: row.status,
    currentVersion: row.currentVersion,
    confirmedAt: row.confirmedAt ? new Date(Number(row.confirmedAt)) : null,
    confirmedByName: row.confirmedByName,
    workflow: {
      id: row.workflowId,
      type: row.workflowType,
      status: row.workflowStatus,
      user: {
        id: row.userId,
        이름: row.userName,
        email: row.userEmail,
        연락처: row.userPhone,
        submission: row.brandName !== null && row.brandName !== undefined ? { 브랜드명: row.brandName } : null,
        cohort: row.cohortName ? { name: row.cohortName } : null,
      },
    },
    messages: [...items].reverse().map((message) => decodeRow("design_thread_messages", message)),
    messagesNextCursor: last && secret ? signCursor(secret, { version: 1, scope, sort: [{ field: "createdAt", value: String(last.createdAt) }, { field: "id", value: String(last.id) }] }) : undefined,
  };
}

async function listThreadMessages(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const threadId = stringValue(input, "threadId");
  const thread = await getThread(db, { userId: id, threadId });
  if (!thread) throw new DataServiceError(404, "Thread not found");
  const secret = stringValue(input, "cursorSecret");
  const query: D1Query = buildCommunicationMessageListQuery({
    threadId,
    pageSize: input.pageSize,
    cursor: typeof input.cursor === "string" ? input.cursor : undefined,
    cursorSecret: secret,
  });
  const result = await db.prepare(query.sql).bind(...query.params).all<{ id: string; createdAt: number }>();
  if (!result.success) throw new DataServiceError(503, "Messages lookup failed");
  return pageCommunicationMessages(result.results, input.pageSize, secret, threadId);
}

async function createThread(db: Database, input: CoreInput): Promise<unknown> {
  const workflowId = stringValue(input, "workflowId");
  const workflow = await db.prepare('SELECT "id", "userId" FROM "workflows" WHERE "id" = ? LIMIT 1').bind(workflowId).first<{ id: string; userId: string }>();
  if (!workflow) throw new DataServiceError(404, "Workflow not found");
  const existing = await db.prepare('SELECT * FROM "design_threads" WHERE "workflowId" = ? LIMIT 1').bind(workflowId).first();
  if (existing) return existing;
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "createdAt", "updatedAt") VALUES (?, ?, \'pending\', 0, ?, ?)').bind(id, workflowId, now, now)]);
  return db.prepare('SELECT * FROM "design_threads" WHERE "id" = ? LIMIT 1').bind(id).first();
}

async function addThreadMessage(db: Database, input: CoreInput): Promise<unknown> {
  const threadId = stringValue(input, "threadId");
  const actorId = userId(input);
  const actorType = input.actorType === "admin" ? "admin" : "user";
  const messageType = stringValue(input, "messageType");
  if (!["design_upload", "message", "revision_request"].includes(messageType)) throw new DataServiceError(400, "Invalid message type");
  const thread = await db.prepare(`SELECT t.*, w."userId", w."status" AS "workflowStatus" FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId" WHERE t."id" = ? LIMIT 1`).bind(threadId).first<{ id: string; workflowId: string; currentVersion: number; userId: string; workflowStatus: string }>();
  if (!thread) throw new DataServiceError(404, "Thread not found");
  if (actorType !== "admin" && thread.userId !== actorId) throw new DataServiceError(403, "Forbidden");
  if (actorType === "admin" && messageType === "revision_request") throw new DataServiceError(400, "Invalid message type for admin");
  if (actorType !== "admin" && messageType === "design_upload") throw new DataServiceError(400, "Invalid message type for user");
  const content = typeof input.content === "string" ? input.content.slice(0, 20_000) : "";
  const authorName = typeof input.authorName === "string" && input.authorName.length <= 128 ? input.authorName : actorType === "admin" ? "관리자" : "사용자";
  const designUrl = typeof input.designUrl === "string" ? input.designUrl : null;
  const version = messageType === "design_upload" ? (typeof input.designVersion === "number" ? input.designVersion : thread.currentVersion + 1) : null;
  const now = Date.now();
  const messageId = crypto.randomUUID();
  const statements = [db.prepare(`INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "designVersion", "designUrl", "isReadByAdmin", "isReadByUser", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(messageId, threadId, actorId, actorType, authorName, messageType, content, JSON.stringify(Array.isArray(input.attachments) ? input.attachments : []), version, designUrl, actorType === "admin" ? 1 : 0, actorType === "admin" ? 0 : 1, now), db.prepare(`UPDATE "design_threads" SET "status" = ?, "currentVersion" = COALESCE(?, "currentVersion"), "updatedAt" = ? WHERE "id" = ?`).bind(messageType === "design_upload" ? "feedback_waiting" : messageType === "revision_request" ? "revision_requested" : "pending", version, now, threadId)];
  if (messageType === "design_upload" && designUrl && version !== null) {
    statements.push(db.prepare('UPDATE "workflows" SET "시안URL" = ?, "시안업로드일" = ?, "수정횟수" = ?, "updatedAt" = ? WHERE "id" = ?').bind(designUrl, now, version - 1, now, thread.workflowId));
    statements.push(db.prepare('INSERT INTO "design_history" ("id", "workflowId", "version", "fileUrl", "uploadedBy", "uploadedByName", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), thread.workflowId, version, designUrl, actorId, authorName, now));
  }
  await db.batch(statements);
  const message = await db.prepare('SELECT * FROM "design_thread_messages" WHERE "id" = ? LIMIT 1').bind(messageId).first();
  const updatedThread = await db.prepare('SELECT * FROM "design_threads" WHERE "id" = ? LIMIT 1').bind(threadId).first();
  return { message: message ? decodeRow("design_thread_messages", message) : null, thread: updatedThread ? decodeRow("design_threads", updatedThread) : null };
}

async function markThreadRead(db: Database, input: CoreInput): Promise<unknown> {
  const threadId = stringValue(input, "threadId");
  const actorId = userId(input);
  const actorType = input.actorType === "admin" ? "admin" : "user";
  const thread = await db.prepare('SELECT t."id", w."userId" FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId" WHERE t."id" = ? LIMIT 1').bind(threadId).first<{ id: string; userId: string }>();
  if (!thread) throw new DataServiceError(404, "Thread not found");
  if (actorType !== "admin" && thread.userId !== actorId) throw new DataServiceError(403, "Forbidden");
  const field = actorType === "admin" ? "isReadByAdmin" : "isReadByUser";
  const authorType = actorType === "admin" ? "user" : "admin";
  const result = await db.batch([db.prepare(`UPDATE "design_thread_messages" SET "${field}" = 1 WHERE "threadId" = ? AND "authorType" = ? AND "${field}" = 0`).bind(threadId, authorType)]);
  return { updatedCount: result[0]?.meta.changes ?? 0 };
}

async function listThreads(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const pageSize = parsePageSize(input.pageSize);
  const secret = typeof input.cursorSecret === "string" ? input.cursorSecret : "";
  const scope = `core-design-threads:user:${id}:${String(input.status ?? "all")}:${String(input.workflowType ?? "all")}`;
  const params: SqlValue[] = [id];
  const clauses = ['dc."userId" = ?'];
  if (typeof input.status === "string" && input.status !== "all") { clauses.push('dc."status" = ?'); params.push(input.status); }
  if (typeof input.workflowType === "string" && input.workflowType !== "all") { clauses.push('dc."workflowType" = ?'); params.push(input.workflowType); }
  if (typeof input.cursor === "string" && input.cursor) {
    const decoded = verifyCursor(secret, input.cursor, scope, ["updatedAt", "id"]);
    clauses.push('(dc."updatedAt", dc."threadId") < (?, ?)');
    params.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? ""));
  }
  params.push(pageSize + 1);
  const result = await db.prepare(`WITH candidate AS MATERIALIZED (SELECT "threadId", "updatedAt", "unreadByUser" FROM "design_thread_counters" dc WHERE ${clauses.join(' AND ')} ORDER BY dc."updatedAt" DESC, dc."threadId" DESC LIMIT ?) SELECT t.*, candidate."updatedAt" AS "projectionUpdatedAt", w."id" AS "workflowId", w."type" AS "workflowType", w."status" AS "workflowStatus", u."id" AS "userId", u."이름" AS "userName", u."email" AS "userEmail", c."name" AS "cohortName", lm."id" AS "lastMessageId", lm."authorType" AS "lastMessageAuthorType", lm."authorId" AS "lastMessageAuthorId", lm."authorName" AS "lastMessageAuthorName", lm."messageType" AS "lastMessageType", lm."content" AS "lastMessageContent", lm."attachments" AS "lastMessageAttachments", lm."designVersion" AS "lastMessageDesignVersion", lm."designUrl" AS "lastMessageDesignUrl", lm."isReadByAdmin" AS "lastMessageIsReadByAdmin", lm."isReadByUser" AS "lastMessageIsReadByUser", lm."createdAt" AS "lastMessageCreatedAt", candidate."unreadByUser" AS "unreadByUser"
    FROM candidate INNER JOIN "design_threads" t ON t."id" = candidate."threadId" INNER JOIN "workflows" w ON w."id" = t."workflowId" INNER JOIN "users" u ON u."id" = w."userId" LEFT JOIN "cohorts" c ON c."id" = u."cohortId" LEFT JOIN "design_thread_messages" lm ON lm."id" = (SELECT m."id" FROM "design_thread_messages" m WHERE m."threadId" = t."id" ORDER BY m."createdAt" DESC, m."id" DESC LIMIT 1) ORDER BY candidate."updatedAt" DESC, candidate."threadId" DESC`).bind(...params).all();
  if (!result.success) throw new DataServiceError(503, "Thread lookup failed");
  const items = result.results.slice(0, pageSize).map((row) => {
    const value = row as Record<string, unknown>;
    const thread = decodeRow("design_threads", value);
    const lastMessage = value.lastMessageId ? decodeRow("design_thread_messages", { id: value.lastMessageId, threadId: value.id, authorId: value.lastMessageAuthorId, authorType: value.lastMessageAuthorType, authorName: value.lastMessageAuthorName, messageType: value.lastMessageType, content: value.lastMessageContent, attachments: value.lastMessageAttachments, designVersion: value.lastMessageDesignVersion, designUrl: value.lastMessageDesignUrl, isReadByAdmin: value.lastMessageIsReadByAdmin, isReadByUser: value.lastMessageIsReadByUser, createdAt: value.lastMessageCreatedAt }) : null;
    return { id: thread.id, status: thread.status, currentVersion: thread.currentVersion, confirmedAt: thread.confirmedAt, confirmedByName: thread.confirmedByName, workflow: { id: value.workflowId, type: value.workflowType, status: value.workflowStatus, user: { id: value.userId, 이름: value.userName, email: value.userEmail, cohort: value.cohortName ? { name: value.cohortName } : null } }, lastMessage, unreadCount: Number(value.unreadByUser ?? 0), createdAt: thread.createdAt, updatedAt: thread.updatedAt };
  });
  const last = result.results.length > pageSize ? result.results[pageSize - 1] as Record<string, unknown> : undefined;
  return { threads: items, ...(last && secret ? { nextCursor: signCursor(secret, { version: 1, scope, sort: [{ field: "updatedAt", value: String(last.projectionUpdatedAt ?? last.updatedAt) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

async function requiredFields(db: Database, input: CoreInput): Promise<unknown> {
  const workflowType = stringValue(input, "workflowType");
  const rows = await db.prepare(`SELECT "id", "fieldName", "fieldLabel", "fieldReason", "validationType", "minLength", "maxLength"
    FROM "required_field_configs" WHERE "workflowType" = ? AND "isActive" = 1 ORDER BY "fieldOrder" ASC`).bind(workflowType).all();
  if (!rows.success) throw new DataServiceError(503, "Required fields lookup failed");
  return { success: true, workflowType, requiredFields: rows.results.map((row) => decodeRow("required_field_configs", row)), count: rows.results.length };
}

async function validateRequiredFields(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const workflowId = stringValue(input, "workflowId");
  const workflow = await db.prepare('SELECT "id", "type" FROM "workflows" WHERE "id" = ? AND "userId" = ? LIMIT 1').bind(workflowId, id).first<{ id: string; type: string }>();
  if (!workflow) throw new DataServiceError(404, "Workflow not found");
  const submissionRow = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(id).first<Record<string, unknown>>();
  if (!submissionRow) throw new DataServiceError(404, "Submission not found");
  const configs = await db.prepare('SELECT "fieldName", "fieldLabel", "fieldReason", "validationType", "minLength", "maxLength" FROM "required_field_configs" WHERE "workflowType" = ? AND "isActive" = 1 ORDER BY "fieldOrder" ASC').bind(workflow.type).all<Record<string, unknown>>();
  const missingFields = configs.results.filter((field) => {
    const value = submissionRow[String(field.fieldName)];
    if (field.validationType === "notEmpty" && (!value || (typeof value === "string" && value.trim() === ""))) return true;
    if (typeof field.minLength === "number" && typeof value === "string" && value.length < field.minLength) return true;
    return typeof field.maxLength === "number" && typeof value === "string" && value.length > field.maxLength;
  });
  return { valid: missingFields.length === 0, missingFields };
}

async function pendingConfirmation(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const rows = await db.prepare(`SELECT w."id", w."type", w."시안URL", w."updatedAt"
    FROM "workflows" w LEFT JOIN "modal_dismissals" d ON d."workflowId" = w."id" AND d."userId" = w."userId" AND d."expiresAt" > ?
    WHERE w."userId" = ? AND w."type" <> '홈페이지' AND w."status" IN ('시안컨펌요청', '발주대기') AND w."시안URL" IS NOT NULL AND d."workflowId" IS NULL
    ORDER BY w."updatedAt" ASC LIMIT 51`).bind(now, id).all();
  if (!rows.success) throw new DataServiceError(503, "Pending confirmation lookup failed");
  return { success: true, workflows: rows.results.slice(0, 50).map((row) => decodeRow("workflows", row)), count: Math.min(rows.results.length, 50), ...(rows.results.length > 50 ? { nextCursor: String((rows.results[49] as Record<string, unknown>).id) } : {}) };
}

async function ownedWorkflow(db: Database, input: CoreInput): Promise<Record<string, unknown>> {
  const workflowId = stringValue(input, "workflowId");
  const row = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? AND "userId" = ? LIMIT 1').bind(workflowId, userId(input)).first<Record<string, unknown>>();
  if (!row) throw new DataServiceError(404, "Workflow not found");
  return decodeRow("workflows", row);
}

async function workflowPerson(db: Database, workflow: Record<string, unknown>) {
  return db.prepare('SELECT u."이름", u."englishName", u."slackChannelId", c."name" AS "cohortName", c."englishName" AS "cohortEnglishName", s."브랜드명", s."brandNameEnglish" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" LEFT JOIN "submissions" s ON s."userId" = u."id" WHERE u."id" = ? LIMIT 1').bind(String(workflow.userId)).first<Record<string, unknown>>();
}

async function workflowOrder(db: Database, input: CoreInput): Promise<unknown> {
  const workflow = await ownedWorkflow(db, input);
  if (workflow.status !== "발주대기") throw new DataServiceError(400, "발주 대기 상태가 아닙니다");
  const agreements = Array.isArray(input.agreements) ? input.agreements.filter((value): value is string => typeof value === "string") : [];
  const requiresColor = ["명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지"].includes(String(workflow.type));
  if (!requiresColor) throw new DataServiceError(400, "인쇄물만 발주 요청할 수 있습니다.");
  const cohort = await db.prepare('SELECT c."교육시작일" FROM "users" u INNER JOIN "cohorts" c ON c."id" = u."cohortId" WHERE u."id" = ? LIMIT 1').bind(userId(input)).first<{ 교육시작일: number | string | null }>();
  const shipping = input.shipping && typeof input.shipping === "object" ? input.shipping as ShippingSnapshot : null;
  const shippingRequired = isShippingPolicyCohort(cohort?.교육시작일 ? new Date(cohort.교육시작일) : null);
  const validationError = validateConfirmPayload({
    workflowType: String(workflow.type),
    shipping,
    agreements,
    shippingRequired,
  });
  if (validationError) throw new DataServiceError(400, validationError);
  const snapshot = buildConfirmSnapshot({
    workflowType: String(workflow.type),
    shipping,
    agreements,
    shippingRequired,
  });
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const expected = typeof input.expectedArrival === "string" ? input.expectedArrival : calculateExpectedArrival(new Date(now), String(workflow.type)) || null;
  const mutation = await db.batch([db.prepare('UPDATE "workflows" SET "status" = \'발주요청\', "발주요청일" = ?, "예상도착일" = ?, "확정배송지" = ?, "확정수령인" = ?, "확정수령연락처" = ?, "확정동의항목" = ?, "확정일시" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = \'발주대기\'').bind(now, expected, snapshot.확정배송지, snapshot.확정수령인, snapshot.확정수령연락처, JSON.stringify(snapshot.확정동의항목), now, now, workflow.id as string)]);
  if ((mutation[0]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "이미 변경된 발주 상태입니다. 새로고침해주세요.");
  const pendingOrder = await db.prepare('SELECT "id" FROM "workflows" WHERE "userId" = ? AND "status" NOT IN (?, ?, ?, ?) LIMIT 1').bind(userId(input), "발주요청", "발주완료", "제작완료", "발송완료").first();
  const updated = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? LIMIT 1').bind(workflow.id as string).first();
  const person = await workflowPerson(db, workflow);
  return updated ? { ...decodeRow("workflows", updated), __d1Meta: { user: person, allOrdersRequested: !pendingOrder } } : null;
}

async function workflowApprove(db: Database, input: CoreInput): Promise<unknown> {
  const workflow = await ownedWorkflow(db, input);
  if (workflow.type === "홈페이지") throw new DataServiceError(400, "홈페이지는 이 경로에서 확정할 수 없습니다.");
  const confirmable = ["로고", "명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지"];
  if (!confirmable.includes(String(workflow.type)) || workflow.status !== "시안컨펌요청") throw new DataServiceError(400, "시안컨펌요청 상태에서만 확정할 수 있습니다.");
  const actorId = userId(input);
  const cohort = await db.prepare('SELECT c."교육시작일" FROM "users" u INNER JOIN "cohorts" c ON c."id" = u."cohortId" WHERE u."id" = ? LIMIT 1').bind(actorId).first<{ 교육시작일: number | string | null }>();
  const body = { workflowType: workflow.type, shipping: input.shipping ?? null, agreements: Array.isArray(input.agreements) ? input.agreements : [], shippingRequired: isShippingPolicyCohort(cohort?.교육시작일 ? new Date(cohort.교육시작일) : null) };
  const validationError = validateConfirmPayload(body as Parameters<typeof validateConfirmPayload>[0]);
  if (validationError) throw new DataServiceError(400, validationError);
  const snapshot = buildConfirmSnapshot(body as Parameters<typeof buildConfirmSnapshot>[0]);
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const logId = crypto.randomUUID();
  const mutation = await db.batch([
    db.prepare(`UPDATE "workflows" SET "status" = '최종확정', "확정배송지" = ?, "확정수령인" = ?, "확정수령연락처" = ?, "확정동의항목" = ?, "확정일시" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = '시안컨펌요청'`).bind(snapshot.확정배송지 ?? null, snapshot.확정수령인 ?? null, snapshot.확정수령연락처 ?? null, JSON.stringify(snapshot.확정동의항목), now, now, workflow.id as string),
    db.prepare(`INSERT INTO "workflow_logs" ("id", "workflowId", "action", "performedBy", "performedByName", "previousStatus", "newStatus", "createdAt") SELECT ?, "id", ?, ?, ?, ?, ?, ? FROM "workflows" WHERE "id" = ? AND "status" = '최종확정' AND "확정일시" = ? AND "updatedAt" = ?`).bind(logId, `${workflow.type} 확정`, actorId, typeof input.performedByName === "string" ? input.performedByName : "사용자", workflow.status, "최종확정", now, workflow.id as string, now, now),
  ]);
  if ((mutation[0]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "이미 확정된 시안입니다. 새로고침해주세요.");
  const updated = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? LIMIT 1').bind(workflow.id as string).first();
  const person = await workflowPerson(db, workflow);
  return updated ? { ...decodeRow("workflows", updated), __d1Meta: { user: person } } : null;
}

async function workflowFeedback(db: Database, input: CoreInput): Promise<unknown> {
  const workflow = await ownedWorkflow(db, input);
  const feedback = typeof input.feedback === "string" ? input.feedback.trim().slice(0, 20_000) : "";
  if (!feedback) throw new DataServiceError(400, "피드백 내용을 입력해주세요");
  const current = Number(workflow.수정횟수 ?? 0);
  if (current >= 2) throw new DataServiceError(403, "시안 수정은 2회까지만 가능합니다.");
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const userPerson = await db.prepare('SELECT "이름" FROM "users" WHERE "id" = ? LIMIT 1').bind(userId(input)).first<{ 이름: string }>();
  const title = `[시안 피드백] ${String(workflow.type)}`;
  const thread = await db.prepare(`SELECT "id" FROM "communication_threads" WHERE "userId" = ? AND "title" = ? AND "status" IN ('open', 'in_progress') ORDER BY "updatedAt" DESC LIMIT 1`).bind(userId(input), title).first<{ id: string }>();
  const threadId = thread?.id ?? crypto.randomUUID();
  const winner = 'EXISTS (SELECT 1 FROM "workflows" WHERE "id" = ? AND "수정횟수" = ? AND "feedbackDate" = ? AND "updatedAt" = ?)';
  const statements: import("../database").Statement[] = [db.prepare('UPDATE "workflows" SET "feedback" = ?, "feedbackDate" = ?, "수정횟수" = ?, "updatedAt" = ? WHERE "id" = ? AND "userId" = ? AND "수정횟수" = ?').bind(feedback, now, current + 1, now, workflow.id as string, userId(input), current)];
  if (thread) statements.push(db.prepare(`UPDATE "communication_threads" SET "lastReplyAt" = ?, "updatedAt" = ? WHERE "id" = ? AND ${winner}`).bind(now, now, threadId, workflow.id as string, current + 1, now, now));
  else statements.push(db.prepare(`INSERT INTO "communication_threads" ("id", "userId", "title", "category", "status", "lastReplyAt", "createdAt", "updatedAt") SELECT ?, ?, ?, ?, 'open', ?, ?, ? WHERE ${winner}`).bind(threadId, userId(input), title, String(workflow.type) === "홈페이지" ? "홈페이지" : "일반", now, now, now, workflow.id as string, current + 1, now, now));
  statements.push(db.prepare(`INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "isReadByUser", "isReadByAdmin", "createdAt") SELECT ?, ?, ?, 'user', ?, ?, '[]', 1, 0, ? WHERE ${winner}`).bind(crypto.randomUUID(), threadId, userId(input), userPerson?.이름 ?? "사용자", thread ? `[추가 피드백]

${feedback}` : `${workflow.type} 시안에 대한 피드백입니다.

${feedback}`, now, workflow.id as string, current + 1, now, now));
  const mutation = await db.batch(statements);
  if ((mutation[0]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "시안 피드백이 변경되었습니다. 새로고침해주세요.");
  const updated = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? LIMIT 1').bind(workflow.id as string).first();
  const person = await workflowPerson(db, workflow);
  return updated ? { ...decodeRow("workflows", updated), __d1Meta: { user: person } } : null;
}

async function workflowSave(db: Database, input: CoreInput): Promise<unknown> {
  const workflow = await ownedWorkflow(db, input);
  const data = input.workflowData && typeof input.workflowData === "object" && !Array.isArray(input.workflowData) ? input.workflowData as Record<string, unknown> : {};
  const isDraft = input.isDraft !== false;
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const mapping: Record<string, string> = { brandName: "브랜드명", brandNameEng: "brandNameEnglish", businessField: "업종", address: "주소", phone: "대표번호", email: "이메일" };
  if (!isDraft) {
    const configs = await db.prepare('SELECT "fieldName", "fieldLabel", "validationType", "minLength", "maxLength" FROM "required_field_configs" WHERE "workflowType" = ? AND "isActive" = 1 ORDER BY "fieldOrder" ASC').bind(String(workflow.type)).all<Record<string, unknown>>();
    const current = await db.prepare('SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1').bind(userId(input)).first<Record<string, unknown>>() ?? {};
    const submissionData = { ...current, ...Object.fromEntries(Object.entries(mapping).filter(([key]) => data[key] !== undefined).map(([key, column]) => [column, data[key]])) };
    const missing = configs.results.filter((field) => {
      const value = submissionData[String(field.fieldName)];
      if (field.validationType === "notEmpty" && (!value || (typeof value === "string" && value.trim() === ""))) return true;
      if (typeof field.minLength === "number" && typeof value === "string" && value.length < field.minLength) return true;
      if (typeof field.maxLength === "number" && typeof value === "string" && value.length > field.maxLength) return true;
      if (field.validationType === "email" && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
      return field.validationType === "phone" && typeof value === "string" && !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(value);
    }).map((field) => String(field.fieldLabel));
    if (missing.length) throw new DataServiceError(400, `필수 정보를 모두 입력해주세요: ${missing.join(", ")}`);
  }
  const statements: import("../database").Statement[] = [];
  const submissionEntries = Object.entries(mapping).filter(([key]) => data[key] !== undefined);
  if (submissionEntries.length) {
    const assignments = submissionEntries.map(([, column]) => `"${column}" = ?`);
    const values: SqlValue[] = submissionEntries.map(([key]) => sqlValue(data[key]));
    values.push(now, input.userId as string);
    statements.push(db.prepare(`UPDATE "submissions" SET ${assignments.join(", ")}, "updatedAt" = ? WHERE "userId" = ?`).bind(...values));
  }
  statements.push(db.prepare('UPDATE "workflows" SET "isDraft" = ?, "draftSavedAt" = CASE WHEN ? = 1 THEN ? ELSE "draftSavedAt" END, "updatedAt" = ? WHERE "id" = ? AND "userId" = ?').bind(isDraft ? 1 : 0, isDraft ? 1 : 0, now, now, workflow.id as string, input.userId as string));
  await db.batch(statements);
  const updated = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? LIMIT 1').bind(workflow.id as string).first();
  return { success: true, message: isDraft ? "임시저장되었습니다. 필수 정보를 모두 입력 후 최종 저장해주세요." : "저장되었습니다.", workflow: updated ? decodeRow("workflows", updated) : null };
}

async function workflowDismiss(db: Database, input: CoreInput): Promise<unknown> {
  const workflow = await ownedWorkflow(db, input);
  const now = typeof input.now === "number" && Number.isSafeInteger(input.now) ? input.now : Date.now();
  const expires = now + 24 * 60 * 60 * 1000;
  await db.batch([db.prepare('INSERT INTO "modal_dismissals" ("id", "userId", "workflowId", "dismissedAt", "expiresAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT ("userId", "workflowId") DO UPDATE SET "dismissedAt" = excluded."dismissedAt", "expiresAt" = excluded."expiresAt"').bind(crypto.randomUUID(), userId(input), workflow.id as string, now, expires, now)]);
  return { success: true, message: "24시간 동안 모달이 표시되지 않습니다.", expiresAt: expires };
}

async function ensureWorkflows(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const user = await db.prepare('SELECT "status" FROM "users" WHERE "id" = ? LIMIT 1').bind(id).first<{ status: string }>();
  if (!user || user.status === "graduated" || user.status === "inactive") return { created: 0 };
  const types = ["로고", "명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지", "홈페이지"];
  const existing = await db.prepare('SELECT "type" FROM "workflows" WHERE "userId" = ?').bind(id).all<{ type: string }>();
  const present = new Set(existing.results.map((row) => row.type));
  const missing = types.filter((type) => !present.has(type));
  if (!missing.length) return { created: 0 };
  const now = Date.now();
  await db.batch(missing.map((type) => db.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") SELECT ?, ?, ?, \'대기\', ?, ? WHERE NOT EXISTS (SELECT 1 FROM "workflows" WHERE "userId" = ? AND "type" = ?)').bind(crypto.randomUUID(), id, type, now, now, id, type)));
  return { created: missing.length };
}

async function workflowDownload(db: Database, input: CoreInput): Promise<unknown> {
  const workflowId = stringValue(input, "workflowId");
  const requestedUrl = stringValue(input, "fileUrl");
  const row = await db.prepare('SELECT "id", "userId", "type", "시안URL", "다운로드횟수" FROM "workflows" WHERE "id" = ? AND "userId" = ? LIMIT 1').bind(workflowId, userId(input)).first<{ id: string; userId: string; type: string; 시안URL: string | null; 다운로드횟수: number }>();
  if (!row) throw new DataServiceError(404, "Workflow not found");
  if (row.시안URL !== requestedUrl) throw new DataServiceError(400, "유효하지 않은 파일 URL입니다.");
  if (row.다운로드횟수 >= 100) throw new DataServiceError(403, "다운로드 횟수가 한도(100회)에 도달했습니다.");
  if (input.increment === true) {
    const now = Date.now();
    await db.batch([db.prepare('UPDATE "workflows" SET "다운로드횟수" = "다운로드횟수" + 1, "updatedAt" = ? WHERE "id" = ? AND "userId" = ? AND "다운로드횟수" < 100').bind(now, workflowId, userId(input))]);
    return { ...decodeRow("workflows", row), 다운로드횟수: row.다운로드횟수 + 1 };
  }
  return decodeRow("workflows", row);
}

async function finalFilesList(db: Database, input: CoreInput): Promise<unknown> {
  const threadId = stringValue(input, "threadId");
  const actor = userId(input);
  const thread = await db.prepare('SELECT t."id", w."userId" FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId" WHERE t."id" = ? LIMIT 1').bind(threadId).first<{ id: string; userId: string }>();
  if (!thread) throw new DataServiceError(404, "Thread not found");
  const isAdmin = input.actorType === "admin";
  if (!isAdmin && thread.userId !== actor) throw new DataServiceError(403, "Forbidden");
  const rows = await db.prepare('SELECT * FROM "design_final_files" WHERE "threadId" = ? ORDER BY "uploadedAt" DESC, "id" DESC LIMIT 101').bind(threadId).all<Record<string, unknown>>();
  if (!rows.success) throw new DataServiceError(503, "Final files lookup failed");
  return { files: rows.results.slice(0, 100).map((row) => decodeRow("design_final_files", row)), ...(rows.results.length > 100 ? { nextCursor: String(rows.results[99].id) } : {}) };
}

async function finalFileCreate(db: Database, input: CoreInput): Promise<unknown> {
  const threadId = stringValue(input, "threadId");
  const actor = userId(input);
  if (input.actorType !== "admin") throw new DataServiceError(403, "Forbidden");
  const thread = await db.prepare('SELECT t."id", t."status" FROM "design_threads" t WHERE t."id" = ? LIMIT 1').bind(threadId).first<{ id: string; status: string }>();
  if (!thread) throw new DataServiceError(404, "Thread not found");
  if (thread.status !== "confirmed") throw new DataServiceError(400, "확정된 시안에만 파일을 업로드할 수 있습니다");
  if (input.dryRun === true) return { ok: true };
  const fileName = stringValue(input, "fileName");
  const fileType = stringValue(input, "fileType");
  const fileUrl = stringValue(input, "fileUrl");
  const fileSize = typeof input.fileSize === "number" && Number.isSafeInteger(input.fileSize) ? input.fileSize : null;
  if (fileSize !== null && fileSize > 50 * 1024 * 1024) throw new DataServiceError(413, "파일 용량이 제한을 초과했습니다.");
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO "design_final_files" ("id", "threadId", "fileName", "fileType", "fileSize", "fileUrl", "uploadedBy", "uploadedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, threadId, fileName, fileType, fileSize, fileUrl, actor, now)]);
  const row = await db.prepare('SELECT * FROM "design_final_files" WHERE "id" = ? LIMIT 1').bind(id).first<Record<string, unknown>>();
  return row ? decodeRow("design_final_files", row) : null;
}

async function finalFileDelete(db: Database, input: CoreInput): Promise<unknown> {
  const fileId = stringValue(input, "fileId");
  if (input.actorType !== "admin") throw new DataServiceError(403, "Forbidden");
  const row = await db.prepare('SELECT "id" FROM "design_final_files" WHERE "id" = ? LIMIT 1').bind(fileId).first();
  if (!row) throw new DataServiceError(404, "File not found");
  await db.batch([db.prepare('DELETE FROM "design_final_files" WHERE "id" = ?').bind(fileId)]);
  return { message: "파일이 삭제되었습니다" };
}

async function updateUserSlackChannel(db: Database, input: CoreInput): Promise<unknown> {
  const id = userId(input);
  const channelId = stringValue(input, "slackChannelId");
  const result = await db.batch([db.prepare('UPDATE "users" SET "slackChannelId" = ? WHERE "id" = ?').bind(channelId, id)]);
  if (!result[0]?.meta.changes) throw new DataServiceError(404, "User not found");
  return { success: true };
}

function securedSubmissionInput(input: CoreInput, key?: string): CoreInput {
  if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) {
    throw new DataServiceError(400, "Invalid submission data");
  }
  const data = encryptSubmissionSecrets(dropMaskedSecretFields(input.data), userId(input), key);
  return { ...input, data };
}

export async function coreOperation(db: Database, operation: string, input: CoreInput, options: { cursorSecret?: string; encryptionKey?: string } = {}): Promise<unknown> {
  const scopedInput = options.cursorSecret ? { ...input, cursorSecret: options.cursorSecret } : input;
  switch (operation) {
    case "signup": {
      const result = await createSignup(db, scopedInput as unknown as SignupInput);
      const cohort = await db.prepare('SELECT "name" FROM "cohorts" WHERE "id" = ? LIMIT 1').bind(result.cohortId).first<{ name: string }>();
      return { ...result, cohortName: cohort?.name ?? "기수 미지정" };
    }
    case "confirm-design": return confirmDesign(db, scopedInput as unknown as ConfirmInput);
    case "submission-get": return submissionGet(db, scopedInput);
    case "submission-update": return updateSubmission(db, securedSubmissionInput(scopedInput, options.encryptionKey));
    case "submission-save": return saveSubmission(db, securedSubmissionInput(scopedInput, options.encryptionKey));
    case "request-print": return requestPrint(db, scopedInput);
    case "workflows-list": return listWorkflows(db, scopedInput);
    case "workflow-get": return getWorkflow(db, scopedInput);
    case "design-thread-get": return getThread(db, scopedInput);
    case "design-thread-messages": return listThreadMessages(db, scopedInput);
    case "design-threads-list": return listThreads(db, scopedInput);
    case "design-thread-create": return createThread(db, scopedInput);
    case "design-thread-message": return addThreadMessage(db, scopedInput);
    case "design-thread-read": return markThreadRead(db, scopedInput);
    case "required-fields": return requiredFields(db, scopedInput);
    case "required-fields-validate": return validateRequiredFields(db, scopedInput);
    case "pending-confirmation": return pendingConfirmation(db, scopedInput);
    case "workflow-order": return workflowOrder(db, scopedInput);
    case "workflow-approve": return workflowApprove(db, scopedInput);
    case "workflow-feedback": return workflowFeedback(db, scopedInput);
    case "workflow-save": return workflowSave(db, scopedInput);
    case "workflow-dismiss": return workflowDismiss(db, scopedInput);
    case "ensure-workflows": return ensureWorkflows(db, scopedInput);
    case "workflow-download": return workflowDownload(db, scopedInput);
    case "final-files-list": return finalFilesList(db, scopedInput);
    case "final-file-create": return finalFileCreate(db, scopedInput);
    case "final-file-delete": return finalFileDelete(db, scopedInput);
    case "user-slack-channel-update": return updateUserSlackChannel(db, scopedInput);
    default: throw new DataServiceError(404, "Unknown core operation");
  }
}

export { SUBMISSION_FIELDS };
