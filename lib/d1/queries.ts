import { parsePageSize, signCursor, verifyCursor, type ReadCursor } from "./read-policy";

export type D1Query = { sql: string; params: Array<string | number> };
type D1Time = number | string | Date;
export type CommunicationThreadRow = { id: string; lastReplyAt: D1Time; messageCount?: number };
export type CommunicationMessageRow = { id: string; createdAt: D1Time };
type Page<T> = { items: T[]; nextCursor?: string };

function epoch(value: D1Time): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("invalid cursor time");
    return String(value);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid cursor time");
  return String(parsed.getTime());
}

function cursorValue(cursor: ReadCursor, index: number): string {
  return cursor.sort[index]?.value ?? "";
}

export function buildCommunicationThreadListQuery(input: { userId: string; pageSize?: unknown; cursor?: string; cursorSecret: string }): D1Query {
  const pageSize = parsePageSize(input.pageSize);
  if (!input.userId) throw new Error("userId is required");
  const scope = `communication-threads:user:${input.userId}`;
  const params: Array<string | number> = [input.userId];
  let continuation = "";
  if (input.cursor) {
    const cursor = verifyCursor(input.cursorSecret, input.cursor, scope, ["lastReplyAt", "id"]);
    const lastReplyAt = Number(cursorValue(cursor, 0));
    const id = cursorValue(cursor, 1);
    if (!Number.isSafeInteger(lastReplyAt)) throw new Error("invalid cursor time");
    continuation = ' AND ("lastReplyAt", "id") < (?, ?)';
    params.push(lastReplyAt, id);
  }
  params.push(pageSize + 1);
  return {
    sql: `SELECT t."id", t."userId", t."title", t."category", t."status", t."expectedCompletionDate", t."lastReplyAt", t."createdAt", t."updatedAt", COALESCE(c."messageCount", 0) AS "messageCount"
FROM "communication_threads" t LEFT JOIN "communication_thread_counters" c ON c."threadId" = t."id"
WHERE t."userId" = ?${continuation}
ORDER BY "lastReplyAt" DESC, "id" DESC
LIMIT ?`,
    params,
  };
}

export function pageCommunicationThreads(rows: CommunicationThreadRow[], pageSize: unknown, cursorSecret: string, userId: string): Page<CommunicationThreadRow> {
  const size = parsePageSize(pageSize);
  const items = rows.slice(0, size);
  const last = rows.length > size ? items[items.length - 1] : undefined;
  return {
    items,
    ...(last ? { nextCursor: signCursor(cursorSecret, { version: 1, scope: `communication-threads:user:${userId}`, sort: [{ field: "lastReplyAt", value: epoch(last.lastReplyAt) }, { field: "id", value: last.id }] }) } : {}),
  };
}

export function buildCommunicationMessageListQuery(input: { threadId: string; pageSize?: unknown; cursor?: string; cursorSecret: string }): D1Query {
  const pageSize = parsePageSize(input.pageSize);
  if (!input.threadId) throw new Error("threadId is required");
  const scope = `communication-messages:thread:${input.threadId}`;
  const params: Array<string | number> = [input.threadId];
  let continuation = "";
  if (input.cursor) {
    const cursor = verifyCursor(input.cursorSecret, input.cursor, scope, ["createdAt", "id"]);
    const createdAt = Number(cursorValue(cursor, 0));
    const id = cursorValue(cursor, 1);
    if (!Number.isSafeInteger(createdAt)) throw new Error("invalid cursor time");
    continuation = ' AND ("createdAt", "id") < (?, ?)';
    params.push(createdAt, id);
  }
  params.push(pageSize + 1);
  return {
    sql: `SELECT "id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "expectedCompletionDate", "isReadByUser", "readByUserAt", "isReadByAdmin", "readByAdminAt", "createdAt"
FROM "communication_messages"
WHERE "threadId" = ?${continuation}
ORDER BY "createdAt" DESC, "id" DESC
LIMIT ?`,
    params,
  };
}

export function pageCommunicationMessages(rows: CommunicationMessageRow[], pageSize: unknown, cursorSecret: string, threadId: string): Page<CommunicationMessageRow> {
  const size = parsePageSize(pageSize);
  const items = rows.slice(0, size);
  const last = rows.length > size ? items[items.length - 1] : undefined;
  return {
    items,
    ...(last ? { nextCursor: signCursor(cursorSecret, { version: 1, scope: `communication-messages:thread:${threadId}`, sort: [{ field: "createdAt", value: epoch(last.createdAt) }, { field: "id", value: last.id }] }) } : {}),
  };
}
