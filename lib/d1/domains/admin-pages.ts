import { DataServiceError, type Database, type SqlValue } from "../database";
import { parsePageSize, signCursor, verifyCursor } from "../read-policy";
import { decodeRow } from "../row-codec";

export type AdminPagesOperation =
  | "dashboard-summary"
  | "alerts-page"
  | "cohorts-page"
  | "notifications-page"
  | "users-page"
  | "workflows-page";

type Input = Record<string, unknown> & { adminId?: string };
type Row = Record<string, unknown>;

const ADMIN_ROLES = new Set(["super", "designer", "operator"]);
const WORKFLOW_STATS = ["대기", "시안중", "발주대기", "제작중", "발송완료"] as const;
const AGGREGATE_TTL_MS = 15_000;
const MAX_FILTER_OPTIONS = 500;
const aggregateCache = new Map<string, { expiresAt: number; value: unknown }>();

function required(input: Input, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > 512) {
    throw new DataServiceError(400, `${key} is required`);
  }
  return value.trim();
}

function cursorSecret(input: Input): string {
  const value = typeof input.cursorSecret === "string" ? input.cursorSecret : process.env.D1_CURSOR_SECRET;
  if (!value || value.length < 32) throw new DataServiceError(503, "Service unavailable");
  return value;
}

function page(input: Input, scope: string) {
  return {
    scope,
    size: parsePageSize(input.pageSize),
    cursor: typeof input.cursor === "string" ? input.cursor : undefined,
    secret: cursorSecret(input),
  };
}

function str(input: Input, key: string, fallback = "all"): string {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0);
}

async function first<T extends Row = Row>(db: Database, sql: string, values: SqlValue[] = []): Promise<T | null> {
  return db.prepare(sql).bind(...values).first<T>();
}

async function all<T extends Row = Row>(db: Database, sql: string, values: SqlValue[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return result.results;
}

async function assertAdmin(db: Database, adminId: string): Promise<void> {
  const admin = await first(db, 'SELECT "id", "role" FROM "admins" WHERE "id" = ? LIMIT 1', [adminId]);
  if (!admin || typeof admin.role !== "string" || !ADMIN_ROLES.has(admin.role)) {
    throw new DataServiceError(403, "Forbidden");
  }
}

function decode(table: string, row: Row): Row {
  return decodeRow(table, row);
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = aggregateCache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value as T;
  const value = await loader();
  aggregateCache.set(key, { value, expiresAt: Date.now() + AGGREGATE_TTL_MS });
  if (aggregateCache.size > 50) {
    aggregateCache.delete(aggregateCache.keys().next().value as string);
  }
  return value;
}

function pageResult(items: Row[], extra: Row[], size: number, nextCursor: string | undefined) {
  return { items, ...(extra.length > size && nextCursor ? { nextCursor } : {}) };
}

async function dashboardSummary(db: Database) {
  const [counters, recentRows] = await Promise.all([
    cached("dashboard-summary-counters", async () => {
      const [totalUsers, activeCohorts, notifications, unreadMessages, workflowStats] = await Promise.all([
        first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "users" WHERE "role" = ?', ["user"]),
        first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "cohorts" WHERE "isActive" = 1'),
        first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "notifications" WHERE "createdAt" >= ?', [Date.now() - 7 * 24 * 60 * 60 * 1000]),
        first<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM "communication_messages" WHERE "authorType" = ? AND "isReadByAdmin" = 0', ["user"]),
        all<{ status: string; count: number }>(db, 'SELECT "status", COUNT(*) AS count FROM "workflows" GROUP BY "status"'),
      ]);
      return { totalUsers, activeCohorts, notifications, unreadMessages, workflowStats };
    }),
    all(db, 'SELECT w."id", w."userId", w."type", w."status", w."createdAt", w."updatedAt", u."이름" AS "userName", c."name" AS "cohortName" FROM "workflows" w INNER JOIN "users" u ON u."id" = w."userId" LEFT JOIN "cohorts" c ON c."id" = u."cohortId" ORDER BY w."createdAt" DESC, w."id" DESC LIMIT 10'),
  ]);

  const recentWorkflows = recentRows.map((row) => ({
    ...decode("workflows", {
      id: row.id,
      userId: row.userId,
      type: row.type,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
    user: { 이름: row.userName, cohort: row.cohortName ? { name: row.cohortName } : null },
  }));

  return {
    totalUsers: counters.totalUsers?.count ?? 0,
    activeCohorts: counters.activeCohorts?.count ?? 0,
    notifications: counters.notifications?.count ?? 0,
    unreadMessages: counters.unreadMessages?.count ?? 0,
    workflowStats: counters.workflowStats.map((row) => ({ status: row.status, _count: row.count })),
    recentWorkflows,
  };
}

async function alertsPage(db: Database, input: Input) {
  const current = page(input, "admin-pages-alerts");
  const values: SqlValue[] = [];
  let where = "";
  if (current.cursor) {
    const decoded = verifyCursor(current.secret, current.cursor, current.scope, ["isActive", "endDate", "priority", "id"]);
    const active = Number(decoded.sort[0]?.value);
    const endDate = Number(decoded.sort[1]?.value);
    const priority = Number(decoded.sort[2]?.value);
    const id = String(decoded.sort[3]?.value ?? "");
    where = 'WHERE ("isActive" < ? OR ("isActive" = ? AND "endDate" > ?) OR ("isActive" = ? AND "endDate" = ? AND "priority" < ?) OR ("isActive" = ? AND "endDate" = ? AND "priority" = ? AND "id" > ?))';
    values.push(active, active, endDate, active, endDate, priority, active, endDate, priority, id);
  }
  values.push(current.size + 1);
  const rows = await all(db, `SELECT * FROM "system_alerts" ${where} ORDER BY "isActive" DESC, "endDate" ASC, "priority" DESC, "id" ASC LIMIT ?`, values);
  const items = rows.slice(0, current.size).map((row) => decode("system_alerts", row));
  const last = rows.length > current.size ? items[items.length - 1] : undefined;
  const cohorts = await filterCohorts(db);
  const nextCursor = last
    ? signCursor(current.secret, { version: 1, scope: current.scope, sort: [
      { field: "isActive", value: String(last.isActive ? 1 : 0) },
      { field: "endDate", value: String(new Date(last.endDate as Date).getTime()) },
      { field: "priority", value: String(last.priority) },
      { field: "id", value: String(last.id) },
    ] })
    : undefined;
  return { ...pageResult(items, rows, current.size, nextCursor), cohorts };
}

async function cohortsPage(db: Database, input: Input) {
  const current = page(input, "admin-pages-cohorts");
  const values: SqlValue[] = [];
  let continuation = "";
  if (current.cursor) {
    const decoded = verifyCursor(current.secret, current.cursor, current.scope, ["createdAt", "id"]);
    continuation = 'WHERE (c."createdAt", c."id") < (?, ?)';
    values.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? ""));
  }
  values.push(current.size + 1);
  const rows = await all(db, `SELECT c.* FROM "cohorts" c ${continuation} ORDER BY c."createdAt" DESC, c."id" DESC LIMIT ?`, values);
  const pageRows = rows.slice(0, current.size);
  const counts = await userCountsForCohorts(db, pageRows.map((row) => String(row.id)));
  const items: Row[] = pageRows.map((row) => ({ ...decode("cohorts", row), _count: { users: counts.get(String(row.id)) ?? 0 } }));
  const last = rows.length > current.size ? items[items.length - 1] : undefined;
  const stats = await cached("cohort-page-stats", async () =>
    first<{ total: number; active: number; students: number }>(db, 'SELECT (SELECT COUNT(*) FROM "cohorts") AS total, (SELECT COUNT(*) FROM "cohorts" WHERE "isActive" = 1) AS active, (SELECT COUNT(*) FROM "users" WHERE "role" = ?) AS students', ["user"]),
  );
  const nextCursor = last
    ? signCursor(current.secret, { version: 1, scope: current.scope, sort: [
      { field: "createdAt", value: String(new Date(last.createdAt as Date).getTime()) },
      { field: "id", value: String(last.id) },
    ] })
    : undefined;
  return { ...pageResult(items, rows, current.size, nextCursor), stats: stats ?? { total: 0, active: 0, students: 0 } };
}

async function userCountsForCohorts(db: Database, cohortIds: string[]) {
  if (cohortIds.length === 0) return new Map<string, number>();
  const placeholders = cohortIds.map(() => "?").join(",");
  const rows = await all<{ cohortId: string; count: number }>(db, `SELECT "cohortId", COUNT(*) AS count FROM "users" WHERE "role" = ? AND "cohortId" IN (${placeholders}) GROUP BY "cohortId"`, ["user", ...cohortIds]);
  return new Map(rows.map((row) => [row.cohortId, row.count]));
}

async function notificationsPage(db: Database, input: Input) {
  const current = page(input, "admin-pages-notifications");
  const values: SqlValue[] = [];
  let continuation = "";
  if (current.cursor) {
    const decoded = verifyCursor(current.secret, current.cursor, current.scope, ["createdAt", "id"]);
    continuation = 'WHERE (n."createdAt", n."id") < (?, ?)';
    values.push(Number(decoded.sort[0]?.value), String(decoded.sort[1]?.value ?? ""));
  }
  values.push(current.size + 1);
  const rows = await all(db, `SELECT n.*, u."이름" AS "userName", u."연락처" AS "userPhone", u."email" AS "userEmail" FROM "notifications" n LEFT JOIN "users" u ON u."id" = n."userId" ${continuation} ORDER BY n."createdAt" DESC, n."id" DESC LIMIT ?`, values);
  const items: Row[] = rows.slice(0, current.size).map((row) => ({
    ...decode("notifications", row),
    user: row.userName || row.userPhone || row.userEmail ? { 이름: row.userName, 연락처: row.userPhone, email: row.userEmail } : null,
  }));
  const last = rows.length > current.size ? items[items.length - 1] : undefined;
  const grouped = await cached("notification-page-stats", async () =>
    all<{ channel: string | null; status: string | null; count: number }>(db, 'SELECT "channel", "status", COUNT(*) AS count FROM "notifications" GROUP BY "channel", "status"'),
  );
  const stats = grouped.reduce((acc, row) => {
    acc.total += row.count;
    if (row.channel === "SMS") acc.smsCount += row.count;
    if (row.channel === "EMAIL") acc.emailCount += row.count;
    if (row.status === "성공") acc.successCount += row.count;
    if (row.status === "실패") acc.failCount += row.count;
    return acc;
  }, { total: 0, smsCount: 0, emailCount: 0, successCount: 0, failCount: 0 });
  const nextCursor = last
    ? signCursor(current.secret, { version: 1, scope: current.scope, sort: [
      { field: "createdAt", value: String(new Date(last.createdAt as Date).getTime()) },
      { field: "id", value: String(last.id) },
    ] })
    : undefined;
  return { ...pageResult(items, rows, current.size, nextCursor), stats };
}

function userFilter(input: Input): { where: string; values: SqlValue[]; scope: string } {
  const values: SqlValue[] = ["user"];
  const clauses = ['u."role" = ?'];
  const cohortId = str(input, "cohortId");
  const year = str(input, "year");
  const search = str(input, "search", "");
  if (cohortId !== "all") {
    clauses.push('u."cohortId" = ?');
    values.push(cohortId);
  } else if (/^\d{4}$/.test(year)) {
    clauses.push('c."교육시작일" >= ? AND c."교육시작일" < ?');
    values.push(new Date(`${year}-01-01T00:00:00+09:00`).getTime(), new Date(`${Number(year) + 1}-01-01T00:00:00+09:00`).getTime());
  }
  if (search) {
    clauses.push('(u."이름" LIKE ? OR u."연락처" LIKE ? OR u."email" LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  return { where: `WHERE ${clauses.join(" AND ")}`, values, scope: `admin-pages-users:${cohortId}:${year}:${search}` };
}

async function usersPage(db: Database, input: Input) {
  const filters = userFilter(input);
  const sortMode = str(input, "sortMode", "name");
  const fields = sortMode === "cohort" ? ["cohortId", "이름", "id"] : ["이름", "id"];
  const current = page(input, `${filters.scope}:${sortMode}`);
  const values = [...filters.values];
  let continuation = "";
  if (current.cursor) {
    const decoded = verifyCursor(current.secret, current.cursor, current.scope, fields);
    if (sortMode === "cohort") {
      continuation = ' AND (u."cohortId", u."이름", u."id") > (?, ?, ?)';
      values.push(String(decoded.sort[0]?.value ?? ""), String(decoded.sort[1]?.value ?? ""), String(decoded.sort[2]?.value ?? ""));
    } else {
      continuation = ' AND (u."이름", u."id") > (?, ?)';
      values.push(String(decoded.sort[0]?.value ?? ""), String(decoded.sort[1]?.value ?? ""));
    }
  }
  values.push(current.size + 1);
  const order = sortMode === "cohort" ? 'u."cohortId" ASC, u."이름" ASC, u."id" ASC' : 'u."이름" ASC, u."id" ASC';
  const rows = await all(db, `SELECT u."id", u."이름", u."연락처", u."email", u."SMS수신동의", u."이메일수신동의", u."cohortId", u."createdAt", u."updatedAt", c."id" AS "cohortRowId", c."name" AS "cohortName", c."교육시작일" AS "cohortStart" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" ${filters.where}${continuation} ORDER BY ${order} LIMIT ?`, values);
  const pageRows = rows.slice(0, current.size);
  const workflowRows = pageRows.length ? await workflowSummariesForUsers(db, pageRows.map((row) => String(row.id))) : [];
  const workflowsByUser = new Map<string, Row[]>();
  for (const row of workflowRows) {
    const userId = String(row.userId);
    workflowsByUser.set(userId, [...(workflowsByUser.get(userId) ?? []), { id: row.id, type: row.type, status: row.status }]);
  }
  const deduped: Row[] = pageRows.map((row) => ({
    ...decode("users", { id: row.id, 이름: row.이름, 연락처: row.연락처, email: row.email, SMS수신동의: row.SMS수신동의, 이메일수신동의: row.이메일수신동의, cohortId: row.cohortId, createdAt: row.createdAt, updatedAt: row.updatedAt }),
    cohort: row.cohortRowId ? { id: row.cohortRowId, name: row.cohortName, 교육시작일: new Date(number(row.cohortStart)) } : null,
    workflows: workflowsByUser.get(String(row.id)) ?? [],
  }));
  const last = rows.length > current.size ? deduped[deduped.length - 1] : undefined;
  const cohorts = await cohortOptions(db);
  const nextCursor = last
    ? signCursor(current.secret, { version: 1, scope: current.scope, sort: sortMode === "cohort"
      ? [{ field: "cohortId", value: String(last.cohortId) }, { field: "이름", value: String(last.이름) }, { field: "id", value: String(last.id) }]
      : [{ field: "이름", value: String(last.이름) }, { field: "id", value: String(last.id) }],
    })
    : undefined;
  return { ...pageResult(deduped, rows, current.size, nextCursor), cohorts, stats: await userStats(db) };
}

async function workflowSummariesForUsers(db: Database, userIds: string[]) {
  const placeholders = userIds.map(() => "?").join(",");
  return all(db, `SELECT "id", "userId", "type", "status" FROM "workflows" WHERE "userId" IN (${placeholders}) ORDER BY "userId" ASC, "createdAt" DESC, "id" DESC LIMIT ?`, [...userIds, userIds.length * 50]);
}

async function cohortOptions(db: Database) {
  return cached("user-page-cohort-options", async () => {
    const cohorts = await all(db, 'SELECT "id", "name", "교육시작일" FROM "cohorts" ORDER BY "교육시작일" ASC, "id" ASC LIMIT ?', [MAX_FILTER_OPTIONS + 1]);
    if (cohorts.length > MAX_FILTER_OPTIONS) throw new DataServiceError(400, "Too many cohort filter options");
    const counts = await userCountsForCohorts(db, cohorts.map((row) => String(row.id)));
    return cohorts.map((row) => ({ ...decode("cohorts", { id: row.id, name: row.name, 교육시작일: row.교육시작일, 교육요일: "", 자료제출마감일: 0, isActive: 1, createdAt: 0, updatedAt: 0 }), usersCount: counts.get(String(row.id)) ?? 0 }));
  });
}

async function userStats(db: Database) {
  return cached("user-page-year-stats", async () =>
    all<{ year: string; cohortId: string; count: number }>(db, 'SELECT strftime(\'%Y\', c."교육시작일" / 1000, \'unixepoch\') AS year, c."id" AS cohortId, COUNT(u."id") AS count FROM "cohorts" c LEFT JOIN "users" u ON u."cohortId" = c."id" AND u."role" = ? GROUP BY c."id"', ["user"]),
  );
}

async function filterCohorts(db: Database) {
  return cached("filter-cohorts", async () => {
    const rows = await all(db, 'SELECT "id", "name" FROM "cohorts" ORDER BY "createdAt" DESC, "id" DESC LIMIT ?', [MAX_FILTER_OPTIONS + 1]);
    if (rows.length > MAX_FILTER_OPTIONS) throw new DataServiceError(400, "Too many cohort filter options");
    return rows;
  });
}

function workflowFilters(input: Input): { where: string; values: SqlValue[]; scope: string } {
  const values: SqlValue[] = ["user"];
  const clauses = ['u."role" = ?'];
  const status = str(input, "status");
  const type = str(input, "type");
  const cohort = str(input, "cohort");
  const search = str(input, "search", "");
  const hasFeedback = input.hasFeedback === true || input.hasFeedback === "true";
  const isDelayed = input.isDelayed === true || input.isDelayed === "true";
  if (cohort !== "all") {
    clauses.push('u."cohortId" = ?');
    values.push(cohort);
  }
  if (search) {
    clauses.push('(u."이름" LIKE ? OR u."연락처" LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }
  const workflowClauses: string[] = [];
  if (status !== "all") {
    workflowClauses.push('w."status" = ?');
    values.push(status);
  }
  if (type !== "all") {
    workflowClauses.push('w."type" = ?');
    values.push(type);
  }
  if (hasFeedback) workflowClauses.push('w."feedback" IS NOT NULL');
  if (isDelayed) {
    workflowClauses.push('w."자료제출일" IS NOT NULL AND w."자료제출일" <= ?');
    values.push(Date.now() - 14 * 24 * 60 * 60 * 1000);
  }
  if (workflowClauses.length > 0) {
    clauses.push(`EXISTS (SELECT 1 FROM "workflows" w WHERE w."userId" = u."id" AND ${workflowClauses.join(" AND ")})`);
  } else {
    clauses.push('EXISTS (SELECT 1 FROM "workflows" w WHERE w."userId" = u."id")');
  }
  return { where: `WHERE ${clauses.join(" AND ")}`, values, scope: `admin-pages-workflows:${status}:${type}:${cohort}:${search}:${hasFeedback}:${isDelayed}` };
}

async function workflowsPage(db: Database, input: Input) {
  const filters = workflowFilters(input);
  const current = page(input, filters.scope);
  const values = [...filters.values];
  let continuation = "";
  if (current.cursor) {
    const decoded = verifyCursor(current.secret, current.cursor, current.scope, ["cohortId", "이름", "id"]);
    continuation = ' AND (u."cohortId", u."이름", u."id") > (?, ?, ?)';
    values.push(String(decoded.sort[0]?.value ?? ""), String(decoded.sort[1]?.value ?? ""), String(decoded.sort[2]?.value ?? ""));
  }
  values.push(current.size + 1);
  const users = await all(db, `SELECT u."id", u."이름", u."연락처", u."email", u."cohortId", u."adAutomationEnabled", u."adAutomationStartDate", u."adAutomationEndDate", u."smsSettingEnabled", u."naverAdSettingEnabled", u."naverAdSettingStartDate", u."naverAdSettingEndDate", u."homepageCompleted", u."marketingSupportEndDate", c."id" AS "cohortRowId", c."name" AS "cohortName" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" ${filters.where}${continuation} ORDER BY u."cohortId" ASC, u."이름" ASC, u."id" ASC LIMIT ?`, values);
  const pageUsers = users.slice(0, current.size);
  const ids = pageUsers.map((row) => String(row.id));
  const workflowRows = ids.length ? await workflowsForUsers(db, input, ids) : [];
  const grouped = Object.fromEntries(pageUsers.map((row) => {
    const user = {
      ...decode("users", { id: row.id, 이름: row.이름, 연락처: row.연락처, email: row.email, cohortId: row.cohortId, adAutomationEnabled: row.adAutomationEnabled, adAutomationStartDate: row.adAutomationStartDate, adAutomationEndDate: row.adAutomationEndDate, smsSettingEnabled: row.smsSettingEnabled, naverAdSettingEnabled: row.naverAdSettingEnabled, naverAdSettingStartDate: row.naverAdSettingStartDate, naverAdSettingEndDate: row.naverAdSettingEndDate, homepageCompleted: row.homepageCompleted, marketingSupportEndDate: row.marketingSupportEndDate, password: "", role: "user", status: "active", SMS수신동의: 0, 이메일수신동의: 0, 공지사항이메일수신: 0, 콘텐츠팁이메일수신: 0, marketingSupportEnabled: 0, createdAt: 0, updatedAt: 0, smsSettingStartDate: null, smsSettingEndDate: null, homepageCompletedAt: null }),
      cohort: row.cohortRowId ? { id: row.cohortRowId, name: row.cohortName } : null,
    };
    return [row.id, {
      user,
      workflows: workflowRows
        .filter((workflow) => workflow.userId === row.id)
        .map((workflow) => ({ ...workflow, user })),
    }];
  }));
  const last = users.length > current.size ? pageUsers[pageUsers.length - 1] : undefined;
  const nextCursor = last
    ? signCursor(current.secret, { version: 1, scope: current.scope, sort: [
      { field: "cohortId", value: String(last.cohortId) },
      { field: "이름", value: String(last.이름) },
      { field: "id", value: String(last.id) },
    ] })
    : undefined;
  return {
    workflowsByUser: grouped,
    stats: await workflowStats(db),
    cohorts: await cached("workflow-page-cohorts", async () => {
      const rows = await all(db, 'SELECT "id", "name" FROM "cohorts" ORDER BY "name" ASC LIMIT ?', [MAX_FILTER_OPTIONS + 1]);
      if (rows.length > MAX_FILTER_OPTIONS) throw new DataServiceError(400, "Too many cohort filter options");
      return rows;
    }),
    workflowTypes: await cached("workflow-page-types", async () => {
      const rows = await all<{ type: string }>(db, 'SELECT DISTINCT "type" FROM "workflows" WHERE "type" IS NOT NULL ORDER BY "type" ASC LIMIT ?', [MAX_FILTER_OPTIONS + 1]);
      if (rows.length > MAX_FILTER_OPTIONS) throw new DataServiceError(400, "Too many workflow filter options");
      return rows.map((row) => row.type);
    }),
    ...(nextCursor ? { nextCursor } : {}),
  };
}

async function workflowsForUsers(db: Database, input: Input, userIds: string[]) {
  const placeholders = userIds.map(() => "?").join(",");
  const values: SqlValue[] = [...userIds];
  const clauses = [`"userId" IN (${placeholders})`];
  const status = str(input, "status");
  const type = str(input, "type");
  if (status !== "all") {
    clauses.push('"status" = ?');
    values.push(status);
  }
  if (type !== "all") {
    clauses.push('"type" = ?');
    values.push(type);
  }
  if (input.hasFeedback === true || input.hasFeedback === "true") clauses.push('"feedback" IS NOT NULL');
  if (input.isDelayed === true || input.isDelayed === "true") {
    clauses.push('"자료제출일" IS NOT NULL AND "자료제출일" <= ?');
    values.push(Date.now() - 14 * 24 * 60 * 60 * 1000);
  }
  const rows = await all(db, `SELECT * FROM "workflows" WHERE ${clauses.join(" AND ")} ORDER BY "userId" ASC, "createdAt" DESC, "id" DESC LIMIT ?`, [...values, userIds.length * 51]);
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(String(row.userId), (counts.get(String(row.userId)) ?? 0) + 1);
  if ([...counts.values()].some((count) => count > 50)) throw new DataServiceError(400, "Too many workflows for a single user group");
  return rows.map((row) => decode("workflows", row));
}

async function workflowStats(db: Database) {
  return cached("workflow-page-stats", async () => {
    const rows = await all<{ bucket: string; count: number }>(db, `SELECT CASE WHEN "status" IN ('발주완료', '제작완료') THEN '제작중' ELSE "status" END AS bucket, COUNT(*) AS count FROM "workflows" GROUP BY bucket`);
    const stats = Object.fromEntries(WORKFLOW_STATS.map((key) => [key, 0])) as Record<(typeof WORKFLOW_STATS)[number], number>;
    for (const row of rows) if (row.bucket in stats) stats[row.bucket as keyof typeof stats] = row.count;
    return stats;
  });
}

export async function adminPagesOperation(db: Database, operation: AdminPagesOperation | string, input: Input): Promise<unknown> {
  const adminId = required(input, "adminId");
  await assertAdmin(db, adminId);
  switch (operation) {
    case "dashboard-summary":
      return dashboardSummary(db);
    case "alerts-page":
      return alertsPage(db, input);
    case "cohorts-page":
      return cohortsPage(db, input);
    case "notifications-page":
      return notificationsPage(db, input);
    case "users-page":
      return usersPage(db, input);
    case "workflows-page":
      return workflowsPage(db, input);
    default:
      throw new DataServiceError(404, "Unknown admin page operation");
  }
}
