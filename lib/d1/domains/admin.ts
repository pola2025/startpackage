import { DataServiceError, type Database, type SqlValue } from "../database";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";
import { decodeRow } from "../row-codec";

export type AdminOperation =
  | "admins-list" | "users-list" | "requests-list" | "alerts-list"
  | "announcements-list" | "cohorts-list" | "homepage-users-list"
  | "content-tips-list" | "content-tip-get" | "content-tip-create" | "content-tip-update" | "content-tip-delete"
  | "workflows-list" | "workflow-create" | "workflow-get" | "design-history-list" | "extension-list" | "extension-approve" | "extension-reject" | "user-update-phone" | "user-delete"
  | "alert-create" | "alert-update" | "alert-delete"
  | "announcement-create" | "announcement-update" | "announcement-delete"
  | "cohort-create" | "cohort-update" | "cohort-toggle" | "cohort-delete"
  | "admin-create" | "admin-delete" | "admin-update" | "admin-reset-password" | "admin-reset-2fa" | "admin-prepare-2fa" | "admin-setup-2fa" | "admin-request-create"
  | "submission-admin-get" | "design-threads-list" | "design-thread-get" | "user-delete-assets" | "ad-automation-get" | "ad-automation-payment" | "ad-automation-settings" | "ad-automation-toggle";

export type AdminInput = Record<string, unknown> & { adminId?: string };
const ADMIN_ROLES = new Set(["super", "designer", "operator"]);

function required(input: AdminInput, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > 512) {
    throw new DataServiceError(400, `${key} is required`);
  }
  return value.trim();
}

function secret(input: AdminInput): string {
  const value = typeof input.cursorSecret === "string" ? input.cursorSecret : process.env.D1_CURSOR_SECRET;
  if (!value || value.length < 32) throw new DataServiceError(503, "Service unavailable");
  return value;
}

function bool(value: unknown): number { return value === true || value === 1 ? 1 : 0; }
function json(value: unknown): string { return JSON.stringify(value ?? []); }
function value(value: unknown): SqlValue { return value === null || typeof value === "string" || typeof value === "number" ? value : value === undefined ? null : JSON.stringify(value); }
function id(): string { return crypto.randomUUID(); }
function now(): number { return Date.now(); }

async function all<T = Record<string, unknown>>(db: Database, sql: string, values: SqlValue[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return result.results;
}
async function first<T = Record<string, unknown>>(db: Database, sql: string, values: SqlValue[] = []): Promise<T | null> {
  return db.prepare(sql).bind(...values).first<T>();
}
async function write(db: Database, sql: string, values: SqlValue[] = []): Promise<void> {
  const result = await db.prepare(sql).bind(...values).all();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
}

async function assertAdmin(db: Database, adminId: string): Promise<Record<string, unknown>> {
  const admin = await first(db, 'SELECT "id", "name", "role" FROM "admins" WHERE "id" = ? LIMIT 1', [adminId]);
  if (!admin || typeof admin.role !== "string" || !ADMIN_ROLES.has(admin.role)) {
    throw new DataServiceError(403, "Forbidden");
  }
  return admin;
}
async function assertSuper(admin: Record<string, unknown>): Promise<void> {
  if (admin.role !== "super") throw new DataServiceError(403, "Forbidden");
}

function pageInput(input: AdminInput, scope: string): { size: number; cursor?: string; cursorSecret: string; scope: string } {
  const cursorSecret = secret(input);
  return { size: parsePageSize(input.pageSize), cursor: typeof input.cursor === "string" ? input.cursor : undefined, cursorSecret, scope };
}

async function paged(db: Database, input: AdminInput, table: string, order: string, columns = "*") {
  const page = pageInput(input, `admin-${table}`);
  const values: SqlValue[] = [];
  let continuation = "";
  if (page.cursor) {
    const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["createdAt", "id"]);
    const createdAt = Number(decoded.sort[0]?.value);
    const rowId = String(decoded.sort[1]?.value ?? "");
    if (!Number.isSafeInteger(createdAt)) throw new DataServiceError(400, "Invalid cursor");
    continuation = ' WHERE ("createdAt", "id") < (?, ?)';
    values.push(createdAt, rowId);
  }
  values.push(page.size + 1);
  const rows = await all<Record<string, unknown>>(db, `SELECT ${columns} FROM "${table}"${continuation} ORDER BY ${order} LIMIT ?`, values);
  const items = rows.slice(0, page.size);
  const last = rows.length > page.size ? items[items.length - 1] : undefined;
  return { items, ...(last ? { nextCursor: signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "createdAt", value: String(last.createdAt) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

async function listUsers(db: Database, input: AdminInput) {
  const page = pageInput(input, "admin-users");
  const values: SqlValue[] = ["user"];
  let continuation = "";
  if (page.cursor) {
    const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["이름", "id"]);
    const name = String(decoded.sort[0]?.value ?? "");
    const rowId = String(decoded.sort[1]?.value ?? "");
    continuation = ' AND ("이름", "id") > (?, ?)'; values.push(name, rowId);
  }
  values.push(page.size + 1);
  const rows = await all(db, `SELECT "id", "이름", "email", "연락처", "cohortId", "adAutomationEnabled", "adAutomationStartDate", "adAutomationEndDate", "smsSettingEnabled", "smsSettingStartDate", "smsSettingEndDate", "naverAdSettingEnabled", "naverAdSettingStartDate", "naverAdSettingEndDate", "homepageCompleted", "homepageCompletedAt", "marketingSupportEndDate" FROM "users" WHERE "role" = ?${continuation} ORDER BY "이름" ASC, "id" ASC LIMIT ?`, values);
  const items = rows.slice(0, page.size); const last = rows.length > page.size ? items[items.length - 1] : undefined;
  return { items, ...(last ? { nextCursor: signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "이름", value: String(last["이름"]) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

async function listHomepageUsers(db: Database, input: AdminInput) {
  const page = pageInput(input, "admin-homepage-users");
  const values: SqlValue[] = ["홈페이지", "active"];
  let continuation = "";
  if (page.cursor) {
    const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["이름", "id"]);
    continuation = ' AND (u."이름", u."id") > (?, ?)';
    values.push(String(decoded.sort[0]?.value ?? ""), String(decoded.sort[1]?.value ?? ""));
  }
  values.push(page.size + 1);
  const rows = await all<Record<string, unknown>>(db, `SELECT u."id", u."이름", u."email", u."연락처", u."homepageCompleted", u."homepageCompletedAt", c."id" AS "cohortId", c."name" AS "cohortName", s."id" AS "submissionId", s."브랜드명" AS "submissionBrandName", s."홈페이지제작방식" AS "submissionHomepageType", s."홈페이지스타일" AS "submissionHomepageStyle", s."홈페이지컬러컨셉" AS "submissionHomepageColor", s."도메인주소" AS "submissionDomain", s."도메인관리사이트" AS "submissionDomainSite", s."도메인관리ID" AS "submissionDomainId", s."도메인관리PW" AS "submissionDomainPassword", s."GmailID" AS "submissionGmailId", s."GmailPW" AS "submissionGmailPassword", w."id" AS "workflowId", w."status" AS "workflowStatus", w."시안URL", w."자료제출일", w."예상도착일", w."createdAt" AS "workflowCreatedAt" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" LEFT JOIN "submissions" s ON s."userId" = u."id" LEFT JOIN "workflows" w ON w."id" = (SELECT w2."id" FROM "workflows" w2 WHERE w2."userId" = u."id" AND w2."type" = ? ORDER BY w2."createdAt" DESC, w2."id" DESC LIMIT 1) WHERE u."status" = ?${continuation} ORDER BY u."이름" ASC, u."id" ASC LIMIT ?`, values);
  const items = rows.slice(0, page.size).map((row) => {
    const {
      cohortId, cohortName, submissionId, submissionBrandName, submissionHomepageType,
      submissionHomepageStyle, submissionHomepageColor, submissionDomain,
      submissionDomainSite, submissionDomainId, submissionDomainPassword,
      submissionGmailId, submissionGmailPassword, workflowId, workflowStatus,
      시안URL, 자료제출일, 예상도착일, workflowCreatedAt, ...user
    } = row;
    return {
      ...user,
      cohort: cohortId ? { id: cohortId, name: cohortName } : null,
      submission: submissionId
        ? {
            브랜드명: submissionBrandName,
            홈페이지제작방식: submissionHomepageType,
            홈페이지스타일: submissionHomepageStyle,
            홈페이지컬러컨셉: submissionHomepageColor,
            도메인주소: submissionDomain,
            도메인관리사이트: submissionDomainSite,
            도메인관리ID: submissionDomainId,
            도메인관리PW: submissionDomainPassword,
            GmailID: submissionGmailId,
            GmailPW: submissionGmailPassword,
          }
        : null,
      homepageWorkflow: workflowId
        ? { id: workflowId, status: workflowStatus, 시안URL, 자료제출일, 예상도착일, createdAt: workflowCreatedAt }
        : null,
    };
  });
  const last = rows.length > page.size ? rows[page.size - 1] : undefined;
  return { items, ...(last ? { nextCursor: signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "이름", value: String(last["이름"]) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

function decodeDesignMessage(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    attachments: typeof row.attachments === "string" ? JSON.parse(row.attachments) : row.attachments ?? [],
    isReadByAdmin: Boolean(row.isReadByAdmin),
    isReadByUser: Boolean(row.isReadByUser),
    createdAt: new Date(Number(row.createdAt)),
  };
}

async function listDesignThreads(db: Database, input: AdminInput) {
  const page = pageInput(input, `admin-design-threads:${String(input.status ?? "all")}:${String(input.workflowType ?? "all")}:${String(input.userId ?? "all")}`);
  const values: SqlValue[] = [];
  const clauses: string[] = [];
  if (typeof input.status === "string" && input.status !== "all") { clauses.push('dc."status" = ?'); values.push(input.status); }
  if (typeof input.workflowType === "string" && input.workflowType !== "all") { clauses.push('dc."workflowType" = ?'); values.push(input.workflowType); }
  if (typeof input.userId === "string" && input.userId.trim()) { clauses.push('dc."userId" = ?'); values.push(input.userId.trim()); }
  if (page.cursor) {
    const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["updatedAt", "id"]);
    clauses.push('(dc."updatedAt", dc."threadId") < (?, ?)');
    values.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? ""));
  }
  values.push(page.size + 1);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await all<Record<string, unknown>>(db, `WITH candidate AS MATERIALIZED (SELECT "threadId", "status", "workflowType", "userId", "updatedAt", "unreadByAdmin" FROM "design_thread_counters" dc ${where} ORDER BY dc."updatedAt" DESC, dc."threadId" DESC LIMIT ?) SELECT t.*, candidate."updatedAt" AS "projectionUpdatedAt", w."id" AS "workflowId", w."type" AS "workflowType", w."status" AS "workflowStatus", u."id" AS "userId", u."이름" AS "userName", u."email" AS "userEmail", c."name" AS "cohortName", lm."id" AS "lastMessageId", lm."authorType" AS "lastMessageAuthorType", lm."authorId" AS "lastMessageAuthorId", lm."authorName" AS "lastMessageAuthorName", lm."messageType" AS "lastMessageType", lm."content" AS "lastMessageContent", lm."attachments" AS "lastMessageAttachments", lm."designVersion" AS "lastMessageDesignVersion", lm."designUrl" AS "lastMessageDesignUrl", lm."isReadByAdmin" AS "lastMessageIsReadByAdmin", lm."isReadByUser" AS "lastMessageIsReadByUser", lm."createdAt" AS "lastMessageCreatedAt", candidate."unreadByAdmin" AS "unreadCount" FROM candidate INNER JOIN "design_threads" t ON t."id" = candidate."threadId" INNER JOIN "workflows" w ON w."id" = t."workflowId" INNER JOIN "users" u ON u."id" = w."userId" LEFT JOIN "cohorts" c ON c."id" = u."cohortId" LEFT JOIN "design_thread_messages" lm ON lm."id" = (SELECT m."id" FROM "design_thread_messages" m WHERE m."threadId" = t."id" ORDER BY m."createdAt" DESC, m."id" DESC LIMIT 1) ORDER BY candidate."updatedAt" DESC, candidate."threadId" DESC`, values);
  const items = rows.slice(0, page.size).map((row) => {
    const thread = decodeRow("design_threads", row);
    const lastMessage = row.lastMessageId ? decodeDesignMessage({
      id: row.lastMessageId, threadId: row.id, authorId: row.lastMessageAuthorId,
      authorType: row.lastMessageAuthorType, authorName: row.lastMessageAuthorName,
      messageType: row.lastMessageType, content: row.lastMessageContent,
      attachments: row.lastMessageAttachments, designVersion: row.lastMessageDesignVersion,
      designUrl: row.lastMessageDesignUrl, isReadByAdmin: row.lastMessageIsReadByAdmin,
      isReadByUser: row.lastMessageIsReadByUser, createdAt: row.lastMessageCreatedAt,
    }) : null;
    return {
      id: thread.id, status: thread.status, currentVersion: thread.currentVersion,
      confirmedAt: thread.confirmedAt, confirmedByName: thread.confirmedByName,
      workflow: { id: row.workflowId, type: row.workflowType, status: row.workflowStatus, user: { id: row.userId, 이름: row.userName, email: row.userEmail, cohort: row.cohortName ? { name: row.cohortName } : null } },
      lastMessage, unreadCount: Number(row.unreadCount ?? 0), createdAt: thread.createdAt, updatedAt: thread.updatedAt,
    };
  });
  const last = rows.length > page.size ? rows[page.size - 1] : undefined;
  return { threads: items, ...(last ? { nextCursor: signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "updatedAt", value: String(last.projectionUpdatedAt ?? last.updatedAt) }, { field: "id", value: String(last.id) }] }) } : {}) };
}

async function getAdminDesignThread(db: Database, input: AdminInput) {
  const threadId = required(input, "threadId");
  const thread = await first<Record<string, unknown>>(db, `SELECT t.*, w."id" AS "workflowId", w."type" AS "workflowType", w."status" AS "workflowStatus", w."userId", u."이름" AS "userName", u."email" AS "userEmail", u."연락처" AS "userPhone", s."브랜드명" AS "brandName", c."name" AS "cohortName" FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId" INNER JOIN "users" u ON u."id" = w."userId" LEFT JOIN "submissions" s ON s."userId" = u."id" LEFT JOIN "cohorts" c ON c."id" = u."cohortId" WHERE t."id" = ? LIMIT 1`, [threadId]);
  if (!thread) throw new DataServiceError(404, "Thread not found");
  const page = pageInput(input, `admin-design-thread-messages:${threadId}`);
  const values: SqlValue[] = [threadId];
  let continuation = "";
  if (page.cursor) { const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["createdAt", "id"]); continuation = ' AND ("createdAt", "id") < (?, ?)'; values.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? "")); }
  values.push(page.size + 1);
  const result = await all<Record<string, unknown>>(db, `SELECT * FROM "design_thread_messages" WHERE "threadId" = ?${continuation} ORDER BY "createdAt" DESC, "id" DESC LIMIT ?`, values);
  const unreadIds = result.slice(0, page.size).filter((message) => message.authorType === "user" && Number(message.isReadByAdmin) === 0).map((message) => String(message.id));
  if (unreadIds.length > 0) {
    await write(db, `UPDATE "design_thread_messages" SET "isReadByAdmin" = 1 WHERE "id" IN (${unreadIds.map(() => "?").join(",")})`, unreadIds);
  }
  const messages = result.slice(0, page.size).map(decodeDesignMessage).reverse();
  const last = result.length > page.size ? result[page.size - 1] : undefined;
  return { thread: { id: thread.id, status: thread.status, currentVersion: thread.currentVersion, confirmedAt: thread.confirmedAt ? new Date(Number(thread.confirmedAt)) : null, confirmedByName: thread.confirmedByName, workflow: { id: thread.workflowId, type: thread.workflowType, status: thread.workflowStatus, user: { id: thread.userId, 이름: thread.userName, email: thread.userEmail, 연락처: thread.userPhone, submission: thread.brandName !== null && thread.brandName !== undefined ? { 브랜드명: thread.brandName } : null, cohort: thread.cohortName ? { name: thread.cohortName } : null } }, messages }, messagesNextCursor: last ? signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "createdAt", value: String(last.createdAt) }, { field: "id", value: String(last.id) }] }) : undefined };
}

export async function adminOperation(db: Database, operation: string, input: AdminInput): Promise<unknown> {
  if (operation === "user-update-phone-self") {
    const actor = required(input, "adminId"); const userId = required(input, "userId"); if (actor !== userId) throw new DataServiceError(403, "Forbidden"); const phone = required(input, "phone"); await write(db, 'UPDATE "users" SET "연락처" = ?, "updatedAt" = ? WHERE "id" = ?', [phone, now(), userId]); return first(db, 'SELECT "id", "이름", "email", "연락처" FROM "users" WHERE "id" = ?', [userId]);
  }
  if (operation === "admin-prepare-2fa") {
    const email = required(input, "email"); const token = required(input, "setupToken");
    const target = await first<Record<string, unknown>>(db, 'SELECT "id", "email", "name", "twoFactorSetupToken", "twoFactorEnabled", "twoFactorSecret" FROM "admins" WHERE "email" = ? LIMIT 1', [email]);
    if (!target || target.twoFactorSetupToken !== token) throw new DataServiceError(400, "유효하지 않은 셋업 링크입니다.");
    if (target.twoFactorEnabled) throw new DataServiceError(400, "이미 2FA가 설정되어 있습니다.");
    if (typeof input.secret !== "string" || input.secret.length === 0) return target;
    await write(db, 'UPDATE "admins" SET "twoFactorSecret" = ?, "updatedAt" = ? WHERE "id" = ? AND "twoFactorSetupToken" = ?', [input.secret, now(), target.id as string, token]);
    return { ...target, twoFactorSecret: input.secret };
  }
  const adminId = required(input, "adminId");
  const admin = await assertAdmin(db, adminId);
  switch (operation) {
    case "admins-list": await assertSuper(admin); return paged(db, input, "admins", '"createdAt" DESC, "id" DESC', '"id", "email", "name", "role", "twoFactorEnabled", "createdAt", "updatedAt"');
    case "users-list": return listUsers(db, input);
    case "requests-list": return paged(db, input, "admin_requests", '"createdAt" DESC, "id" DESC', '"id", "name", "email", "phone", "status", "createdAt", "reviewedAt", "rejectReason"');
    case "alerts-list": return paged(db, input, "system_alerts", '"createdAt" DESC, "id" DESC');
    case "announcements-list": return paged(db, input, "announcements", '"createdAt" DESC, "id" DESC');
    case "content-tips-list": return paged(db, input, "content_tips", '"createdAt" DESC, "id" DESC');
    case "content-tip-get": { const tipId = required(input, "id"); const tip = await first(db, 'SELECT * FROM "content_tips" WHERE "id" = ? LIMIT 1', [tipId]); if (!tip) throw new DataServiceError(404, "콘텐츠 팁을 찾을 수 없습니다"); return tip; }
    case "cohorts-list": return paged(db, input, "cohorts", '"createdAt" DESC, "id" DESC');
    case "homepage-users-list": return listHomepageUsers(db, input);
    case "design-threads-list": return listDesignThreads(db, input);
    case "design-thread-get": return getAdminDesignThread(db, input);
    case "workflows-list": return paged(db, input, "workflows", '"createdAt" DESC, "id" DESC');
    case "workflow-create": { const userId = required(input, "userId"); const type = required(input, "type"); const user = await first(db, 'SELECT "id", "이름", "cohortId" FROM "users" WHERE "id" = ? LIMIT 1', [userId]); if (!user) throw new DataServiceError(404, "사용자를 찾을 수 없습니다"); const existing = await first(db, 'SELECT "id" FROM "workflows" WHERE "userId" = ? AND "type" = ? LIMIT 1', [userId, type]); if (existing) throw new DataServiceError(400, "해당 사용자의 동일한 제작물 워크플로우가 이미 존재합니다"); const workflowId = id(); await write(db, 'INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)', [workflowId, userId, type, "대기", now(), now()]); return first(db, 'SELECT w.*, u."이름" AS "userName", c."name" AS "cohortName" FROM "workflows" w INNER JOIN "users" u ON u."id" = w."userId" LEFT JOIN "cohorts" c ON c."id" = u."cohortId" WHERE w."id" = ?', [workflowId]); }
    case "workflow-get": { const workflowId = required(input, "workflowId"); return first(db, 'SELECT w.*, u."이름" AS "userName", u."연락처" AS "userPhone", u."email" AS "userEmail" FROM "workflows" w INNER JOIN "users" u ON u."id" = w."userId" WHERE w."id" = ? LIMIT 1', [workflowId]); }
    case "design-history-list": { const workflowId = required(input, "workflowId"); const page = pageInput(input, `admin-design-history:${workflowId}`); const values: SqlValue[] = [workflowId]; let continuation = ""; if (page.cursor) { const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["createdAt", "id"]); continuation = ' AND ("createdAt", "id") > (?, ?)'; values.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? "")); } values.push(page.size + 1); const rows = await all<Record<string, unknown>>(db, `SELECT * FROM "design_history" WHERE "workflowId" = ?${continuation} ORDER BY "createdAt" ASC, "id" ASC LIMIT ?`, values); const items = rows.slice(0, page.size); const last = rows.length > page.size ? items[items.length - 1] : undefined; return { items, ...(last ? { nextCursor: signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "createdAt", value: String(last.createdAt) }, { field: "id", value: String(last.id) }] }) } : {}) }; }
    case "extension-list": { const page = pageInput(input, "admin-extension-list"); const values: SqlValue[] = []; let continuation = ""; if (page.cursor) { const decoded = verifyCursor(page.cursorSecret, page.cursor, page.scope, ["requestDate", "id"]); continuation = ' WHERE (r."requestDate", r."id") < (?, ?)'; values.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? "")); } values.push(page.size + 1); const rows = await all<Record<string, unknown>>(db, `SELECT r.*, u."이름" AS "userName", u."email" AS "userEmail", u."연락처" AS "userPhone", c."name" AS "cohortName" FROM "marketing_extension_requests" r INNER JOIN "users" u ON u."id" = r."userId" LEFT JOIN "cohorts" c ON c."id" = u."cohortId"${continuation} ORDER BY r."requestDate" DESC, r."id" DESC LIMIT ?`, values); const items = rows.slice(0, page.size); const last = rows.length > page.size ? items[items.length - 1] : undefined; return { items, ...(last ? { nextCursor: signCursor(page.cursorSecret, { version: 1, scope: page.scope, sort: [{ field: "requestDate", value: String(last.requestDate) }, { field: "id", value: String(last.id) }] }) } : {}) }; }
    case "extension-approve": { const requestId = required(input, "id"); const request = await first<Record<string, unknown>>(db, 'SELECT r.*, u."이름" AS "userName", u."email" AS "userEmail", u."연락처" AS "userPhone" FROM "marketing_extension_requests" r INNER JOIN "users" u ON u."id" = r."userId" WHERE r."id" = ? LIMIT 1', [requestId]); if (!request) throw new DataServiceError(404, "신청을 찾을 수 없습니다"); if (request.status !== "pending") throw new DataServiceError(400, "이미 처리된 신청입니다"); const timestamp = now(); const result = await db.batch([db.prepare('UPDATE "marketing_extension_requests" SET "status" = ?, "reviewedBy" = ?, "reviewedAt" = ?, "adminResponse" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ?').bind("approved", adminId, timestamp, typeof input.adminResponse === "string" ? input.adminResponse : null, timestamp, requestId, "pending"), db.prepare('UPDATE "users" SET "marketingSupportEndDate" = ?, "updatedAt" = ? WHERE "id" = ? AND EXISTS (SELECT 1 FROM "marketing_extension_requests" WHERE "id" = ? AND "status" = ? AND "reviewedBy" = ? AND "reviewedAt" = ?)').bind(value(request.newEndDate), timestamp, request.userId as string, requestId, "approved", adminId, timestamp)]); if (!result[0]?.success || !result[1]?.success) throw new DataServiceError(503, "Service unavailable"); if ((result[0]?.meta.changes ?? 0) !== 1 || (result[1]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "이미 처리된 신청입니다"); return { ...request, status: "approved", adminResponse: typeof input.adminResponse === "string" ? input.adminResponse : null, reviewedBy: adminId, reviewedAt: timestamp }; }
    case "extension-reject": { const requestId = required(input, "id"); const reason = required(input, "adminResponse"); const request = await first<Record<string, unknown>>(db, 'SELECT r.*, u."이름" AS "userName", u."email" AS "userEmail", u."연락처" AS "userPhone" FROM "marketing_extension_requests" r INNER JOIN "users" u ON u."id" = r."userId" WHERE r."id" = ? LIMIT 1', [requestId]); if (!request) throw new DataServiceError(404, "신청을 찾을 수 없습니다"); if (request.status !== "pending") throw new DataServiceError(400, "이미 처리된 신청입니다"); const timestamp = now(); const result = await db.prepare('UPDATE "marketing_extension_requests" SET "status" = ?, "reviewedBy" = ?, "reviewedAt" = ?, "adminResponse" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ?').bind("rejected", adminId, timestamp, reason, timestamp, requestId, "pending").all(); if (!result.success) throw new DataServiceError(503, "Service unavailable"); if ((result.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "이미 처리된 신청입니다"); return { ...request, status: "rejected", adminResponse: reason, reviewedBy: adminId, reviewedAt: timestamp }; }
    case "user-update-phone": { const userId = required(input, "userId"); const phone = required(input, "phone"); await write(db, 'UPDATE "users" SET "연락처" = ?, "updatedAt" = ? WHERE "id" = ?', [phone, now(), userId]); return first(db, 'SELECT "id", "이름", "email", "연락처" FROM "users" WHERE "id" = ?', [userId]); }
    case "user-delete": { const userId = required(input, "userId"); await write(db, 'DELETE FROM "users" WHERE "id" = ?', [userId]); return { success: true, message: "사용자와 관련 파일이 모두 삭제되었습니다." }; }
    case "alert-create": { const alertId = id(); await write(db, 'INSERT INTO "system_alerts" ("id", "title", "content", "type", "priority", "startDate", "endDate", "isActive", "createdBy", "createdByName", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [alertId, required(input, "title"), required(input, "content"), required(input, "type"), Number(input.priority ?? 0), Number(input.startDate), Number(input.endDate), bool(input.isActive ?? true), adminId, String(admin.name ?? "관리자"), now(), now()]); return first(db, 'SELECT * FROM "system_alerts" WHERE "id" = ?', [alertId]); }
    case "alert-update": { const alertId = required(input, "id"); const existing = await first<Record<string, unknown>>(db, 'SELECT * FROM "system_alerts" WHERE "id" = ?', [alertId]); if (!existing) throw new DataServiceError(404, "Alert not found"); await write(db, 'UPDATE "system_alerts" SET "title" = ?, "content" = ?, "type" = ?, "priority" = ?, "startDate" = ?, "endDate" = ?, "isActive" = ?, "cohortId" = ?, "phoneNumber" = ?, "updatedAt" = ? WHERE "id" = ?', [value(typeof input.title === "string" ? input.title : existing.title), value(typeof input.content === "string" ? input.content : existing.content), value(typeof input.type === "string" ? input.type : existing.type), value(typeof input.priority === "number" ? input.priority : existing.priority), value(typeof input.startDate === "number" ? input.startDate : existing.startDate), value(typeof input.endDate === "number" ? input.endDate : existing.endDate), value(input.isActive === undefined ? existing.isActive : bool(input.isActive)), value(input.cohortId === undefined ? existing.cohortId ?? null : typeof input.cohortId === "string" ? input.cohortId : null), value(input.phoneNumber === undefined ? existing.phoneNumber ?? null : typeof input.phoneNumber === "string" ? input.phoneNumber : null), now(), alertId]); return first(db, 'SELECT * FROM "system_alerts" WHERE "id" = ?', [alertId]); }
    case "alert-delete": await write(db, 'DELETE FROM "system_alerts" WHERE "id" = ?', [required(input, "id")]); return { success: true };
    case "announcement-create": { const announcementId = id(); await write(db, 'INSERT INTO "announcements" ("id", "authorId", "authorName", "title", "content", "imageUrls", "youtubeUrl", "published", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [announcementId, adminId, String(admin.name ?? "관리자"), required(input, "title"), required(input, "content"), json(input.imageUrls), typeof input.youtubeUrl === "string" ? input.youtubeUrl : null, bool(input.published ?? true), now(), now()]); return first(db, 'SELECT * FROM "announcements" WHERE "id" = ?', [announcementId]); }
    case "announcement-update": { const announcementId = required(input, "id"); await write(db, 'UPDATE "announcements" SET "title" = ?, "content" = ?, "imageUrls" = ?, "youtubeUrl" = ?, "published" = ?, "updatedAt" = ? WHERE "id" = ?', [required(input, "title"), required(input, "content"), json(input.imageUrls), typeof input.youtubeUrl === "string" ? input.youtubeUrl : null, bool(input.published), now(), announcementId]); return first(db, 'SELECT * FROM "announcements" WHERE "id" = ?', [announcementId]); }
    case "announcement-delete": await write(db, 'DELETE FROM "announcements" WHERE "id" = ?', [required(input, "id")]); return { success: true };
    case "content-tip-create": { const tipId = id(); await write(db, 'INSERT INTO "content_tips" ("id","authorId","authorName","title","description","linkType","linkUrl","thumbnailUrl","category","subCategory","published","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [tipId, adminId, String(admin.name ?? "관리자"), required(input, "title"), required(input, "description"), required(input, "linkType"), required(input, "linkUrl"), value(input.thumbnailUrl), required(input, "category"), value(input.subCategory), bool(input.published ?? true), now(), now()]); return first(db, 'SELECT * FROM "content_tips" WHERE "id" = ?', [tipId]); }
    case "content-tip-update": { const tipId = required(input, "id"); const existing = await first<Record<string, unknown>>(db, 'SELECT * FROM "content_tips" WHERE "id" = ?', [tipId]); if (!existing) throw new DataServiceError(404, "콘텐츠 팁을 찾을 수 없습니다"); await write(db, 'UPDATE "content_tips" SET "title" = ?, "description" = ?, "linkType" = ?, "linkUrl" = ?, "thumbnailUrl" = ?, "category" = ?, "subCategory" = ?, "published" = ?, "updatedAt" = ? WHERE "id" = ?', [value(input.title ?? existing.title), value(input.description ?? existing.description), value(input.linkType ?? existing.linkType), value(input.linkUrl ?? existing.linkUrl), value(input.thumbnailUrl === undefined ? existing.thumbnailUrl : input.thumbnailUrl), value(input.category ?? existing.category), value(input.subCategory === undefined ? existing.subCategory : input.subCategory), bool(input.published === undefined ? existing.published : input.published), now(), tipId]); return first(db, 'SELECT * FROM "content_tips" WHERE "id" = ?', [tipId]); }
    case "content-tip-delete": await write(db, 'DELETE FROM "content_tips" WHERE "id" = ?', [required(input, "id")]); return { success: true, message: "콘텐츠 팁이 삭제되었습니다" };
    case "cohort-create": { const cohortId = id(); await write(db, 'INSERT INTO "cohorts" ("id", "name", "englishName", "교육시작일", "교육요일", "자료제출마감일", "isActive", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [cohortId, required(input, "name"), typeof input.englishName === "string" ? input.englishName : null, Number(input.교육시작일), required(input, "교육요일"), Number(input.자료제출마감일), bool(input.isActive ?? true), now(), now()]); return first(db, 'SELECT * FROM "cohorts" WHERE "id" = ?', [cohortId]); }
    case "cohort-update": { const cohortId = required(input, "id"); await write(db, 'UPDATE "cohorts" SET "name" = ?, "englishName" = ?, "교육시작일" = ?, "교육요일" = ?, "자료제출마감일" = ?, "isActive" = ?, "updatedAt" = ? WHERE "id" = ?', [required(input, "name"), typeof input.englishName === "string" ? input.englishName : null, Number(input.교육시작일), required(input, "교육요일"), Number(input.자료제출마감일), bool(input.isActive), now(), cohortId]); return first(db, 'SELECT * FROM "cohorts" WHERE "id" = ?', [cohortId]); }
    case "cohort-toggle": { const cohortId = required(input, "id"); await write(db, 'UPDATE "cohorts" SET "isActive" = ?, "updatedAt" = ? WHERE "id" = ?', [bool(input.isActive), now(), cohortId]); return first(db, 'SELECT * FROM "cohorts" WHERE "id" = ?', [cohortId]); }
    case "cohort-delete": await write(db, 'DELETE FROM "cohorts" WHERE "id" = ?', [required(input, "id")]); return { success: true };
    case "admin-create": { await assertSuper(admin); const adminEmail = required(input, "email"); const existing = await first(db, 'SELECT "id" FROM "admins" WHERE "email" = ? LIMIT 1', [adminEmail]); if (existing) throw new DataServiceError(400, "이미 등록된 이메일입니다"); const adminIdNew = id(); await write(db, 'INSERT INTO "admins" ("id", "email", "password", "name", "role", "twoFactorSetupToken", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [adminIdNew, adminEmail, required(input, "password"), required(input, "name"), typeof input.role === "string" ? input.role : "operator", typeof input.setupToken === "string" ? input.setupToken : null, now(), now()]); return first(db, 'SELECT "id", "email", "name", "role", "twoFactorEnabled", "createdAt", "updatedAt" FROM "admins" WHERE "id" = ?', [adminIdNew]); }
    case "admin-delete": { await assertSuper(admin); const target = required(input, "targetAdminId"); if (target === adminId) throw new DataServiceError(400, "Cannot delete current admin"); await write(db, 'DELETE FROM "admins" WHERE "id" = ?', [target]); return { success: true }; }
    case "admin-update": { await assertSuper(admin); const target = required(input, "targetAdminId"); const existing = await first(db, 'SELECT "id", "name", "role" FROM "admins" WHERE "id" = ?', [target]); if (!existing) throw new DataServiceError(404, "관리자를 찾을 수 없습니다"); await write(db, 'UPDATE "admins" SET "name" = COALESCE(?, "name"), "role" = COALESCE(?, "role"), "updatedAt" = ? WHERE "id" = ?', [typeof input.name === "string" ? input.name : null, typeof input.role === "string" ? input.role : null, now(), target]); return first(db, 'SELECT "id", "email", "name", "role", "twoFactorEnabled", "createdAt", "updatedAt" FROM "admins" WHERE "id" = ?', [target]); }
    case "admin-reset-password": { await assertSuper(admin); const target = required(input, "targetAdminId"); await write(db, 'UPDATE "admins" SET "password" = ?, "updatedAt" = ? WHERE "id" = ?', [required(input, "password"), now(), target]); return { success: true }; }
    case "admin-reset-2fa": { await assertSuper(admin); const target = required(input, "targetAdminId"); const existing = await first<Record<string, unknown>>(db, 'SELECT "id", "email" FROM "admins" WHERE "id" = ? LIMIT 1', [target]); if (!existing) throw new DataServiceError(404, "관리자를 찾을 수 없습니다."); await write(db, 'UPDATE "admins" SET "twoFactorSecret" = NULL, "twoFactorEnabled" = 0, "twoFactorSetupToken" = ?, "updatedAt" = ? WHERE "id" = ?', [typeof input.setupToken === "string" ? input.setupToken : null, now(), target]); return { success: true, setupToken: input.setupToken ?? null, email: existing.email }; }
    case "admin-prepare-2fa": { const email = required(input, "email"); const token = required(input, "setupToken"); const target = await first<Record<string, unknown>>(db, 'SELECT "id", "email", "name", "twoFactorSetupToken", "twoFactorEnabled", "twoFactorSecret" FROM "admins" WHERE "email" = ? LIMIT 1', [email]); if (!target || target.twoFactorSetupToken !== token) throw new DataServiceError(400, "유효하지 않은 셋업 링크입니다."); if (target.twoFactorEnabled) throw new DataServiceError(400, "이미 2FA가 설정되어 있습니다."); if (typeof input.secret !== "string" || input.secret.length === 0) return target; await write(db, 'UPDATE "admins" SET "twoFactorSecret" = ?, "updatedAt" = ? WHERE "id" = ? AND "twoFactorSetupToken" = ?', [input.secret, now(), target.id as string, token]); return { ...target, twoFactorSecret: input.secret }; }
    case "admin-setup-2fa": { const target = required(input, "targetAdminId"); const row = await first<Record<string, unknown>>(db, 'SELECT "id", "email", "name", "twoFactorSetupToken", "twoFactorEnabled" FROM "admins" WHERE "id" = ? LIMIT 1', [target]); if (!row || row.twoFactorSetupToken !== input.setupToken) throw new DataServiceError(400, "Invalid setup token"); await write(db, 'UPDATE "admins" SET "twoFactorSecret" = ?, "twoFactorEnabled" = 1, "twoFactorSetupToken" = NULL, "updatedAt" = ? WHERE "id" = ?', [required(input, "secret"), now(), target]); return { ...row, twoFactorEnabled: true }; }
    case "admin-request-review": { await assertSuper(admin); const requestId = required(input, "requestId"); const action = required(input, "action"); const request = await first<Record<string, unknown>>(db, 'SELECT * FROM "admin_requests" WHERE "id" = ? LIMIT 1', [requestId]); if (!request) throw new DataServiceError(404, "가입 신청을 찾을 수 없습니다."); if (request.status !== "pending") throw new DataServiceError(400, "이미 처리된 신청입니다."); const timestamp = now(); if (action === "reject") { const reason = required(input, "rejectReason"); const result = await db.prepare('UPDATE "admin_requests" SET "status" = ?, "reviewedBy" = ?, "reviewedAt" = ?, "rejectReason" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ?').bind("rejected", adminId, timestamp, reason, timestamp, requestId, "pending").all(); if (!result.success) throw new DataServiceError(503, "Service unavailable"); if ((result.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "이미 처리된 신청입니다."); return { action, email: request.email }; } if (action !== "approve") throw new DataServiceError(400, "잘못된 작업입니다."); const role = typeof input.assignedRole === "string" ? input.assignedRole : "operator"; if (!ADMIN_ROLES.has(role)) throw new DataServiceError(400, "잘못된 권한입니다."); const setupToken = required(input, "setupToken"); const result = await db.batch([db.prepare('UPDATE "admin_requests" SET "status" = ?, "reviewedBy" = ?, "reviewedAt" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ?').bind("approved", adminId, timestamp, timestamp, requestId, "pending"), db.prepare('INSERT INTO "admins" ("id", "email", "password", "name", "role", "twoFactorSetupToken", "createdAt", "updatedAt") SELECT ?, "email", "password", "name", ?, ?, ?, ? FROM "admin_requests" WHERE "id" = ? AND "status" = ? AND "reviewedBy" = ? AND "reviewedAt" = ?').bind(id(), role, setupToken, timestamp, timestamp, requestId, "approved", adminId, timestamp)]); if (!result[0]?.success || !result[1]?.success) throw new DataServiceError(503, "Service unavailable"); if ((result[0]?.meta.changes ?? 0) !== 1 || (result[1]?.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "이미 처리된 신청입니다."); return { action, email: request.email, setupToken }; }
    case "admin-request-create": { const email = required(input, "email"); const existingAdmin = await first(db, 'SELECT "id" FROM "admins" WHERE "email" = ? LIMIT 1', [email]); if (existingAdmin) throw new DataServiceError(409, "이미 등록된 관리자 이메일입니다."); const existingRequest = await first<Record<string, unknown>>(db, 'SELECT "status", "rejectReason" FROM "admin_requests" WHERE "email" = ? LIMIT 1', [email]); if (existingRequest?.status === "pending") throw new DataServiceError(409, "이미 가입 신청이 처리 대기 중입니다."); if (existingRequest?.status === "rejected") throw new DataServiceError(403, `가입 신청이 거부되었습니다. 사유: ${String(existingRequest.rejectReason || "관리자 검토")}`); const requestId = id(); await write(db, 'INSERT INTO "admin_requests" ("id", "email", "password", "name", "phone", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [requestId, email, required(input, "password"), required(input, "name"), required(input, "phone"), "pending", now(), now()]); return { id: requestId, status: "pending" }; }
    case "submission-admin-get": return first(db, 'SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1', [required(input, "userId")]);
    case "user-delete-assets": { const userId = required(input, "userId"); const submission = await first<Record<string, unknown>>(db, 'SELECT "사업자등록증URL", "프로필사진URL", "로고URL", "대표자신분증URL", "통신서비스이용증명원URL", "신용카드앞면URL", "로고예시디자인URL" FROM "submissions" WHERE "userId" = ? LIMIT 1', [userId]); const histories = await all<Record<string, unknown>>(db, 'SELECT "fileUrl" FROM "design_history" h INNER JOIN "workflows" w ON w."id" = h."workflowId" WHERE w."userId" = ?', [userId]); const urls = [...Object.values(submission ?? {}).filter((v): v is string => typeof v === "string"), ...histories.map((row) => row.fileUrl).filter((v): v is string => typeof v === "string")]; return { userId, fileUrls: urls }; }
    case "ad-automation-get": { const userId = required(input, "userId"); const user = await first(db, 'SELECT "id", "이름", "email", "연락처", "adAutomationEnabled", "adAutomationStartDate", "adAutomationEndDate" FROM "users" WHERE "id" = ? LIMIT 1', [userId]); if (!user) throw new DataServiceError(404, "사용자를 찾을 수 없습니다"); const history = await all(db, 'SELECT * FROM "ad_automation_history" WHERE "userId" = ? ORDER BY "createdAt" DESC, "id" DESC LIMIT 100', [userId]); const payments = await all(db, 'SELECT * FROM "ad_automation_payments" WHERE "userId" = ? ORDER BY "paymentDate" DESC, "id" DESC LIMIT 100', [userId]); return { user, history, payments }; }
    case "ad-automation-toggle": { const userId = required(input, "userId"); const enabled = bool(input.enabled); const timestamp = now(); const user = await first<Record<string, unknown>>(db, 'SELECT "id", "이름", "marketingSupportEndDate" FROM "users" WHERE "id" = ? LIMIT 1', [userId]); if (!user) throw new DataServiceError(404, "사용자를 찾을 수 없습니다"); const endDate = enabled ? value(input.endDate ?? user.marketingSupportEndDate) : null; const startDate = enabled ? value(input.startDate ?? timestamp) : null; const result = await db.batch([db.prepare('UPDATE "users" SET "adAutomationEnabled" = ?, "adAutomationStartDate" = ?, "adAutomationEndDate" = ?, "updatedAt" = ? WHERE "id" = ?').bind(enabled, startDate, endDate, timestamp, userId), db.prepare('INSERT INTO "ad_automation_history" ("id", "userId", "action", "actionBy", "actionByName", "reason", "startDate", "endDate", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id(), userId, enabled ? "enabled" : "disabled", adminId, String(admin.name ?? "관리자"), typeof input.reason === "string" ? input.reason : null, startDate, endDate, timestamp)]); if (!result[0]?.success || !result[1]?.success) throw new DataServiceError(503, "Service unavailable"); return { success: true, enabled: Boolean(enabled), startDate, endDate }; }
    case "ad-automation-settings": { const userId = required(input, "userId"); const timestamp = now(); const user = await first<Record<string, unknown>>(db, 'SELECT "id", "이름" FROM "users" WHERE "id" = ? LIMIT 1', [userId]); if (!user) throw new DataServiceError(404, "사용자를 찾을 수 없습니다"); const enabled = bool(input.adAutomationEnabled ?? input.enabled); const startDate = value(input.adAutomationStartDate ?? input.startDate); const endDate = value(input.adAutomationEndDate ?? input.endDate); const smsEnabled = bool(input.smsSettingEnabled); const smsStart = value(input.smsSettingStartDate); const smsEnd = value(input.smsSettingEndDate); const naverEnabled = bool(input.naverAdSettingEnabled); const naverStart = value(input.naverAdSettingStartDate); const naverEnd = value(input.naverAdSettingEndDate); const homepageCompleted = bool(input.homepageCompleted); const homepageAt = value(input.homepageCompletedAt); const result = await db.batch([db.prepare('UPDATE "users" SET "adAutomationEnabled" = ?, "adAutomationStartDate" = ?, "adAutomationEndDate" = ?, "smsSettingEnabled" = ?, "smsSettingStartDate" = ?, "smsSettingEndDate" = ?, "naverAdSettingEnabled" = ?, "naverAdSettingStartDate" = ?, "naverAdSettingEndDate" = ?, "homepageCompleted" = ?, "homepageCompletedAt" = ?, "updatedAt" = ? WHERE "id" = ?').bind(enabled, startDate, endDate, smsEnabled, smsStart, smsEnd, naverEnabled, naverStart, naverEnd, homepageCompleted, homepageAt, timestamp, userId), db.prepare('INSERT INTO "ad_automation_history" ("id", "userId", "action", "actionBy", "actionByName", "reason", "startDate", "endDate", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id(), userId, "settings_updated", adminId, String(admin.name ?? "관리자"), typeof input.reason === "string" ? input.reason : null, startDate, endDate, timestamp)]); if (!result[0]?.success || !result[1]?.success) throw new DataServiceError(503, "Service unavailable"); if (homepageCompleted) { const workflow = await first<Record<string, unknown>>(db, 'SELECT "id" FROM "workflows" WHERE "userId" = ? AND "type" = ? ORDER BY "createdAt" DESC, "id" DESC LIMIT 1', [userId, "홈페이지"]); if (workflow) await write(db, 'UPDATE "workflows" SET "status" = ?, "updatedAt" = ? WHERE "id" = ?', ["제작 완료", timestamp, workflow.id as string]); else await write(db, 'INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)', [id(), userId, "홈페이지", "제작 완료", timestamp, timestamp]); } return { adAutomationEnabled: Boolean(enabled), smsSettingEnabled: Boolean(smsEnabled), naverAdSettingEnabled: Boolean(naverEnabled), homepageCompleted: Boolean(homepageCompleted), startDate, endDate }; }
    case "ad-automation-payment": { const userId = required(input, "userId"); const timestamp = now(); const user = await first<Record<string, unknown>>(db, 'SELECT "id", "adAutomationEndDate" FROM "users" WHERE "id" = ? LIMIT 1', [userId]); if (!user) throw new DataServiceError(404, "사용자를 찾을 수 없습니다"); const paymentDate = Number(input.paymentDate); if (!Number.isFinite(paymentDate)) throw new DataServiceError(400, "paymentDate is required"); const serviceStartDate = paymentDate; const candidateEnd = new Date(paymentDate); candidateEnd.setMonth(candidateEnd.getMonth() + 1); const serviceEndDate = candidateEnd.getTime(); const currentEndDate = typeof user.adAutomationEndDate === "number" ? user.adAutomationEndDate : null; const effectiveEndDate = currentEndDate && currentEndDate > serviceEndDate ? currentEndDate : serviceEndDate; const paymentId = id(); const result = await db.batch([db.prepare('INSERT INTO "ad_automation_payments" ("id", "userId", "paymentDate", "paymentAmount", "paymentMethod", "receiptUrl", "serviceStartDate", "serviceEndDate", "status", "memo", "registeredBy", "registeredByName", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(paymentId, userId, paymentDate, Number(input.paymentAmount), required(input, "paymentMethod"), typeof input.receiptUrl === "string" ? input.receiptUrl : null, serviceStartDate, serviceEndDate, typeof input.status === "string" ? input.status : "completed", typeof input.memo === "string" ? input.memo : null, adminId, String(admin.name ?? "관리자"), timestamp, timestamp), db.prepare('UPDATE "users" SET "adAutomationEnabled" = 1, "adAutomationStartDate" = ?, "adAutomationEndDate" = ?, "updatedAt" = ? WHERE "id" = ?').bind(serviceStartDate, effectiveEndDate, timestamp, userId)]); if (!result[0]?.success || !result[1]?.success) throw new DataServiceError(503, "Service unavailable"); return { success: true, paymentId, payment: { id: paymentId }, serviceStartDate, serviceEndDate }; }
    default: throw new DataServiceError(404, "Unknown admin operation");
  }
}
