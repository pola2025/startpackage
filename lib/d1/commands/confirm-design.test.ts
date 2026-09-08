import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { DataServiceError } from "../database";
import { confirmDesign } from "./confirm-design";

class SQLiteStatement implements Statement {
  constructor(
    private readonly db: DatabaseSync,
    readonly sql: string,
    readonly values: SqlValue[] = [],
  ) {}

  bind(...values: SqlValue[]): Statement {
    return new SQLiteStatement(this.db, this.sql, values);
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values) as T | undefined;
    return row ?? null;
  }

  async all<T>(): Promise<QueryResult<T>> {
    const rows = this.db.prepare(this.sql).all(...this.values) as T[];
    return { results: rows, success: true, meta: { rows_read: rows.length } };
  }
}

class SQLiteDatabase implements Database {
  constructor(
    private readonly raw: DatabaseSync,
    private readonly beforeBatch?: () => void,
  ) {}

  prepare(sql: string): Statement {
    return new SQLiteStatement(this.raw, sql);
  }

  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    this.beforeBatch?.();
    this.raw.exec("BEGIN");
    try {
      for (const statement of statements) {
        const local = statement as SQLiteStatement;
        this.raw.prepare(local.sql).run(...local.values);
      }
      this.raw.exec("COMMIT");
      return statements.map(() => ({ results: [], success: true, meta: { rows_written: 1 } }));
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
  }
}

function seed(beforeBatch?: () => void): { raw: DatabaseSync; db: Database } {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.prepare(
    'INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
  ).run("cohort-1", "26기", 1788825600000, "월", 0, 0);
  raw.prepare(
    'INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run("user-1", "user@example.com", "hash", "홍길동", "01012345678", "cohort-1", 0);
  raw.prepare(
    'INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
  ).run("workflow-1", "user-1", "명함", "시안중", 0, 0);
  raw.prepare(
    'INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "updatedAt") VALUES (?, ?, ?, ?, ?)',
  ).run("thread-1", "workflow-1", "uploaded", 2, 0);
  raw.prepare(
    'INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "designVersion", "designUrl", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run("design-1", "thread-1", "admin-1", "admin", "관리자", "design_upload", "2차 시안", "[]", 2, "https://r2.example/design.pdf", 100);
  return { raw, db: new SQLiteDatabase(raw, beforeBatch) };
}

const validInput = {
  userId: "user-1",
  threadId: "thread-1",
  shipping: {
    인쇄물받을주소: "서울시 중구 세종대로 1",
    받는분이름: "홍길동",
    수령연락처: "010-1234-5678",
    우편번호: "04524",
  },
  agreements: ["표기정보확인", "수정불가", "재제작비용부담", "인쇄색상차이확인"],
};

function counts(raw: DatabaseSync) {
  return {
    messages: raw.prepare('SELECT COUNT(*) AS count FROM "design_thread_messages"').get(),
    logs: raw.prepare('SELECT COUNT(*) AS count FROM "workflow_logs"').get(),
  };
}

describe("confirmDesign", () => {
  it("writes the confirmation message, snapshot, status, and log atomically", async () => {
    const { raw, db } = seed();
    const result = await confirmDesign(db, validInput);
    expect(result.workflowStatus).toBe("발주요청");
    expect(raw.prepare('SELECT "status", "confirmedByName" FROM "design_threads" WHERE "id" = ?').get("thread-1")).toEqual({ status: "confirmed", confirmedByName: "홍길동" });
    expect(raw.prepare('SELECT "status", "시안URL", "확정배송지" FROM "workflows" WHERE "id" = ?').get("workflow-1")).toMatchObject({ status: "발주요청", 시안URL: "https://r2.example/design.pdf", 확정배송지: "04524 서울시 중구 세종대로 1" });
    expect(raw.prepare('SELECT "messageType", "content" FROM "design_thread_messages" WHERE "id" = ?').get(result.messageId)).toEqual({ messageType: "confirmation", content: "2차 시안으로 최종 확정합니다." });
    expect(raw.prepare('SELECT "action", "newStatus" FROM "workflow_logs"').get()).toEqual({ action: "시안확정", newStatus: "발주요청" });
  });

  it("rejects owner, agreement, and shipping failures without writes", async () => {
    const wrongOwner = seed();
    await expect(confirmDesign(wrongOwner.db, { ...validInput, userId: "other-user" })).rejects.toMatchObject({ status: 404 });
    expect(counts(wrongOwner.raw)).toEqual({ messages: { count: 1 }, logs: { count: 0 } });

    const missingAgreement = seed();
    await expect(confirmDesign(missingAgreement.db, { ...validInput, agreements: [] })).rejects.toMatchObject({ status: 400 });
    expect(counts(missingAgreement.raw)).toEqual({ messages: { count: 1 }, logs: { count: 0 } });

    const badShipping = seed();
    await expect(confirmDesign(badShipping.db, { ...validInput, shipping: { ...validInput.shipping, 수령연락처: "010" } })).rejects.toMatchObject({ status: 400 });
    expect(counts(badShipping.raw)).toEqual({ messages: { count: 1 }, logs: { count: 0 } });
  });

  it("rejects a second confirmation and preserves one message", async () => {
    const { raw, db } = seed();
    await confirmDesign(db, validInput);
    await expect(confirmDesign(db, validInput)).rejects.toMatchObject({ status: 400 });
    expect(counts(raw)).toEqual({ messages: { count: 2 }, logs: { count: 1 } });
  });

  it("rolls back every write when the fresh version becomes stale before batch", async () => {
    const { raw, db } = seed(() => {
      raw.prepare('UPDATE "design_threads" SET "status" = ? WHERE "id" = ?').run("confirmed", "thread-1");
    });
    await expect(confirmDesign(db, validInput)).rejects.toBeInstanceOf(DataServiceError);
    expect(counts(raw)).toEqual({ messages: { count: 1 }, logs: { count: 0 } });
    expect(raw.prepare('SELECT "status" FROM "workflows" WHERE "id" = ?').get("workflow-1")).toEqual({ status: "시안중" });
  });

  it("rolls back when ownership changes after the fresh read", async () => {
    const { raw, db } = seed(() => {
      raw.prepare(
        'INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run("user-2", "other@example.com", "hash", "다른사용자", "01099998888", "cohort-1", 0);
      raw.prepare('UPDATE "workflows" SET "userId" = ? WHERE "id" = ?').run("user-2", "workflow-1");
    });
    await expect(confirmDesign(db, validInput)).rejects.toBeInstanceOf(DataServiceError);
    expect(counts(raw)).toEqual({ messages: { count: 1 }, logs: { count: 0 } });
    expect(raw.prepare('SELECT "status" FROM "design_threads" WHERE "id" = ?').get("thread-1")).toEqual({ status: "uploaded" });
  });

  it("rolls back when the newest design changes without a version bump", async () => {
    const { raw, db } = seed(() => {
      raw.prepare(
        'INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "designVersion", "designUrl", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run("design-2", "thread-1", "admin-1", "admin", "관리자", "design_upload", "교체된 2차 시안", "[]", 2, "https://r2.example/replaced.pdf", 200);
    });
    await expect(confirmDesign(db, validInput)).rejects.toBeInstanceOf(DataServiceError);
    expect(counts(raw)).toEqual({ messages: { count: 2 }, logs: { count: 0 } });
    expect(raw.prepare('SELECT "status", "시안URL" FROM "workflows" WHERE "id" = ?').get("workflow-1")).toEqual({ status: "시안중", 시안URL: null });
  });
});
