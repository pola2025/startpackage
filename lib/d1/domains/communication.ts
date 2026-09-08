import { DataServiceError, type Database, type SqlValue } from "../database";
import {
  buildCommunicationMessageListQuery,
  buildCommunicationThreadListQuery,
  pageCommunicationMessages,
  pageCommunicationThreads,
  type CommunicationMessageRow,
  type CommunicationThreadRow,
} from "../queries";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";
import { createDesignThread } from "../commands/create-design-thread";

type Input = Record<string, unknown> & { userId?: string; adminId?: string };
type Row = Record<string, unknown>;

const ADMIN_ROLES = new Set(["super", "designer", "operator"]);
const now = () => Date.now();
const id = () => crypto.randomUUID();

function required(input: Input, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new DataServiceError(400, `${key} is required`);
  return value.trim();
}

function listSize(input: Input): unknown { return input.pageSize ?? 20; }
function attachments(value: unknown): string { return JSON.stringify(Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []); }
function parseRow(row: Row): Row {
  const result = { ...row };
  for (const key of ["attachments"]) {
    if (typeof result[key] === "string") {
      try { result[key] = JSON.parse(result[key] as string); } catch { result[key] = []; }
    }
  }
  for (const key of ["isReadByUser", "isReadByAdmin"]) if (key in result) result[key] = Boolean(result[key]);
  return result;
}
const DATE_FIELDS = new Set(["expectedCompletionDate", "lastReplyAt", "createdAt", "updatedAt", "readByUserAt", "readByAdminAt"]);
function communicationDto(row: Row | null): Row | null {
  if (!row) return null;
  const result = parseRow(row);
  for (const key of DATE_FIELDS) {
    if (typeof result[key] === "number" && Number.isFinite(result[key])) result[key] = new Date(result[key] as number).toISOString();
  }
  return result;
}
function pageDto<T extends Row>(page: { items: T[]; nextCursor?: string }): { items: Row[]; nextCursor?: string } {
  return { ...page, items: page.items.map((row) => communicationDto(row) as Row) };
}
function displayName(row: Row, fallback: string): string { return typeof row.name === "string" && row.name.trim() ? row.name : fallback; }
async function all<T extends Row = Row>(db: Database, sql: string, params: SqlValue[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return result.results.map(parseRow) as T[];
}
async function first(db: Database, sql: string, params: SqlValue[]): Promise<Row | null> {
  return db.prepare(sql).bind(...params).first<Row>();
}
async function assertUser(db: Database, userId: string): Promise<Row> {
  const user = await first(db, 'SELECT "id", "이름" AS "name", "email" FROM "users" WHERE "id" = ? LIMIT 1', [userId]);
  if (!user) throw new DataServiceError(403, "Forbidden");
  return user;
}
async function assertAdmin(db: Database, adminId: string): Promise<Row> {
  const admin = await first(db, 'SELECT "id", "name", "role" FROM "admins" WHERE "id" = ? LIMIT 1', [adminId]);
  if (!admin || typeof admin.role !== "string" || !ADMIN_ROLES.has(admin.role)) throw new DataServiceError(403, "Forbidden");
  return admin;
}
async function assertOwnedThread(db: Database, threadId: string, userId: string): Promise<Row> {
  const thread = await first(db, 'SELECT * FROM "communication_threads" WHERE "id" = ? AND "userId" = ? LIMIT 1', [threadId, userId]);
  if (!thread) throw new DataServiceError(404, "Thread not found");
  return thread;
}
async function getThread(db: Database, threadId: string): Promise<Row> {
  const thread = await first(db, 'SELECT * FROM "communication_threads" WHERE "id" = ? LIMIT 1', [threadId]);
  if (!thread) throw new DataServiceError(404, "Thread not found");
  return thread;
}

export async function communicationOperation(db: Database, operation: string, input: Input): Promise<unknown> {
  const userId = typeof input.userId === "string" ? input.userId : undefined;
  const adminId = typeof input.adminId === "string" ? input.adminId : undefined;
  if (operation === "user-threads") {
    if (!userId) throw new DataServiceError(400, "userId is required"); await assertUser(db, userId);
    const query = buildCommunicationThreadListQuery({ userId, pageSize: listSize(input), cursor: typeof input.cursor === "string" ? input.cursor : undefined, cursorSecret: requiredSecret(input) });
    const rows = await all<CommunicationThreadRow>(db, query.sql, query.params); const page = pageCommunicationThreads(rows, listSize(input), requiredSecret(input), userId); return { ...pageDto(page), items: pageDto(page).items.map((item) => ({ ...item, _count: { messages: Number(item.messageCount ?? 0) } })) };
  }
  if (operation === "user-messages") {
    if (!userId) throw new DataServiceError(400, "userId is required"); const threadId = required(input, "threadId"); await assertUser(db, userId); await assertOwnedThread(db, threadId, userId);
    const query = buildCommunicationMessageListQuery({ threadId, pageSize: listSize(input), cursor: typeof input.cursor === "string" ? input.cursor : undefined, cursorSecret: requiredSecret(input) });
    const rows = await all<CommunicationMessageRow>(db, query.sql, query.params); return pageDto(pageCommunicationMessages(rows, listSize(input), requiredSecret(input), threadId));
  }
  if (operation === "user-thread") {
    if (!userId) throw new DataServiceError(400, "userId is required"); const threadId = required(input, "threadId"); await assertUser(db, userId); const thread = await assertOwnedThread(db, threadId, userId);
    const query = buildCommunicationMessageListQuery({ threadId, pageSize: listSize(input), cursor: typeof input.cursor === "string" ? input.cursor : undefined, cursorSecret: requiredSecret(input) });
    const rows = await all<CommunicationMessageRow>(db, query.sql, query.params);
    return { ...communicationDto(thread), messages: pageDto(pageCommunicationMessages(rows, listSize(input), requiredSecret(input), threadId)) };
  }
  if (operation === "user-create-thread") {
    if (!userId) throw new DataServiceError(400, "userId is required"); const user = await assertUser(db, userId); const title = required(input, "title"); const content = required(input, "content");
    const category = typeof input.category === "string" && input.category.trim() ? input.category.trim() : "일반"; const threadId = id(); const messageId = id(); const systemId = id(); const timestamp = now();
    const systemMessage = "문의가 접수되었습니다.\n\n관리자 확인 후 답변드리겠습니다. 문자/통화 따로 하지 않아도 실시간 전달되고 있습니다.\n\n답변 및 업무 진행은 영업일 기준 1~2일 이내 처리되며, 기간이 더 소요되는 경우 개별 안내드립니다.";
    await db.batch([
      db.prepare('INSERT INTO "communication_threads" ("id", "userId", "title", "category", "status", "lastReplyAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, \'open\', ?, ?, ?)').bind(threadId, userId, title, category, timestamp, timestamp, timestamp),
      db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "createdAt") VALUES (?, ?, ?, \'user\', ?, ?, ?, ?)').bind(messageId, threadId, userId, displayName(user, "사용자"), content, attachments(input.attachments), timestamp),
      db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "isReadByUser", "isReadByAdmin", "createdAt") VALUES (?, ?, \'system\', \'system\', \'시스템\', ?, \'[]\', 1, 0, ?)').bind(systemId, threadId, systemMessage, timestamp),
    ]);
    return { success: true, thread: communicationDto(await getThread(db, threadId)), messages: (await all(db, 'SELECT * FROM "communication_messages" WHERE "threadId" = ? ORDER BY "createdAt", "id"', [threadId])).map((row) => communicationDto(row)) };
  }
  if (operation === "user-create-message") {
    if (!userId) throw new DataServiceError(400, "userId is required"); const threadId = required(input, "threadId"); const user = await assertUser(db, userId); await assertOwnedThread(db, threadId, userId); const content = required(input, "content"); const timestamp = now(); const messageId = id();
    await db.batch([
      db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "createdAt") VALUES (?, ?, ?, \'user\', ?, ?, ?, ?)').bind(messageId, threadId, userId, displayName(user, "사용자"), content, attachments(input.attachments), timestamp),
      db.prepare('UPDATE "communication_threads" SET "lastReplyAt" = ?, "updatedAt" = ? WHERE "id" = ? AND "userId" = ?').bind(timestamp, timestamp, threadId, userId),
    ]); return { success: true, message: communicationDto(await first(db, 'SELECT * FROM "communication_messages" WHERE "id" = ?', [messageId])) };
  }
  if (operation === "user-mark-read") {
    if (!userId) throw new DataServiceError(400, "userId is required"); const threadId = required(input, "threadId"); await assertUser(db, userId); await assertOwnedThread(db, threadId, userId); const timestamp = now(); const result = await db.prepare('UPDATE "communication_messages" SET "isReadByUser" = 1, "readByUserAt" = ? WHERE "threadId" = ? AND "authorType" = \'admin\' AND "isReadByUser" = 0').bind(timestamp, threadId).all(); return { success: true, markedCount: result.meta.changes ?? 0 };
  }
  if (operation === "user-unread-count") {
    if (!userId) throw new DataServiceError(400, "userId is required"); await assertUser(db, userId); const row = await first(db, 'SELECT "unreadCount" FROM "communication_user_counters" WHERE "userId" = ? LIMIT 1', [userId]); const groups = await all(db, 'SELECT "threadId", "unreadByUser" AS "count" FROM "communication_thread_counters" c INNER JOIN "communication_threads" t ON t."id" = c."threadId" WHERE t."userId" = ? AND c."unreadByUser" > 0', [userId]); return { unreadCount: Number(row?.unreadCount ?? 0), threadsWithUnread: groups };
  }
  if (operation === "telegram-reply") {
    const threadId = required(input, "threadId"); const content = required(input, "content"); await getThread(db, threadId); const timestamp = now(); const messageId = id();
    await db.batch([
      db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "createdAt") VALUES (?, ?, \'telegram-admin\', \'admin\', \'관리자\', ?, \'[]\', ?)').bind(messageId, threadId, content, timestamp),
      db.prepare('UPDATE "communication_threads" SET "lastReplyAt" = ?, "status" = \'in_progress\', "updatedAt" = ? WHERE "id" = ?').bind(timestamp, timestamp, threadId),
    ]);
    return { success: true, message: communicationDto(await first(db, 'SELECT * FROM "communication_messages" WHERE "id" = ?', [messageId])) };
  }
  if (operation === "admin-create-design-thread") {
    if (!adminId) throw new DataServiceError(400, "adminId is required");
    const admin = await assertAdmin(db, adminId);
    const result = await createDesignThread(db, { ...input, adminId, adminName: displayName(admin, "관리자"), userId: required(input, "userId"), workflowType: required(input, "workflowType"), message: required(input, "message") });
    return { ...result, workflow: communicationDto(result.workflow as Row | null), designThread: communicationDto(result.designThread as Row | null), message: communicationDto(result.message as Row | null) };
  }
  if (!adminId) throw new DataServiceError(400, "adminId is required"); await assertAdmin(db, adminId);
  if (operation === "admin-create-thread") {
    const targetUserId = required(input, "targetUserId"); const target = await assertUser(db, targetUserId); const title = required(input, "title"); const content = required(input, "content"); const category = typeof input.category === "string" && input.category.trim() ? input.category.trim() : "일반"; const timestamp = now(); const threadId = id(); const messageId = id();
    await db.batch([
      db.prepare('INSERT INTO "communication_threads" ("id", "userId", "title", "category", "status", "lastReplyAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, \'in_progress\', ?, ?, ?)').bind(threadId, targetUserId, title, category, timestamp, timestamp, timestamp),
      db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "expectedCompletionDate", "isReadByAdmin", "createdAt") VALUES (?, ?, ?, \'admin\', ?, ?, ?, ?, 1, ?)').bind(messageId, threadId, adminId, displayName(await first(db, 'SELECT "name" FROM "admins" WHERE "id" = ?', [adminId]) ?? {}, "관리자"), content, attachments(input.attachments), input.expectedCompletionDate ? new Date(String(input.expectedCompletionDate)).getTime() : null, timestamp),
    ]);
    return { success: true, thread: communicationDto(await getThread(db, threadId)), message: communicationDto(await first(db, 'SELECT * FROM "communication_messages" WHERE "id" = ?', [messageId])), targetUser: communicationDto(target) };
  }
  if (operation === "admin-threads") {
    const status = typeof input.status === "string" && input.status !== "all" ? input.status : undefined; const category = typeof input.category === "string" && input.category !== "all" ? input.category : undefined; const scope = `communication-threads:admin:${JSON.stringify([status ?? null, category ?? null])}`; const pageSize = parsePageSize(listSize(input)); const cursor = typeof input.cursor === "string" ? input.cursor : undefined; const params: SqlValue[] = []; const where: string[] = []; if (status) { where.push('t."status" = ?'); params.push(status); } if (category) { where.push('t."category" = ?'); params.push(category); } if (cursor) { const decoded = verifyCursor(requiredSecret(input), cursor, scope, ["lastReplyAt", "id"]); const at = Number(decoded.sort[0]?.value); const cursorId = decoded.sort[1]?.value ?? ""; if (!Number.isSafeInteger(at)) throw new DataServiceError(400, "Invalid cursor"); where.push('(t."lastReplyAt", t."id") < (?, ?)'); params.push(at, cursorId); }
    params.push(pageSize + 1); const rows = await all(db, `SELECT t.*, u."id" AS "userId", u."이름" AS "userName", u."email", u."연락처" AS "phone", c."messageCount", c."unreadByAdmin" AS "unreadCount" FROM "communication_threads" t INNER JOIN "users" u ON u."id" = t."userId" LEFT JOIN "communication_thread_counters" c ON c."threadId" = t."id" ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY t."lastReplyAt" DESC, t."id" DESC LIMIT ?`, params); const items = rows.slice(0, pageSize); const last = rows.length > pageSize ? items[items.length - 1] : undefined; return { items: items.map((row) => communicationDto(row)), ...(last ? { nextCursor: signCursor(requiredSecret(input), { version: 1, scope, sort: [{ field: "lastReplyAt", value: String(last.lastReplyAt) }, { field: "id", value: String(last.id) }] }) } : {}) };
  }
  if (operation === "admin-thread") { const threadId = required(input, "threadId"); const thread = await getThread(db, threadId); const query = buildCommunicationMessageListQuery({ threadId, pageSize: listSize(input), cursor: typeof input.cursor === "string" ? input.cursor : undefined, cursorSecret: requiredSecret(input) }); const rows = await all<CommunicationMessageRow>(db, query.sql, query.params); return { ...communicationDto(thread), user: communicationDto(await first(db, 'SELECT "id", "이름" AS "name", "email", "연락처" AS "phone" FROM "users" WHERE "id" = ?', [thread.userId as string])), messages: pageDto(pageCommunicationMessages(rows, listSize(input), requiredSecret(input), threadId)) }; }
  if (operation === "admin-reply") { const threadId = required(input, "threadId"); const admin = await assertAdmin(db, adminId); await getThread(db, threadId); const content = required(input, "content"); const timestamp = now(); const messageId = id(); await db.batch([db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "expectedCompletionDate", "createdAt") VALUES (?, ?, ?, \'admin\', ?, ?, ?, ?, ?)').bind(messageId, threadId, adminId, displayName(admin, "관리자"), content, attachments(input.attachments), input.expectedCompletionDate ? new Date(String(input.expectedCompletionDate)).getTime() : null, timestamp), db.prepare('UPDATE "communication_threads" SET "lastReplyAt" = ?, "status" = \'in_progress\', "updatedAt" = ? WHERE "id" = ?').bind(timestamp, timestamp, threadId)]); return { success: true, message: communicationDto(await first(db, 'SELECT * FROM "communication_messages" WHERE "id" = ?', [messageId])) }; }
  if (operation === "admin-mark-read") { const threadId = required(input, "threadId"); await getThread(db, threadId); const result = await db.prepare('UPDATE "communication_messages" SET "isReadByAdmin" = 1, "readByAdminAt" = ? WHERE "threadId" = ? AND "authorType" = \'user\' AND "isReadByAdmin" = 0').bind(now(), threadId).all(); return { success: true, markedCount: result.meta.changes ?? 0 }; }
  if (operation === "admin-update-thread") { const threadId = required(input, "threadId"); await getThread(db, threadId); const status = required(input, "status"); if (!["open", "in_progress", "resolved"].includes(status)) throw new DataServiceError(400, "Invalid status"); await db.prepare('UPDATE "communication_threads" SET "status" = ?, "updatedAt" = ? WHERE "id" = ?').bind(status, now(), threadId).all(); await db.prepare('UPDATE "communication_messages" SET "isReadByAdmin" = 1, "readByAdminAt" = ? WHERE "threadId" = ? AND "authorType" = \'user\' AND "isReadByAdmin" = 0').bind(now(), threadId).all(); return { success: true, thread: communicationDto(await getThread(db, threadId)) }; }
  if (operation === "admin-delete-thread") { const threadId = required(input, "threadId"); await getThread(db, threadId); await db.prepare('DELETE FROM "communication_threads" WHERE "id" = ?').bind(threadId).all(); return { success: true }; }
  if (operation === "admin-unread-count") { const row = await first(db, 'SELECT "unreadByAdmin" AS "unreadCount" FROM "communication_global_counters" WHERE "id" = 1', []); return { unreadCount: Number(row?.unreadCount ?? 0) }; }
  throw new DataServiceError(404, "Unknown communication operation");
}

function requiredSecret(input?: Input): string {
  const candidate = input?.cursorSecret;
  const secret = typeof candidate === "string" ? candidate : process.env.D1_CURSOR_SECRET;
  if (!secret || secret.length < 32) throw new DataServiceError(503, "Service unavailable");
  return secret;
}
