import { DataServiceError, type Database, type SqlValue } from "../database";

/**
 * 기수 대상자 명단과 기수 자동 안내(2주차) 기록.
 * 상태 판정(제출 완료·발송 대상)은 Next 쪽 lib/cohort-roster.ts 가 한 곳에서 한다.
 * 여기서는 기수 단위로 범위를 정해 필요한 행만 읽고 쓴다.
 */

type Input = Record<string, unknown>;
type Row = Record<string, unknown>;

const ADMIN_ROLES = new Set(["super", "designer", "operator"]);
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;
const MAX_COHORTS = 50;
const MAX_ROWS = 2000;
const NAME_PATTERN = /^[가-힣a-zA-Z\s]{1,50}$/;
const PHONE_PATTERN = /^01\d{8,9}$/;
const REMINDER_KINDS = new Set(["week2"]);
const REMINDER_REASONS = new Set(["미가입", "자료 미제출"]);
const REMINDER_STATUSES = new Set(["성공", "실패", "확인 전"]);
const REMINDER_CHANNELS = new Set(["알림톡", "SMS", "LMS"]);

// 자료 제출 판정(lib/submission/parts.ts)에 필요한 열만 읽는다. 암호화 대상 열은 없다.
const SUBMISSION_COLUMNS = [
  "사업자등록증URL",
  "프로필사진URL",
  "브랜드명",
  "업종",
  "주소",
  "대표번호",
  "이메일",
  "로고제작방식",
  "로고URL",
  "로고선호스타일",
  "로고선호폰트",
  "로고선호색상",
  "로고제작요청사항",
  "로고예시디자인URL",
  "로고예시디자인2URL",
];
const SUBMISSION_SELECT = SUBMISSION_COLUMNS.map(
  (column) => `s."${column}" AS "sub_${column}"`,
).join(", ");

function text(input: Input, key: string, max = 128): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new DataServiceError(400, `${key} is required`);
  return value.trim();
}

function optionalText(input: Input, key: string, max = 512): string | null {
  const value = input[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > max)
    throw new DataServiceError(400, `Invalid ${key}`);
  return value.trim();
}

function phone(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (!PHONE_PATTERN.test(digits))
    throw new DataServiceError(400, "Invalid phone");
  return digits;
}

function formatted(digits: string): string {
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

async function first<T extends Row>(
  db: Database,
  sql: string,
  values: SqlValue[] = [],
): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...values)
    .first<T>();
}

async function all<T extends Row>(
  db: Database,
  sql: string,
  values: SqlValue[] = [],
): Promise<T[]> {
  const result = await db
    .prepare(sql)
    .bind(...values)
    .all<T>();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return result.results;
}

async function assertAdmin(db: Database, input: Input): Promise<string> {
  const adminId = text(input, "adminId");
  const row = await first<{ role: string }>(
    db,
    'SELECT "role" FROM "admins" WHERE "id" = ? LIMIT 1',
    [adminId],
  );
  if (!row || !ADMIN_ROLES.has(row.role))
    throw new DataServiceError(403, "Forbidden");
  return adminId;
}

async function cohort(db: Database, cohortId: string): Promise<Row> {
  const row = await first(
    db,
    'SELECT "id", "name", "교육시작일", "자료제출마감일", "isActive" FROM "cohorts" WHERE "id" = ? LIMIT 1',
    [cohortId],
  );
  if (!row) throw new DataServiceError(404, "Cohort not found");
  return row;
}

function submissionOf(row: Row): Row | null {
  if (row.submissionId === null || row.submissionId === undefined) return null;
  return Object.fromEntries(
    SUBMISSION_COLUMNS.map((column) => [column, row[`sub_${column}`] ?? null]),
  );
}

function userRow(row: Row) {
  return {
    id: String(row.id),
    cohortId: String(row.cohortId),
    name: String(row.name),
    phone: String(row.phone),
    createdAt: Number(row.createdAt),
    submission: submissionOf(row),
  };
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

async function cohortUsers(db: Database, cohortIds: string[]) {
  // runaway-ok: 기수 목록(최대 50개)으로 범위를 정하고 MAX_ROWS 로 자른다
  const rows = await all(
    db,
    `SELECT u."id", u."cohortId", u."이름" AS "name", u."연락처" AS "phone", u."createdAt", s."id" AS "submissionId", ${SUBMISSION_SELECT} FROM "users" u LEFT JOIN "submissions" s ON s."userId" = u."id" WHERE u."cohortId" IN (${placeholders(cohortIds.length)}) AND u."role" = 'user' AND u."status" != 'inactive' ORDER BY u."createdAt", u."id" LIMIT ${MAX_ROWS}`,
    cohortIds,
  );
  return rows.map(userRow);
}

async function rosterRows(db: Database, cohortIds: string[]) {
  const rows = await all(
    db,
    `SELECT "id", "cohortId", "name", "phone" FROM "cohort_roster" WHERE "cohortId" IN (${placeholders(cohortIds.length)}) ORDER BY "cohortId", "createdAt", "id" LIMIT ${MAX_ROWS}`,
    cohortIds,
  );
  return rows.map((row) => ({
    id: String(row.id),
    cohortId: String(row.cohortId),
    name: String(row.name),
    phone: String(row.phone),
  }));
}

async function reminderRows(db: Database, cohortIds: string[]) {
  const rows = await all(
    db,
    `SELECT "cohortId", "phone", "status", "channel", "note", "createdAt" FROM "cohort_reminders" WHERE "cohortId" IN (${placeholders(cohortIds.length)}) AND "kind" = 'week2' ORDER BY "cohortId", "createdAt" LIMIT ${MAX_ROWS}`,
    cohortIds,
  );
  return rows.map((row) => ({
    cohortId: String(row.cohortId),
    phone: String(row.phone),
    status: String(row.status),
    channel: row.channel === null ? null : String(row.channel),
    note: row.note === null ? null : String(row.note),
    createdAt: Number(row.createdAt),
  }));
}

function cohortIdList(input: Input): string[] {
  const value = input.cohortIds;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_COHORTS ||
    value.some((id) => typeof id !== "string" || !id || id.length > 128)
  )
    throw new DataServiceError(400, "Invalid cohortIds");
  return [...new Set(value as string[])];
}

async function addEntries(db: Database, input: Input) {
  const adminId = await assertAdmin(db, input);
  const cohortId = text(input, "cohortId");
  await cohort(db, cohortId);
  const entries = input.entries;
  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    entries.length > MAX_ENTRIES
  )
    throw new DataServiceError(400, "Invalid entries");
  const now = Date.now();
  const statements = entries.map((entry) => {
    const item = (entry ?? {}) as Input;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!NAME_PATTERN.test(name))
      throw new DataServiceError(400, "Invalid name");
    return db
      .prepare(
        'INSERT INTO "cohort_roster" ("id", "cohortId", "name", "phone", "createdBy", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT ("cohortId", "phone") DO NOTHING',
      )
      .bind(
        crypto.randomUUID(),
        cohortId,
        name,
        phone(item.phone),
        adminId,
        now,
        now,
      );
  });
  const results = await db.batch(statements);
  const added = results.reduce(
    (sum, result) => sum + (result.meta.changes ?? 0),
    0,
  );
  return { added, duplicates: entries.length - added };
}

/** 가입 직전 확인: 명단이 있는 기수라면 그 연락처가 명단에 있는지, 같은 이름이 다른 번호로 있는지 */
async function signupCheck(db: Database, input: Input) {
  const cohortId = text(input, "cohortId");
  const digits = phone(input.phone);
  const name = optionalText(input, "name", 50);
  const size = await first<{ count: number; cohortName: string | null }>(
    db,
    'SELECT COUNT(r."id") AS "count", (SELECT "name" FROM "cohorts" WHERE "id" = ?) AS "cohortName" FROM "cohort_roster" r WHERE r."cohortId" = ?',
    [cohortId, cohortId],
  );
  const rosterSize = Number(size?.count ?? 0);
  const cohortName = size?.cohortName ? String(size.cohortName) : "";
  if (rosterSize === 0)
    return { rosterSize, cohortName, matched: false, sameName: [] };
  const match = await first(
    db,
    'SELECT "id" FROM "cohort_roster" WHERE "cohortId" = ? AND "phone" = ? LIMIT 1',
    [cohortId, digits],
  );
  const sameName =
    match || !name
      ? []
      : await all(
          db,
          'SELECT "name", "phone" FROM "cohort_roster" WHERE "cohortId" = ? AND "name" = ? ORDER BY "createdAt" LIMIT 5',
          [cohortId, name],
        );
  return {
    rosterSize,
    cohortName,
    matched: Boolean(match),
    sameName: sameName.map((row) => ({
      name: String(row.name),
      phone: formatted(String(row.phone)),
    })),
  };
}

/** 2주차 안내 시점 전후 기수만 넉넉하게 고른다. 정확한 시각 판정은 Next 쪽에서 한다. */
async function reminderCandidates(db: Database, input: Input) {
  const now = input.now;
  if (typeof now !== "number" || !Number.isSafeInteger(now))
    throw new DataServiceError(400, "Invalid now");
  // runaway-ok: cohorts 는 수십 행이라 교육시작일 범위 조건으로 충분하다
  const cohorts = await all(
    db,
    'SELECT "id", "name", "교육시작일" FROM "cohorts" WHERE "isActive" = 1 AND "교육시작일" BETWEEN ? AND ? ORDER BY "교육시작일" LIMIT 20',
    [now - 11 * DAY_MS, now - 6 * DAY_MS],
  );
  if (cohorts.length === 0) return { cohorts: [] };
  const ids = cohorts.map((row) => String(row.id));
  const [roster, users, reminders] = await Promise.all([
    rosterRows(db, ids),
    cohortUsers(db, ids),
    reminderRows(db, ids),
  ]);
  return {
    cohorts: cohorts.map((row) => {
      const id = String(row.id);
      return {
        id,
        name: String(row.name),
        startAt: Number(row.교육시작일),
        roster: roster.filter((item) => item.cohortId === id),
        users: users.filter((item) => item.cohortId === id),
        sentPhones: reminders
          .filter((item) => item.cohortId === id)
          .map((item) => item.phone),
      };
    }),
  };
}

/** 보내기 전에 먼저 기록을 잡는다. 이미 잡힌 연락처면 claimed=false 라 보내지 않는다. */
async function reminderClaim(db: Database, input: Input) {
  const cohortId = text(input, "cohortId");
  const kind = text(input, "kind", 32);
  const reason = text(input, "reason", 32);
  if (!REMINDER_KINDS.has(kind) || !REMINDER_REASONS.has(reason))
    throw new DataServiceError(400, "Invalid reminder");
  const id = crypto.randomUUID();
  const now = Date.now();
  const result = await db
    .prepare(
      'INSERT INTO "cohort_reminders" ("id", "cohortId", "kind", "phone", "name", "userId", "reason", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT ("cohortId", "kind", "phone") DO NOTHING',
    )
    .bind(
      id,
      cohortId,
      kind,
      phone(input.phone),
      text(input, "name", 50),
      optionalText(input, "userId", 128),
      reason,
      "발송중",
      now,
      now,
    )
    .all();
  if (!result.success) throw new DataServiceError(503, "Service unavailable");
  return { claimed: (result.meta.changes ?? 0) === 1, id };
}

/** 발송 결과를 남기고, 가입한 회원이면 회원 알림 기록에도 남긴다. */
async function reminderFinish(db: Database, input: Input) {
  const id = text(input, "id");
  const status = text(input, "status", 16);
  const channel = optionalText(input, "channel", 16);
  if (
    !REMINDER_STATUSES.has(status) ||
    (channel !== null && !REMINDER_CHANNELS.has(channel))
  )
    throw new DataServiceError(400, "Invalid reminder result");
  const note = optionalText(input, "note", 1000);
  const now = Date.now();
  const row = await first<{ userId: string | null }>(
    db,
    'SELECT "userId" FROM "cohort_reminders" WHERE "id" = ? LIMIT 1',
    [id],
  );
  if (!row) throw new DataServiceError(404, "Reminder not found");
  const statements = [
    db
      .prepare(
        'UPDATE "cohort_reminders" SET "status" = ?, "channel" = ?, "note" = ?, "updatedAt" = ? WHERE "id" = ?',
      )
      .bind(status, channel, note, now, id),
  ];
  if (row.userId) {
    const metadata = optionalText(input, "metadata", 2000);
    statements.push(
      db
        // runaway-ok: 한 행 INSERT, 회원이 지워졌으면 넣지 않도록 기본 키로 존재만 확인한다
        .prepare(
          'INSERT INTO "notifications" ("id", "userId", "type", "channel", "title", "message", "status", "errorMessage", "sentByName", "metadata", "sentAt", "createdAt") SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM "users" WHERE "id" = ?)',
        )
        .bind(
          crypto.randomUUID(),
          row.userId,
          "2주차미제출알림",
          channel === "알림톡" ? "알림톡" : "SMS",
          text(input, "title", 512),
          text(input, "message", 32_000),
          status,
          note,
          "자동 발송",
          metadata,
          now,
          now,
          row.userId,
        ),
    );
  }
  await db.batch(statements);
  return { ok: true };
}

export async function rosterOperation(
  db: Database,
  operation: string,
  input: Input,
): Promise<unknown> {
  switch (operation) {
    case "summary": {
      await assertAdmin(db, input);
      const ids = cohortIdList(input);
      const [roster, users] = await Promise.all([
        rosterRows(db, ids),
        cohortUsers(db, ids),
      ]);
      return { roster, users };
    }
    case "detail": {
      await assertAdmin(db, input);
      const cohortId = text(input, "cohortId");
      const row = await cohort(db, cohortId);
      const [roster, users, reminders] = await Promise.all([
        rosterRows(db, [cohortId]),
        cohortUsers(db, [cohortId]),
        reminderRows(db, [cohortId]),
      ]);
      return {
        cohort: {
          id: String(row.id),
          name: String(row.name),
          startAt: Number(row.교육시작일),
          deadlineAt: Number(row.자료제출마감일),
        },
        roster,
        users,
        reminders,
      };
    }
    case "add":
      return addEntries(db, input);
    case "delete": {
      await assertAdmin(db, input);
      const result = await db
        .prepare(
          'DELETE FROM "cohort_roster" WHERE "id" = ? AND "cohortId" = ?',
        )
        .bind(text(input, "id"), text(input, "cohortId"))
        .all();
      if ((result.meta.changes ?? 0) !== 1)
        throw new DataServiceError(404, "Roster entry not found");
      return { ok: true };
    }
    case "signup-check":
      return signupCheck(db, input);
    case "reminder-candidates":
      return reminderCandidates(db, input);
    case "reminder-claim":
      return reminderClaim(db, input);
    case "reminder-finish":
      return reminderFinish(db, input);
    default:
      throw new DataServiceError(404, "Unknown roster operation");
  }
}
