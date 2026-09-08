import { DataServiceError, type Database, type SqlValue } from "../database";

export type AdminNotificationOperation =
  | "user-design-data"
  | "shipping-data"
  | "order-complete-data"
  | "workflow-design-data"
  | "grouped-design-data"
  | "all-design-data"
  | "message-user"
  | "notification-create"
  | "notification-update";

type Input = Record<string, unknown>;

function required(input: Input, key: string, maxLength = 128): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new DataServiceError(400, `${key} is required`);
  }
  return value;
}

function listIds(input: Input, key: string, max = 50): string[] {
  const value = input[key];
  if (!Array.isArray(value) || value.length === 0 || value.length > max || value.some((item) => typeof item !== "string" || item.length === 0 || item.length > 128)) {
    throw new DataServiceError(400, `${key} is invalid`);
  }
  return [...new Set(value)];
}

async function first<T>(db: Database, sql: string, values: SqlValue[]): Promise<T | null> {
  return db.prepare(sql).bind(...values).first<T>();
}

async function assertAdmin(db: Database, adminId: string): Promise<void> {
  const admin = await first<{ role: string }>(db, 'SELECT "role" FROM "admins" WHERE "id" = ? LIMIT 1', [adminId]);
  if (!admin || !["super", "designer", "operator"].includes(admin.role)) throw new DataServiceError(403, "Forbidden");
}

async function all<T>(db: Database, sql: string, values: SqlValue[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  if (!result.success) throw new DataServiceError(503, "Notification lookup failed");
  return result.results;
}

function normalizeUser(row: Record<string, unknown> | null) {
  if (!row) throw new DataServiceError(404, "사용자를 찾을 수 없습니다.");
  return row;
}

export async function adminNotificationOperation(
  db: Database,
  operation: AdminNotificationOperation | string,
  input: Input,
): Promise<unknown> {
  const adminId = required(input, "adminId");
  await assertAdmin(db, adminId);
  switch (operation) {
    case "user-design-data": {
      const userId = required(input, "userId");
      const user = normalizeUser(await first<Record<string, unknown>>(db, 'SELECT "id", "이름", "연락처", "email", "telegramChatId" FROM "users" WHERE "id" = ? LIMIT 1', [userId]));
      const workflows = await all<Record<string, unknown>>(db, 'SELECT "id", "type", "시안URL", "userId" FROM "workflows" WHERE "userId" = ? AND "시안URL" IS NOT NULL ORDER BY "createdAt" DESC, "id" DESC LIMIT 51', [userId]);
      if (workflows.length > 50) throw new DataServiceError(400, "Too many workflows to send");
      return { user, workflows };
    }
    case "shipping-data": {
      const userId = required(input, "userId");
      const rows = await all<Record<string, unknown>>(db, 'SELECT w."id", w."userId", w."type", w."택배회사", w."운송장번호", u."이름", u."연락처" FROM "workflows" w INNER JOIN "users" u ON u."id" = w."userId" WHERE w."userId" = ? AND w."택배회사" IS NOT NULL AND w."운송장번호" IS NOT NULL ORDER BY w."createdAt" DESC, w."id" DESC LIMIT 51', [userId]);
      if (rows.length > 50) throw new DataServiceError(400, "Too many workflows to send");
      return { user: normalizeUser(rows[0] ? { 이름: rows[0].이름, 연락처: rows[0].연락처 } : null), workflows: rows };
    }
    case "order-complete-data": {
      const userId = required(input, "userId");
      const user = normalizeUser(await first<Record<string, unknown>>(db, 'SELECT "id", "이름", "연락처", "email" FROM "users" WHERE "id" = ? LIMIT 1', [userId]));
      const workflows = await all<Record<string, unknown>>(db, 'SELECT "id", "userId", "type", "status", "확정배송지", "확정수령인" FROM "workflows" WHERE "userId" = ? AND "status" = ? ORDER BY "createdAt" DESC, "id" DESC LIMIT 51', [userId, "발주완료"]);
      const submission = await first<Record<string, unknown>>(db, 'SELECT "인쇄물받을주소", "받는분이름", "수령연락처", "우편번호", "주소" FROM "submissions" WHERE "userId" = ? LIMIT 1', [userId]);
      if (workflows.length > 50) throw new DataServiceError(400, "Too many workflows to send");
      return { user, workflows, submission };
    }
    case "workflow-design-data": {
      const workflowId = required(input, "workflowId");
      const row = await first<Record<string, unknown>>(db, 'SELECT w."id", w."userId", w."type", w."시안URL", u."이름", u."연락처", u."telegramChatId" FROM "workflows" w INNER JOIN "users" u ON u."id" = w."userId" WHERE w."id" = ? LIMIT 1', [workflowId]);
      if (!row) throw new DataServiceError(404, "워크플로우를 찾을 수 없습니다.");
      return { workflow: row };
    }
    case "grouped-design-data":
    case "all-design-data": {
      const workflowIds = listIds(input, "workflowIds", 200);
      const userId = operation === "grouped-design-data" ? required(input, "userId") : undefined;
      const user = userId ? normalizeUser(await first<Record<string, unknown>>(db, 'SELECT "id", "이름", "연락처" FROM "users" WHERE "id" = ? LIMIT 1', [userId])) : undefined;
      const workflows: Record<string, unknown>[] = [];
      for (let offset = 0; offset < workflowIds.length; offset += 50) {
        const ids = workflowIds.slice(offset, offset + 50);
        const placeholders = ids.map(() => "?").join(",");
        workflows.push(...await all<Record<string, unknown>>(db, `SELECT w."id", w."userId", w."type", w."시안URL", u."이름", u."연락처", u."telegramChatId" FROM "workflows" w INNER JOIN "users" u ON u."id" = w."userId" WHERE w."id" IN (${placeholders}) AND w."시안URL" IS NOT NULL ${userId ? 'AND w."userId" = ?' : ''} LIMIT 50`, userId ? [...ids, userId] : ids));
      }
      return user ? { user, workflows } : { workflows };
    }
    case "message-user": {
      const userId = required(input, "userId");
      return normalizeUser(await first<Record<string, unknown>>(db, 'SELECT "id", "이름", "연락처", "email", "SMS수신동의", "이메일수신동의" FROM "users" WHERE "id" = ? LIMIT 1', [userId]));
    }
    case "notification-create": {
      const userId = required(input, "userId");
      const channel = required(input, "channel");
      const title = required(input, "title", 512);
      const message = required(input, "message", 32_000);
      const id = crypto.randomUUID();
      const now = Date.now();
      const metadata = typeof input.metadata === "string" ? input.metadata : null;
      const result = await db.prepare('INSERT INTO "notifications" ("id", "userId", "type", "channel", "title", "message", "status", "sentBy", "sentByName", "metadata", "sentAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, userId, required(input, "type"), channel, title, message, typeof input.status === "string" ? input.status : "전송중", typeof input.sentBy === "string" ? input.sentBy : null, typeof input.sentByName === "string" ? input.sentByName : null, metadata, now, now).all();
      if (!result.success) throw new DataServiceError(503, "Notification create failed");
      return { id, sentAt: now };
    }
    case "notification-update": {
      const id = required(input, "notificationId");
      const status = required(input, "status");
      const errorMessage = typeof input.errorMessage === "string" ? input.errorMessage.slice(0, 500) : null;
      const result = await db.prepare('UPDATE "notifications" SET "status" = ?, "errorMessage" = ? WHERE "id" = ?').bind(status, errorMessage, id).all();
      if (!result.success) throw new DataServiceError(503, "Notification update failed");
      return { id, status };
    }
    default:
      throw new DataServiceError(404, "Unknown notification operation");
  }
}
