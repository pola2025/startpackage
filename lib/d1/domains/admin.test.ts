import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Database, type QueryResult, type SqlValue, type Statement } from "../database";
import { adminOperation } from "./admin";

class SQLiteStatement implements Statement {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {}

  bind(...values: SqlValue[]): Statement { return new SQLiteStatement(this.db, this.sql, values); }

  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }

  async all<T>(): Promise<QueryResult<T>> {
    const result = this.db.prepare(this.sql).all(...this.values) as T[];
    return { results: result, success: true, meta: { rows_read: result.length, changes: 0 } };
  }
}

class SQLiteDatabase implements Database {
  constructor(private readonly raw: DatabaseSync, private readonly beforeBatch?: () => void) {}

  prepare(sql: string): Statement { return new SQLiteStatement(this.raw, sql); }

  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    this.beforeBatch?.();
    this.raw.exec("BEGIN");
    try {
      const results = statements.map((statement) => {
        const local = statement as SQLiteStatement;
        const result = this.raw.prepare(local.sql).run(...local.values);
        return { results: [], success: true, meta: { rows_written: result.changes, changes: result.changes } } as QueryResult<T>;
      });
      this.raw.exec("COMMIT");
      return results;
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
  }
}

function fixture(beforeBatch?: () => void) {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0009_design_thread_indexes.sql", "utf8"));
  raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("cohort-1", "테스트", 0, "월", 0, 0);
  raw.prepare('INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "updatedAt", "marketingSupportEndDate") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run("user-1", "user@example.com", "hash", "테스트 사용자", "01012345678", "cohort-1", 0, 1000);
  raw.prepare('INSERT INTO "submissions" ("id", "userId", "브랜드명", "홈페이지제작방식", "홈페이지스타일", "홈페이지컬러컨셉", "도메인관리PW", "GmailPW", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run("submission-1", "user-1", "테스트 브랜드", "외부서비스", "https://example.test/style", "#315680", "masked-domain", "masked-gmail", 0);
  raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("workflow-1", "user-1", "명함", "시안중", 100, 100);
  raw.prepare('INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("thread-1", "workflow-1", "pending", 1, 100, 200);
  raw.prepare('INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "isReadByAdmin", "isReadByUser", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run("message-1", "thread-1", "user-1", "user", "테스트 사용자", "message", "수정 요청", "[]", 0, 1, 150);
  raw.prepare('INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "isReadByAdmin", "isReadByUser", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run("message-2", "thread-1", "admin-1", "admin", "운영자", "message", "확인했습니다", "[]", 1, 0, 200);
  raw.prepare('INSERT INTO "admins" ("id", "email", "password", "name", "role", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("admin-1", "admin@example.com", "hash", "운영자", "operator", 0);
  raw.prepare('INSERT INTO "marketing_extension_requests" ("id", "userId", "currentEndDate", "newEndDate", "status", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("request-1", "user-1", 1000, 2000, "pending", 0);
  return { raw, db: new SQLiteDatabase(raw, beforeBatch) };
}

describe("admin marketing extension operations", () => {
  it("provides bounded design thread query plans for filters, latest messages, and counters", () => {
    const { raw } = fixture();
    const explain = (where: string, ...values: string[]) => raw.prepare(`EXPLAIN QUERY PLAN SELECT dc."threadId" FROM "design_thread_counters" dc WHERE ${where} ORDER BY dc."updatedAt" DESC, dc."threadId" DESC LIMIT 10`).all(...values).map((row) => String(row.detail)).join(" ");
    const plans = [
      explain("1"),
      explain('dc."status" = ?', "pending"),
      explain('dc."workflowType" = ?', "명함"),
      explain('dc."workflowType" = ? AND dc."status" = ?', "명함", "pending"),
      explain('dc."userId" = ?', "user-1"),
      explain('dc."userId" = ? AND dc."status" = ?', "user-1", "pending"),
      explain('dc."userId" = ? AND dc."workflowType" = ?', "user-1", "명함"),
      explain('dc."userId" = ? AND dc."workflowType" = ? AND dc."status" = ?', "user-1", "명함", "pending"),
    ];
    const latestPlan = raw.prepare('EXPLAIN QUERY PLAN SELECT lm."id" FROM "design_thread_messages" lm WHERE lm."threadId" = ? ORDER BY lm."createdAt" DESC, lm."id" DESC LIMIT 1').all("thread-1") as Array<{ detail: string }>;
    expect(plans.every((plan) => !plan.includes("TEMP B-TREE"))).toBe(true);
    expect(plans[0]).toContain("design_thread_counters_updated_id_idx");
    expect(plans[1]).toContain("design_thread_counters_status_updated_id_idx");
    expect(plans[2]).toContain("design_thread_counters_type_updated_id_idx");
    expect(plans[3]).toContain("design_thread_counters_type_status_updated_id_idx");
    expect(plans[4]).toContain("design_thread_counters_user_updated_id_idx");
    expect(plans[5]).toContain("design_thread_counters_user_status_updated_id_idx");
    expect(plans[6]).toContain("design_thread_counters_user_type_updated_id_idx");
    expect(plans[7]).toContain("design_thread_counters_user_type_status_updated_id_idx");
    expect(latestPlan.map((row) => row.detail).join(" ")).toContain("design_thread_messages_thread_created_id_keyset");
    expect(raw.prepare('EXPLAIN QUERY PLAN SELECT "unreadByAdmin" FROM "design_thread_counters" WHERE "threadId" = ?').all("thread-1").map((row) => String(row.detail)).join(" ")).toContain("sqlite_autoindex_design_thread_counters_1");
  });

  it("keeps the unread counter exact across read and author changes", () => {
    const { raw } = fixture();
    expect(raw.prepare('SELECT "unreadByAdmin" FROM "design_thread_counters" WHERE "threadId" = ?').get("thread-1")).toEqual({ unreadByAdmin: 1 });
    raw.prepare('UPDATE "design_thread_messages" SET "authorType" = ? WHERE "id" = ?').run("admin", "message-1");
    expect(raw.prepare('SELECT "unreadByAdmin" FROM "design_thread_counters" WHERE "threadId" = ?').get("thread-1")).toEqual({ unreadByAdmin: 0 });
    raw.prepare('UPDATE "design_thread_messages" SET "authorType" = ? WHERE "id" = ?').run("user", "message-1");
    expect(raw.prepare('SELECT "unreadByAdmin" FROM "design_thread_counters" WHERE "threadId" = ?').get("thread-1")).toEqual({ unreadByAdmin: 1 });
  });

  it("returns homepage users with cohort and submission details", async () => {
    const { db } = fixture();
    const result = await adminOperation(db, "homepage-users-list", {
      adminId: "admin-1",
      pageSize: 10,
      cursorSecret: "0123456789abcdef0123456789abcdef",
    }) as { items: Array<Record<string, unknown>> };
    expect(result.items[0]).toMatchObject({
      id: "user-1",
      cohort: { id: "cohort-1", name: "테스트" },
      submission: {
        브랜드명: "테스트 브랜드",
        홈페이지제작방식: "외부서비스",
        홈페이지스타일: "https://example.test/style",
        홈페이지컬러컨셉: "#315680",
      },
      homepageWorkflow: null,
    });
  });

  it("lists and opens admin design threads with unread state and bounded messages", async () => {
    const { db, raw } = fixture();
    const list = await adminOperation(db, "design-threads-list", {
      adminId: "admin-1", pageSize: 10, cursorSecret: "0123456789abcdef0123456789abcdef",
    }) as { threads: Array<Record<string, unknown>> };
    expect(list.threads[0]).toMatchObject({
      id: "thread-1",
      workflow: { type: "명함", user: { id: "user-1", 이름: "테스트 사용자", cohort: { name: "테스트" } } },
      unreadCount: 1,
      lastMessage: { id: "message-2", content: "확인했습니다" },
    });
    const detail = await adminOperation(db, "design-thread-get", {
      adminId: "admin-1", threadId: "thread-1", pageSize: 1, cursorSecret: "0123456789abcdef0123456789abcdef",
    }) as { thread: { workflow: { user: { submission: { 브랜드명: string } } }; messages: Array<{ id: string }> } };
    expect(detail.thread.workflow.user.submission.브랜드명).toBe("테스트 브랜드");
    expect(detail.thread.messages).toHaveLength(1);
    expect(raw.prepare('SELECT "isReadByAdmin" FROM "design_thread_messages" WHERE "id" = ?').get("message-1")).toEqual({ isReadByAdmin: 0 });
  });

  it("updates the request and user end date together on approval", async () => {
    const { db, raw } = fixture();
    const result = await adminOperation(db, "extension-approve", { adminId: "admin-1", id: "request-1", adminResponse: "확인" }) as Record<string, unknown>;
    expect(result.status).toBe("approved");
    expect(raw.prepare('SELECT "status", "adminResponse" FROM "marketing_extension_requests" WHERE "id" = ?').get("request-1")).toEqual({ status: "approved", adminResponse: "확인" });
    expect(raw.prepare('SELECT "marketingSupportEndDate" FROM "users" WHERE "id" = ?').get("user-1")).toEqual({ marketingSupportEndDate: 2000 });
  });

  it("does not mutate the end date when reject wins the approval race", async () => {
    const { raw, db } = fixture(() => {
      raw.prepare('UPDATE "marketing_extension_requests" SET "status" = ?, "adminResponse" = ? WHERE "id" = ? AND "status" = ?').run("rejected", "먼저 처리됨", "request-1", "pending");
    });
    await expect(adminOperation(db, "extension-approve", { adminId: "admin-1", id: "request-1" })).rejects.toMatchObject({ status: 409 });
    expect(raw.prepare('SELECT "status" FROM "marketing_extension_requests" WHERE "id" = ?').get("request-1")).toEqual({ status: "rejected" });
    expect(raw.prepare('SELECT "marketingSupportEndDate" FROM "users" WHERE "id" = ?').get("user-1")).toEqual({ marketingSupportEndDate: 1000 });
  });

  it("rejects an already approved request without changing the approved end date", async () => {
    const { db, raw } = fixture();
    await adminOperation(db, "extension-approve", { adminId: "admin-1", id: "request-1" });
    await expect(adminOperation(db, "extension-reject", { adminId: "admin-1", id: "request-1", adminResponse: "재검토" })).rejects.toMatchObject({ status: 400 });
    expect(raw.prepare('SELECT "marketingSupportEndDate" FROM "users" WHERE "id" = ?').get("user-1")).toEqual({ marketingSupportEndDate: 2000 });
  });
});
