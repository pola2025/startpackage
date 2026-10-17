import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { contentOperation } from "./content";

class SQLiteStatement implements Statement {
  constructor(private readonly raw: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {}
  bind(...values: SqlValue[]): Statement { return new SQLiteStatement(this.raw, this.sql, values); }
  async first<T>(): Promise<T | null> { return (this.raw.prepare(this.sql).get(...this.values) as T | undefined) ?? null; }
  async all<T>(): Promise<QueryResult<T>> { const results = this.raw.prepare(this.sql).all(...this.values) as T[]; return { results, success: true, meta: { rows_read: results.length } }; }
}

class SQLiteDatabase implements Database {
  constructor(readonly raw: DatabaseSync) {}
  prepare(sql: string): Statement { return new SQLiteStatement(this.raw, sql); }
  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    this.raw.exec("BEGIN");
    try {
      for (const statement of statements) { const local = statement as SQLiteStatement; this.raw.prepare(local.sql).run(...local.values); }
      this.raw.exec("COMMIT");
      return statements.map(() => ({ results: [], success: true, meta: { rows_written: 1 } }));
    } catch (error) { this.raw.exec("ROLLBACK"); throw error; }
  }
}

function seed(): SQLiteDatabase {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0003_content_indexes.sql", "utf8"));
  raw.prepare('INSERT INTO "cohorts" ("id","name","교육시작일","교육요일","자료제출마감일","updatedAt") VALUES (?,?,?,?,?,?)').run("cohort-1", "26기", 0, "월", 0, 0);
  raw.prepare('INSERT INTO "users" ("id","email","password","이름","연락처","cohortId","marketingSupportEnabled","marketingSupportEndDate","updatedAt") VALUES (?,?,?,?,?,?,?,?,?)').run("user-1", "user@example.com", "hash", "홍길동", "01012345678", "cohort-1", 1, Date.UTC(2026, 8, 1), 0);
  return new SQLiteDatabase(raw);
}

describe("content D1 operations", () => {
  it("returns the profile fields needed to create the first homepage Slack channel", async () => {
    const db = seed();
    const encryptionKey = Buffer.alloc(32, 7).toString("base64");
    const result = await contentOperation(db, "homepage-update", {
      userId: "user-1",
      changes: {
        홈페이지제작방식: "외부서비스",
        홈페이지스타일: null,
        홈페이지컬러컨셉: null,
        해외결제카드앞면URL: "SLACK_ONLY",
        해외결제카드뒷면URL: null,
        해외결제카드유효기간: "12/30",
        해외결제카드CVC: "123",
        GmailID: "homepage@example.com",
        GmailPW: "secret",
      },
    }, "s".repeat(32), encryptionKey) as { notification: Record<string, unknown> };

    expect(result.notification).toMatchObject({
      name: "홍길동",
      cohortName: "26기",
      email: "user@example.com",
      phone: "01012345678",
      slackChannelId: null,
    });
  });

  it("filters dismissed alerts in SQL before the bounded result limit", async () => {
    const db = seed();
    const now = Date.now();
    for (let index = 0; index < 101; index += 1) {
      db.raw.prepare('INSERT INTO "system_alerts" ("id","title","content","type","priority","startDate","endDate","isActive","createdBy","createdByName","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(`alert-${index}`, `알림 ${index}`, "내용", "notice", 101 - index, now - 1_000, now + 1_000_000, 1, "admin", "관리자", now, now);
    }
    db.raw.prepare('INSERT INTO "alert_dismissals" ("id","userId","alertId","dismissedAt","expiresAt","createdAt") VALUES (?,?,?,?,?,?)').run("dismiss-0", "user-1", "alert-0", now, now + 100_000, now);
    const result = await contentOperation(db, "active-alerts", { userId: "user-1" }, "s".repeat(32)) as { alerts: Array<{ id: string }> };
    expect(result.alerts).toHaveLength(100);
    expect(result.alerts.some((alert) => alert.id === "alert-0")).toBe(false);
    expect(result.alerts.some((alert) => alert.id === "alert-100")).toBe(true);
  });

  it("enforces one pending extension request with the migration index", () => {
    const db = seed();
    const timestamp = Date.now();
    db.raw.prepare('INSERT INTO "marketing_extension_requests" ("id","userId","requestDate","currentEndDate","newEndDate","requestMessage","status","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?)').run("request-1", "user-1", timestamp, timestamp, timestamp, "", "pending", timestamp, timestamp);
    expect(() => db.raw.prepare('INSERT INTO "marketing_extension_requests" ("id","userId","requestDate","currentEndDate","newEndDate","requestMessage","status","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?)').run("request-2", "user-1", timestamp, timestamp, timestamp, "", "pending", timestamp, timestamp)).toThrow();
  });
});

describe("content D1 Meta setup operations", () => {
  const secret = "s".repeat(32);
  const encryptionKey = Buffer.alloc(32, 7).toString("base64");
  const TOKEN_A = "EAAB-system-user-token-1234567890";
  const TOKEN_B = "THQW-threads-token-abcdefghijk";
  const op = (db: SQLiteDatabase, name: string, input: unknown) => contentOperation(db, name, input, secret, encryptionKey) as Promise<Record<string, any>>;
  const submissionRow = (db: SQLiteDatabase) => db.raw.prepare('SELECT * FROM "submissions" WHERE "userId" = ?').get("user-1") as Record<string, unknown> | undefined;
  const addAdmin = (db: SQLiteDatabase, id = "admin-1", role = "operator") => db.raw.prepare('INSERT INTO "admins" ("id","email","password","name","role","updatedAt") VALUES (?,?,?,?,?,?)').run(id, id + "@example.com", "hash", "운영자", role, 0);
  const request = { type: "instagram", loginId: "my_insta", password: "Sup3r-Secret-PW!", memo: "부탁드립니다" };
  const tokens = { MetaSystemUserToken: TOKEN_A, MetaThreadsToken: TOKEN_B };

  it("meta-setup-get returns an empty object before any submission row exists", async () => {
    expect(await op(seed(), "meta-setup-get", { userId: "user-1" })).toEqual({});
  });

  it("meta-setup-get rejects an unknown user and extra fields", async () => {
    await expect(op(seed(), "meta-setup-get", { userId: "nobody" })).rejects.toMatchObject({ status: 401 });
    await expect(op(seed(), "meta-setup-get", { userId: "user-1", extra: 1 })).rejects.toMatchObject({ status: 400 });
  });

  it("meta-setup-request stores the password encrypted and never as plain text", async () => {
    const db = seed();
    const result = await op(db, "meta-setup-request", { userId: "user-1", request });
    expect(result).toMatchObject({ success: true, updated: false, notification: { name: "홍길동", cohortName: "26기", email: "user@example.com" } });
    expect(typeof result.requestedAt).toBe("number");
    const row = submissionRow(db)!;
    expect(row.MetaSetupType).toBe("instagram");
    expect(row.InstagramID).toBe("my_insta");
    expect(row.MetaSetupMemo).toBe("부탁드립니다");
    expect(row.MetaSetupRequestedAt).toBe(result.requestedAt);
    expect(String(row.InstagramPW).startsWith("spenc:v1:")).toBe(true);
    expect(JSON.stringify(row)).not.toContain("Sup3r-Secret-PW!");
  });

  it("meta-setup-request uses the google columns for a google account", async () => {
    const db = seed();
    await op(db, "meta-setup-request", { userId: "user-1", request: { ...request, type: "google", loginId: "me@gmail.com" } });
    const row = submissionRow(db)!;
    expect(row.MetaSetupType).toBe("google");
    expect(row.MetaGoogleID).toBe("me@gmail.com");
    expect(String(row.MetaGooglePW).startsWith("spenc:v1:")).toBe(true);
    expect(row.InstagramPW ?? null).toBeNull();
  });

  it("meta-setup-request reports updated: true on the second request and keeps one row", async () => {
    const db = seed();
    const first = await op(db, "meta-setup-request", { userId: "user-1", request });
    const second = await op(db, "meta-setup-request", { userId: "user-1", request: { ...request, memo: null } });
    expect(first.updated).toBe(false);
    expect(second.updated).toBe(true);
    expect((db.raw.prepare('SELECT COUNT(*) AS n FROM "submissions" WHERE "userId" = ?').get("user-1") as { n: number }).n).toBe(1);
    expect(submissionRow(db)!.MetaSetupMemo).toBeNull();
  });

  it("meta-setup-request rejects invalid input and unknown users", async () => {
    const db = seed();
    await expect(op(db, "meta-setup-request", { userId: "user-1", request: { ...request, type: "naver" } })).rejects.toMatchObject({ status: 400 });
    await expect(op(db, "meta-setup-request", { userId: "user-1", request: { ...request, password: "" } })).rejects.toMatchObject({ status: 400 });
    await expect(op(db, "meta-setup-request", { userId: "nobody", request })).rejects.toMatchObject({ status: 401 });
    expect(submissionRow(db)).toBeUndefined();
  });

  it("meta-setup-get returns only the Meta columns", async () => {
    const db = seed();
    await op(db, "meta-setup-request", { userId: "user-1", request });
    db.raw.prepare('UPDATE "submissions" SET "브랜드명" = ? WHERE "userId" = ?').run("브랜드", "user-1");
    const row = await op(db, "meta-setup-get", { userId: "user-1" });
    expect(Object.keys(row).sort()).toEqual(["InstagramID", "InstagramPW", "MetaGoogleID", "MetaGooglePW", "MetaSetupDoneAt", "MetaSetupMemo", "MetaSetupRequestedAt", "MetaSetupType", "MetaSystemUserToken", "MetaThreadsToken", "MetaTokenEmailSentAt"]);
    expect(row.브랜드명).toBeUndefined();
    expect(row.InstagramID).toBe("my_insta");
  });

  it("meta-setup-complete requires an admin id", async () => {
    const db = seed();
    await expect(op(db, "meta-setup-complete", { adminId: "user-1", userId: "user-1", tokens })).rejects.toMatchObject({ status: 403 });
    await expect(op(db, "meta-setup-complete", { adminId: "ghost", userId: "user-1", tokens })).rejects.toMatchObject({ status: 403 });
    expect(submissionRow(db)).toBeUndefined();
  });

  it("meta-setup-complete rejects an admin row with an unknown role", async () => {
    const db = seed();
    addAdmin(db, "admin-x", "viewer");
    await expect(op(db, "meta-setup-complete", { adminId: "admin-x", userId: "user-1", tokens })).rejects.toMatchObject({ status: 403 });
  });

  it("meta-setup-complete rejects short tokens", async () => {
    const db = seed();
    addAdmin(db);
    await expect(op(db, "meta-setup-complete", { adminId: "admin-1", userId: "user-1", tokens: { ...tokens, MetaSystemUserToken: "short" } })).rejects.toMatchObject({ status: 400 });
  });

  it("meta-setup-complete stores both tokens encrypted and records the done time", async () => {
    const db = seed();
    addAdmin(db);
    await op(db, "meta-setup-request", { userId: "user-1", request });
    const result = await op(db, "meta-setup-complete", { adminId: "admin-1", userId: "user-1", tokens });
    expect(result).toMatchObject({ success: true, notification: { email: "user@example.com" } });
    const row = submissionRow(db)!;
    expect(row.MetaSetupDoneAt).toBe(result.doneAt);
    expect(String(row.MetaSystemUserToken).startsWith("spenc:v1:")).toBe(true);
    expect(String(row.MetaThreadsToken).startsWith("spenc:v1:")).toBe(true);
    expect(JSON.stringify(row)).not.toContain(TOKEN_A);
    expect(JSON.stringify(row)).not.toContain(TOKEN_B);
    expect(row.MetaSetupRequestedAt).toBeTruthy();
  });

  it("meta-setup-complete creates the submission row when the student never requested", async () => {
    const db = seed();
    addAdmin(db);
    await op(db, "meta-setup-complete", { adminId: "admin-1", userId: "user-1", tokens });
    expect(submissionRow(db)!.MetaSetupDoneAt).toBeTruthy();
  });

  it("meta-setup-email-sent requires an admin and records the sent time", async () => {
    const db = seed();
    addAdmin(db);
    await op(db, "meta-setup-request", { userId: "user-1", request });
    await expect(op(db, "meta-setup-email-sent", { adminId: "user-1", userId: "user-1", sentAt: 1_760_000_000_000 })).rejects.toMatchObject({ status: 403 });
    expect(submissionRow(db)!.MetaTokenEmailSentAt ?? null).toBeNull();
    expect(await op(db, "meta-setup-email-sent", { adminId: "admin-1", userId: "user-1", sentAt: 1_760_000_000_000 })).toEqual({ success: true });
    expect(submissionRow(db)!.MetaTokenEmailSentAt).toBe(1_760_000_000_000);
  });

  it("meta-setup-email-sent rejects a non-positive sentAt", async () => {
    const db = seed();
    addAdmin(db);
    await expect(op(db, "meta-setup-email-sent", { adminId: "admin-1", userId: "user-1", sentAt: 0 })).rejects.toMatchObject({ status: 400 });
  });
});

describe("content D1 Meta setup admin list", () => {
  const secret = "s".repeat(32);
  const op = (db: SQLiteDatabase, name: string, input: unknown) => contentOperation(db, name, input, secret) as Promise<Record<string, any>>;
  const PENDING_INDEX = "submissions_meta_setup_pending_requested_id";
  const DONE_INDEX = "submissions_meta_setup_done_done_id";

  function seedRequests() {
    const db = seed();
    db.raw.exec(readFileSync("prisma/d1/0013_meta_setup_admin_indexes.sql", "utf8"));
    db.raw.prepare('INSERT INTO "admins" ("id","email","password","name","role","updatedAt") VALUES (?,?,?,?,?,?)').run("admin-1", "admin-1@example.com", "hash", "운영자", "operator", 0);
    const addUser = (id: string, name: string) => db.raw.prepare('INSERT INTO "users" ("id","email","password","이름","연락처","cohortId","updatedAt") VALUES (?,?,?,?,?,?,?)').run(id, `${id}@example.com`, "hash", name, "01000000000", "cohort-1", 0);
    const addSubmission = (userId: string, columns: Record<string, string | number | null>) => {
      const keys = Object.keys(columns);
      db.raw.prepare(`INSERT INTO "submissions" ("id","userId",${keys.map((key) => `"${key}"`).join(",")},"createdAt","updatedAt") VALUES (?,?,${keys.map(() => "?").join(",")},0,0)`)
        .run(`sub-${userId}`, userId, ...keys.map((key) => columns[key]));
    };
    addUser("user-a", "가요청");
    addUser("user-b", "나요청");
    addUser("user-c", "다완료");
    addUser("user-d", "라없음");
    addSubmission("user-a", { MetaSetupType: "instagram", InstagramID: "insta_a", InstagramPW: "spenc:v1:aaa", MetaSetupMemo: "2단계 인증", MetaSetupRequestedAt: 3000, 브랜드명: "가브랜드" });
    addSubmission("user-b", { MetaSetupType: "google", MetaGoogleID: "b@gmail.com", MetaGooglePW: "spenc:v1:bbb", MetaSetupRequestedAt: 1000 });
    addSubmission("user-c", { MetaSetupType: "instagram", InstagramID: "insta_c", InstagramPW: "spenc:v1:ccc", MetaSetupRequestedAt: 2000, MetaSetupDoneAt: 5000, MetaTokenEmailSentAt: 5001, MetaSystemUserToken: "spenc:v1:tok1", MetaThreadsToken: "spenc:v1:tok2" });
    addSubmission("user-d", { 브랜드명: "요청 안 함" });
    return db;
  }

  it("requires an admin for the list and the count", async () => {
    const db = seedRequests();
    await expect(op(db, "meta-setup-admin-list", { adminId: "user-a", stage: "pending" })).rejects.toMatchObject({ status: 403 });
    await expect(op(db, "meta-setup-admin-count", { adminId: "ghost" })).rejects.toMatchObject({ status: 403 });
    await expect(op(db, "meta-setup-admin-list", { adminId: "admin-1", stage: "all" })).rejects.toMatchObject({ status: 400 });
  });

  it("lists pending requests oldest first without passwords or tokens", async () => {
    const result = await op(seedRequests(), "meta-setup-admin-list", { adminId: "admin-1", stage: "pending" });
    expect(result.items.map((item: { name: string }) => item.name)).toEqual(["나요청", "가요청"]);
    expect(result.counts).toEqual({ pending: 2, done: 1 });
    expect(result.nextCursor).toBeNull();
    expect(result.items[0]).toMatchObject({ userId: "user-b", type: "google", loginId: "b@gmail.com", hasPassword: true, cohortName: "26기", email: "user-b@example.com", requestedAt: 1000, doneAt: null });
    expect(result.items[1]).toMatchObject({ type: "instagram", loginId: "insta_a", memo: "2단계 인증", brandName: "가브랜드" });
    expect(JSON.stringify(result)).not.toContain("spenc:");
  });

  it("lists completed setups newest first with the mail time", async () => {
    const result = await op(seedRequests(), "meta-setup-admin-list", { adminId: "admin-1", stage: "done" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ userId: "user-c", doneAt: 5000, emailSentAt: 5001, hasPassword: true });
    expect(JSON.stringify(result)).not.toContain("spenc:");
  });

  it("pages with a signed cursor that only works for the same tab", async () => {
    const db = seedRequests();
    const first = await op(db, "meta-setup-admin-list", { adminId: "admin-1", stage: "pending", pageSize: 1 });
    expect(first.items.map((item: { userId: string }) => item.userId)).toEqual(["user-b"]);
    expect(typeof first.nextCursor).toBe("string");
    const second = await op(db, "meta-setup-admin-list", { adminId: "admin-1", stage: "pending", pageSize: 1, cursor: first.nextCursor });
    expect(second.items.map((item: { userId: string }) => item.userId)).toEqual(["user-a"]);
    expect(second.nextCursor).toBeNull();
    await expect(op(db, "meta-setup-admin-list", { adminId: "admin-1", stage: "done", pageSize: 1, cursor: first.nextCursor })).rejects.toThrow();
  });

  it("counts pending and done with the partial indexes", async () => {
    const db = seedRequests();
    expect(await op(db, "meta-setup-admin-count", { adminId: "admin-1" })).toEqual({ pending: 2, done: 1 });
    const plan = db.raw.prepare('EXPLAIN QUERY PLAN SELECT (SELECT COUNT(*) FROM "submissions" WHERE "MetaSetupRequestedAt" IS NOT NULL AND "MetaSetupDoneAt" IS NULL), (SELECT COUNT(*) FROM "submissions" WHERE "MetaSetupDoneAt" IS NOT NULL)').all() as Array<{ detail: string }>;
    const details = plan.map((row) => row.detail).join("\n");
    expect(details).toContain(PENDING_INDEX);
    expect(details).toContain(DONE_INDEX);
  });

  it("reads each tab through its partial index without a temporary sort", async () => {
    for (const [stage, index] of [["pending", PENDING_INDEX], ["done", DONE_INDEX]] as const) {
      const db = seedRequests();
      const seen: Array<{ sql: string; values: SqlValue[] }> = [];
      const prepare = db.prepare.bind(db);
      db.prepare = (sql: string) => {
        const statement = prepare(sql);
        const bind = statement.bind.bind(statement);
        statement.bind = (...values: SqlValue[]) => { seen.push({ sql, values }); return bind(...values); };
        return statement;
      };
      await op(db, "meta-setup-admin-list", { adminId: "admin-1", stage });
      const list = seen.find((entry) => entry.sql.includes("ORDER BY s."));
      expect(list).toBeDefined();
      const plan = db.raw.prepare(`EXPLAIN QUERY PLAN ${list!.sql}`).all(...list!.values) as Array<{ detail: string }>;
      const details = plan.map((row) => row.detail).join("\n");
      expect(details).toContain(index);
      expect(details).not.toContain("TEMP B-TREE");
    }
  });
});
