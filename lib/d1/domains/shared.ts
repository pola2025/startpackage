import { DataServiceError, type Database, type SqlValue } from "../database";
import { decodeRow } from "../row-codec";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";

export type SharedOperation =
  | "notification-list"
  | "notification-create"
  | "notification-update"
  | "profile-user"
  | "notification-user-context"
  | "user-slack-channel-update"
  | "password-reset-start"
  | "dashboard-context"
  | "scheduled-notification-page"
  | "scheduled-notification-deliveries"
  | "scheduled-notification-delivery"
  | "scheduled-notification-register"
  | "scheduled-notification-incomplete"
  | "scheduled-notification-claim"
  | "scheduled-notification-release"
  | "scheduled-notification-advance";

export type SharedInput = Record<string, unknown>;
type Row = Record<string, unknown>;

const identifier = /^[A-Za-z0-9_-]{1,128}$/;
const notificationStatuses = new Set(["전송중", "성공", "실패"]);
const notificationChannels = new Set(["SMS", "EMAIL"]);

function requiredString(input: SharedInput, key: string, max = 256): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new DataServiceError(400, `${key} is required`);
  }
  return value.trim();
}

function safeId(input: SharedInput, key: string): string {
  const value = requiredString(input, key, 128);
  if (!identifier.test(value)) throw new DataServiceError(400, `Invalid ${key}`);
  return value;
}

function now(input: SharedInput): number {
  return typeof input.now === "number" && Number.isSafeInteger(input.now)
    ? input.now
    : Date.now();
}

function secret(input: SharedInput): string {
  const value = typeof input.cursorSecret === "string"
    ? input.cursorSecret
    : process.env.D1_CURSOR_SECRET;
  if (!value || value.length < 32) throw new DataServiceError(503, "Service unavailable");
  return value;
}

function json(value: unknown, key: string): string | null {
  if (value === undefined || value === null) return null;
  try {
    const encoded = JSON.stringify(value);
    if (encoded.length > 64 * 1024) throw new Error("too large");
    return encoded;
  } catch {
    throw new DataServiceError(400, `Invalid ${key}`);
  }
}

async function first<T extends Row = Row>(db: Database, sql: string, values: SqlValue[] = []): Promise<T | null> {
  return db.prepare(sql).bind(...values).first<T>();
}

async function all<T extends Row = Row>(db: Database, sql: string, values: SqlValue[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return result.results;
}

async function write(db: Database, sql: string, values: SqlValue[] = []): Promise<void> {
  const result = await db.prepare(sql).bind(...values).all();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
}

async function assertAdmin(db: Database, adminId: string): Promise<void> {
  const admin = await first(db, 'SELECT "id", "role" FROM "admins" WHERE "id" = ? LIMIT 1', [adminId]);
  if (!admin || !["super", "designer", "operator"].includes(String(admin.role))) {
    throw new DataServiceError(403, "Forbidden");
  }
}

async function listNotifications(db: Database, input: SharedInput): Promise<unknown> {
  const userId = typeof input.userId === "string" ? input.userId : undefined;
  if (!userId) {
    const adminId = safeId(input, "adminId");
    await assertAdmin(db, adminId);
  }
  const pageSize = parsePageSize(input.pageSize);
  const cursorSecret = secret(input);
  const scope = `shared-notifications:${userId ?? "admin"}`;
  const values: SqlValue[] = userId ? [userId] : [];
  let where = userId ? 'WHERE "userId" = ?' : "";
  if (typeof input.cursor === "string" && input.cursor) {
    const cursor = verifyCursor(cursorSecret, input.cursor, scope, ["createdAt", "id"]);
    const createdAt = Number(cursor.sort[0]?.value);
    const id = String(cursor.sort[1]?.value ?? "");
    if (!Number.isSafeInteger(createdAt) || !identifier.test(id)) {
      throw new DataServiceError(400, "Invalid cursor");
    }
    where += `${where ? " AND" : "WHERE"} ("createdAt", "id") < (?, ?)`;
    values.push(createdAt, id);
  }
  values.push(pageSize + 1);
  const rows = await all(db, `SELECT * FROM "notifications" ${where} ORDER BY "createdAt" DESC, "id" DESC LIMIT ?`, values);
  const items = rows.slice(0, pageSize).map((row) => decodeRow("notifications", row));
  const last = rows.length > pageSize ? rows[pageSize - 1] : undefined;
  return {
    items,
    ...(last ? {
      nextCursor: signCursor(cursorSecret, {
        version: 1,
        scope,
        sort: [
          { field: "createdAt", value: String(last.createdAt) },
          { field: "id", value: String(last.id) },
        ],
      }),
    } : {}),
  };
}

async function createNotification(db: Database, input: SharedInput): Promise<unknown> {
  const userId = safeId(input, "userId");
  const type = requiredString(input, "type", 128);
  const channel = requiredString(input, "channel", 32);
  if (!notificationChannels.has(channel)) throw new DataServiceError(400, "Invalid channel");
  const status = typeof input.status === "string" ? input.status : "전송중";
  if (!notificationStatuses.has(status)) throw new DataServiceError(400, "Invalid status");
  const notificationId = typeof input.id === "string" && identifier.test(input.id)
    ? input.id
    : crypto.randomUUID();
  const timestamp = now(input);
  await write(db, `INSERT INTO "notifications"
    ("id", "userId", "type", "channel", "title", "message", "status", "errorMessage", "sentBy", "sentByName", "metadata", "sentAt", "createdAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    notificationId,
    userId,
    type,
    channel,
    requiredString(input, "title", 512),
    requiredString(input, "message", 32_000),
    status,
    typeof input.errorMessage === "string" ? input.errorMessage.slice(0, 4_000) : null,
    typeof input.sentBy === "string" ? input.sentBy.slice(0, 128) : null,
    typeof input.sentByName === "string" ? input.sentByName.slice(0, 256) : null,
    json(input.metadata, "metadata"),
    timestamp,
    timestamp,
  ]);
  return decodeRow("notifications", (await first(db, 'SELECT * FROM "notifications" WHERE "id" = ? LIMIT 1', [notificationId])) ?? {});
}

async function updateNotification(db: Database, input: SharedInput): Promise<unknown> {
  const id = safeId(input, "id");
  const status = requiredString(input, "status", 32);
  if (!notificationStatuses.has(status)) throw new DataServiceError(400, "Invalid status");
  await write(db, 'UPDATE "notifications" SET "status" = ?, "errorMessage" = ? WHERE "id" = ?', [
    status,
    typeof input.errorMessage === "string" ? input.errorMessage.slice(0, 4_000) : null,
    id,
  ]);
  const row = await first(db, 'SELECT * FROM "notifications" WHERE "id" = ? LIMIT 1', [id]);
  if (!row) throw new DataServiceError(404, "Notification not found");
  return decodeRow("notifications", row);
}

async function profileUser(db: Database, input: SharedInput): Promise<unknown> {
  const userId = safeId(input, "userId");
  const row = await first(db, 'SELECT "id", "이름", "slackChannelId" FROM "users" WHERE "id" = ? LIMIT 1', [userId]);
  if (!row) throw new DataServiceError(404, "User not found");
  return row;
}

async function notificationUserContext(db: Database, input: SharedInput): Promise<unknown> {
  const userId = safeId(input, "userId");
  const user = await first(db, `SELECT u."id", u."이름", u."연락처", u."email", u."telegramChatId", u."slackChannelId",
    c."name" AS "cohortName", c."교육시작일", c."자료제출마감일",
    s."브랜드명" AS "brandName"
    FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId"
    LEFT JOIN "submissions" s ON s."userId" = u."id" WHERE u."id" = ? LIMIT 1`, [userId]);
  if (!user) throw new DataServiceError(404, "User not found");
  return user;
}

async function updateSlackChannel(db: Database, input: SharedInput): Promise<unknown> {
  const userId = safeId(input, "userId");
  const slackChannelId = requiredString(input, "slackChannelId", 128);
  await write(db, 'UPDATE "users" SET "slackChannelId" = ?, "updatedAt" = ? WHERE "id" = ?', [slackChannelId, now(input), userId]);
  return profileUser(db, { userId });
}

async function startPasswordReset(db: Database, input: SharedInput): Promise<unknown> {
  const cleanPhone = requiredString(input, "cleanPhone", 20);
  const formattedPhone = requiredString(input, "formattedPhone", 20);
  const hashedPassword = requiredString(input, "hashedPassword", 512);
  const user = await first<Row>(db, `SELECT "id", "이름", "연락처", "SMS수신동의"
    FROM "users" WHERE "연락처" IN (?, ?) LIMIT 1`, [cleanPhone, formattedPhone]);
  if (!user) throw new DataServiceError(404, "등록되지 않은 전화번호입니다.");
  if (!user.SMS수신동의) throw new DataServiceError(400, "SMS 수신 동의가 필요합니다. 관리자에게 문의하세요.");
  const since = now(input) - 5 * 60 * 1000;
  const timestamp = now(input);
  const notificationId = crypto.randomUUID();
  const notificationMessage = "임시 비밀번호가 발급되었습니다. SMS 발송 결과는 별도 확인하세요.";
  const results = await db.batch([
    db.prepare(`INSERT INTO "notifications" ("id", "userId", "type", "channel", "title", "message", "status", "sentAt", "createdAt")
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM "notifications" WHERE "userId" = ? AND "type" = ? AND "createdAt" >= ?)`).bind(notificationId, user.id as string, "비밀번호재발급", "SMS", "[스타트패키지] 임시 비밀번호 발급", notificationMessage, "전송중", timestamp, timestamp, user.id as string, "비밀번호재발급", since),
    db.prepare('UPDATE "users" SET "password" = ?, "updatedAt" = ? WHERE "id" = ? AND EXISTS (SELECT 1 FROM "notifications" WHERE "id" = ?)').bind(hashedPassword, timestamp, user.id as string, notificationId),
  ]);
  if (results.some((result) => !result.success)) throw new DataServiceError(503, "Password reset failed");
  if ((results[0]?.meta.changes ?? 0) !== 1) throw new DataServiceError(429, "최근 재발급 요청이 있습니다. 5분 후 다시 시도해주세요.");
  return { id: user.id, 이름: user.이름, 연락처: user.연락처, notificationId };
}

async function dashboardContext(db: Database, input: SharedInput): Promise<unknown> {
  const userId = safeId(input, "userId");
  const user = await first(db, 'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [userId]);
  if (!user) return null;
  const cohort = user.cohortId
    ? await first(db, 'SELECT * FROM "cohorts" WHERE "id" = ? LIMIT 1', [String(user.cohortId)])
    : null;
  const submission = await first(db, 'SELECT * FROM "submissions" WHERE "userId" = ? LIMIT 1', [userId]);
  const workflows = await all(db, 'SELECT * FROM "workflows" WHERE "userId" = ? ORDER BY "createdAt" ASC, "id" ASC LIMIT 20', [userId]);
  const extensionRequests = await all(db, 'SELECT * FROM "marketing_extension_requests" WHERE "userId" = ? ORDER BY "requestDate" DESC, "id" DESC LIMIT 1', [userId]);
  const threads = await all(db, 'SELECT * FROM "communication_threads" WHERE "userId" = ? ORDER BY "lastReplyAt" DESC, "id" DESC LIMIT 50', [userId]);
  const threadIds = threads.map((thread) => String(thread.id));
  const messages = threadIds.length
    ? await all(db, `SELECT m.* FROM "communication_messages" m
      INNER JOIN (SELECT "threadId", MAX("createdAt") AS "latestAt"
        FROM "communication_messages" WHERE "threadId" IN (${threadIds.map(() => "?").join(",")})
        GROUP BY "threadId") latest
      ON latest."threadId" = m."threadId" AND latest."latestAt" = m."createdAt"
      WHERE m."threadId" IN (${threadIds.map(() => "?").join(",")})`, [...threadIds, ...threadIds])
    : [];
  const latestByThread = new Map<string, Row>();
  for (const message of messages) latestByThread.set(String(message.threadId), message);
  const communicationThreads = threads.map((thread) => ({
    ...decodeRow("communication_threads", thread),
    messages: latestByThread.has(String(thread.id))
      ? [decodeRow("communication_messages", latestByThread.get(String(thread.id)) as Row)]
      : [],
  }));
  return {
    ...decodeRow("users", user),
    cohort: cohort ? decodeRow("cohorts", cohort) : null,
    submission: submission ? decodeRow("submissions", submission) : null,
    workflows: workflows.map((row) => decodeRow("workflows", row)),
    marketingExtensionRequests: extensionRequests.map((row) => decodeRow("marketing_extension_requests", row)),
    communicationThreads,
  };
}

async function scheduledNotificationPage(db: Database, input: SharedInput): Promise<unknown> {
  const size = parsePageSize(input.pageSize);
  const fanoutKey = requiredString(input, "fanoutKey", 128);
  const leaseToken = requiredString(input, "leaseToken", 256);
  const progress = await first(db, 'SELECT "cursor", "completed", "leaseToken" FROM "notification_fanouts" WHERE "fanoutKey" = ? LIMIT 1', [fanoutKey]);
  if (progress?.completed) return { items: [], completed: true, hasMore: false };
  if (!progress || progress.leaseToken !== leaseToken) throw new DataServiceError(409, "Fanout lease unavailable");
  const cursor = typeof progress?.cursor === "string" ? progress.cursor : undefined;
  const pendingRows = await all(db, `SELECT u."id", u."이름", u."email", u."연락처", u."cohortId", u."SMS수신동의", u."이메일수신동의"
    FROM "notification_fanout_deliveries" d INNER JOIN "users" u ON u."id" = d."userId"
    WHERE d."fanoutKey" = ? AND d."status" = 'pending' AND u."콘텐츠팁이메일수신" = 1 AND COALESCE(u."email", '') <> ''
    ORDER BY d."userId" ASC LIMIT ?`, [fanoutKey, size]);
  const freshSize = Math.max(0, size - pendingRows.length);
  const freshValues: SqlValue[] = [1];
  let continuation = 'WHERE u."콘텐츠팁이메일수신" = ? AND COALESCE(u."email", \'\') <> \'\' AND d."userId" IS NULL';
  if (cursor) {
    const decoded = verifyCursor(secret(input), cursor, `shared-scheduled-notifications:${fanoutKey}`, ["id"]);
    const id = String(decoded.sort[0]?.value ?? "");
    if (!identifier.test(id)) throw new DataServiceError(400, "Invalid cursor");
    continuation += ' AND u."id" > ?';
    freshValues.push(id);
  }
  const freshRows = await all(db, `SELECT u."id", u."이름", u."email", u."연락처", u."cohortId", u."SMS수신동의", u."이메일수신동의"
    FROM "users" u LEFT JOIN "notification_fanout_deliveries" d
      ON d."fanoutKey" = ? AND d."userId" = u."id"
    ${continuation} ORDER BY u."id" ASC LIMIT ?`, [fanoutKey, ...freshValues, freshSize + 1]);
  const freshItems = freshRows.slice(0, freshSize).map((row) => decodeRow("users", row));
  const hasMore = freshRows.length > freshSize;
  const items = [...pendingRows.map((row) => decodeRow("users", row)), ...freshItems];
  if (items.length) {
    const timestamp = now(input);
    await db.batch(items.map((item) => db.prepare(`INSERT OR IGNORE INTO "notification_fanout_deliveries"
      ("fanoutKey", "userId", "status", "updatedAt") VALUES (?, ?, 'pending', ?)`).bind(fanoutKey, String(item.id), timestamp)));
  }
  return {
    items,
    hasMore,
    ...(freshItems.length ? { nextCursor: signCursor(secret(input), {
      version: 1,
      scope: `shared-scheduled-notifications:${fanoutKey}`,
      sort: [{ field: "id", value: String(freshItems[freshItems.length - 1].id) }],
    }) } : cursor ? { nextCursor: cursor } : {}),
  };
}

async function markScheduledNotificationDelivery(db: Database, input: SharedInput): Promise<unknown> {
  const fanoutKey = requiredString(input, "fanoutKey", 128);
  const userId = safeId(input, "userId");
  const status = requiredString(input, "status", 16);
  if (status !== "pending" && status !== "sent") throw new DataServiceError(400, "Invalid delivery status");
  await write(db, `INSERT INTO "notification_fanout_deliveries" ("fanoutKey", "userId", "status", "updatedAt")
    VALUES (?, ?, ?, ?) ON CONFLICT("fanoutKey", "userId") DO UPDATE SET "status" = excluded."status", "updatedAt" = excluded."updatedAt"`,
    [fanoutKey, userId, status, now(input)]);
  return { fanoutKey, userId, status };
}

async function markScheduledNotificationDeliveries(db: Database, input: SharedInput): Promise<unknown> {
  const fanoutKey = requiredString(input, "fanoutKey", 128);
  const leaseToken = requiredString(input, "leaseToken", 256);
  const progress = await first(db, 'SELECT "leaseToken", "completed" FROM "notification_fanouts" WHERE "fanoutKey" = ? LIMIT 1', [fanoutKey]);
  if (!progress || progress.leaseToken !== leaseToken || progress.completed) throw new DataServiceError(409, "Fanout lease unavailable");
  if (!Array.isArray(input.deliveries) || input.deliveries.length > 100) {
    throw new DataServiceError(400, "Invalid deliveries");
  }
  const timestamp = now(input);
  const deliveries = input.deliveries.map((entry) => {
    if (!entry || typeof entry !== "object") throw new DataServiceError(400, "Invalid delivery");
    const item = entry as Record<string, unknown>;
    const userId = safeId(item, "userId");
    const status = requiredString(item, "status", 16);
    if (status !== "pending" && status !== "sent") throw new DataServiceError(400, "Invalid delivery status");
    return { userId, status };
  });
  await db.batch(deliveries.map(({ userId, status }) => db.prepare(`INSERT INTO "notification_fanout_deliveries" ("fanoutKey", "userId", "status", "updatedAt")
    VALUES (?, ?, ?, ?) ON CONFLICT("fanoutKey", "userId") DO UPDATE SET "status" = excluded."status", "updatedAt" = excluded."updatedAt"`).bind(fanoutKey, userId, status, timestamp)));
  return { fanoutKey, count: deliveries.length };
}

async function registerScheduledNotification(db: Database, input: SharedInput): Promise<unknown> {
  const fanoutKey = safeId(input, "fanoutKey");
  const timestamp = now(input);
  await write(db, `INSERT OR IGNORE INTO "notification_fanouts" ("fanoutKey", "cursor", "completed", "updatedAt") VALUES (?, NULL, 0, ?)`, [fanoutKey, timestamp]);
  return { fanoutKey };
}

async function listIncompleteScheduledNotifications(db: Database, input: SharedInput): Promise<unknown> {
  const timestamp = now(input);
  const rows = await all(db, `SELECT f."fanoutKey", f."cursor", f."updatedAt", t."title", t."description", t."linkType", t."linkUrl"
    FROM "notification_fanouts" f INNER JOIN "content_tips" t ON t."id" = f."fanoutKey"
    WHERE f."completed" = 0 AND (f."leaseUntil" IS NULL OR f."leaseUntil" <= ?)
    ORDER BY f."updatedAt" ASC, f."fanoutKey" ASC LIMIT 5`, [timestamp]);
  return { items: rows };
}

async function claimScheduledNotification(db: Database, input: SharedInput): Promise<unknown> {
  const fanoutKey = safeId(input, "fanoutKey");
  const leaseToken = requiredString(input, "leaseToken", 256);
  const timestamp = now(input);
  const leaseUntil = timestamp + 5 * 60_000;
  const result = await db.prepare(`UPDATE "notification_fanouts" SET "leaseToken" = ?, "leaseUntil" = ?, "updatedAt" = ?
    WHERE "fanoutKey" = ? AND "completed" = 0 AND ("leaseUntil" IS NULL OR "leaseUntil" <= ? OR "leaseToken" = ?)`)
    .bind(leaseToken, leaseUntil, timestamp, fanoutKey, timestamp, leaseToken).all();
  if (!result.success || (result.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "Fanout lease unavailable");
  return { fanoutKey, leaseToken, leaseUntil };
}

async function releaseScheduledNotification(db: Database, input: SharedInput): Promise<unknown> {
  const fanoutKey = safeId(input, "fanoutKey");
  const leaseToken = requiredString(input, "leaseToken", 256);
  await write(db, 'UPDATE "notification_fanouts" SET "leaseToken" = NULL, "leaseUntil" = NULL, "updatedAt" = ? WHERE "fanoutKey" = ? AND "leaseToken" = ?', [now(input), fanoutKey, leaseToken]);
  return { fanoutKey };
}

async function advanceScheduledNotification(db: Database, input: SharedInput): Promise<unknown> {
  const fanoutKey = requiredString(input, "fanoutKey", 128);
  const leaseToken = requiredString(input, "leaseToken", 256);
  const cursor = typeof input.cursor === "string" ? input.cursor : null;
  const completed = input.completed === true ? 1 : 0;
  const timestamp = now(input);
  const result = await db.prepare(`UPDATE "notification_fanouts" SET "cursor" = ?, "completed" = ?, "updatedAt" = ?, "leaseToken" = ${completed ? "NULL" : "\"leaseToken\""}, "leaseUntil" = ${completed ? "NULL" : "\"leaseUntil\""}
    WHERE "fanoutKey" = ? AND "leaseToken" = ? AND "completed" = 0`).bind(cursor, completed, timestamp, fanoutKey, leaseToken).all();
  if (!result.success || (result.meta.changes ?? 0) !== 1) throw new DataServiceError(409, "Fanout lease unavailable");
  return { fanoutKey, cursor, completed: Boolean(completed) };
}

export async function sharedOperation(
  db: Database,
  operation: SharedOperation | `shared-domain/${SharedOperation}` | string,
  input: SharedInput,
): Promise<unknown> {
  const normalized = operation.startsWith("shared-domain/")
    ? operation.slice("shared-domain/".length)
    : operation;
  switch (normalized) {
    case "notification-list": return listNotifications(db, input);
    case "notification-create": return createNotification(db, input);
    case "notification-update": return updateNotification(db, input);
    case "profile-user": return profileUser(db, input);
    case "notification-user-context": return notificationUserContext(db, input);
    case "user-slack-channel-update": return updateSlackChannel(db, input);
    case "password-reset-start": return startPasswordReset(db, input);
    case "dashboard-context": return dashboardContext(db, input);
    case "scheduled-notification-page": return scheduledNotificationPage(db, input);
    case "scheduled-notification-deliveries": return markScheduledNotificationDeliveries(db, input);
    case "scheduled-notification-delivery": return markScheduledNotificationDelivery(db, input);
    case "scheduled-notification-register": return registerScheduledNotification(db, input);
    case "scheduled-notification-incomplete": return listIncompleteScheduledNotifications(db, input);
    case "scheduled-notification-claim": return claimScheduledNotification(db, input);
    case "scheduled-notification-release": return releaseScheduledNotification(db, input);
    case "scheduled-notification-advance": return advanceScheduledNotification(db, input);
    default: throw new DataServiceError(404, "Unknown shared operation");
  }
}
