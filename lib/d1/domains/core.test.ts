import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { coreOperation } from "./core";

class SQLiteStatement implements Statement {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {}
  bind(...values: SqlValue[]): Statement { return new SQLiteStatement(this.db, this.sql, values); }
  async first<T>(): Promise<T | null> { return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null; }
  async all<T>(): Promise<QueryResult<T>> { const results = this.db.prepare(this.sql).all(...this.values) as T[]; const changes = Number((this.db.prepare('SELECT changes() AS n').get() as { n: number }).n); return { results, success: true, meta: { changes } }; }
}

class SQLiteDatabase implements Database {
  constructor(readonly raw: DatabaseSync) {}
  failBatchAt: number | undefined;
  prepare(sql: string): Statement { return new SQLiteStatement(this.raw, sql); }
  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    this.raw.exec("BEGIN");
    try {
      const changes: number[] = [];
      for (const [index, statement] of statements.entries()) {
        if (this.failBatchAt === index) throw new Error("injected batch failure");
        const local = statement as SQLiteStatement;
        this.raw.prepare(local.sql).run(...local.values);
        changes.push(Number((this.raw.prepare('SELECT changes() AS n').get() as { n: number }).n));
      }
      this.raw.exec("COMMIT");
      return statements.map((_, index) => ({ results: [], success: true, meta: { changes: changes[index] } }));
    } catch (error) { this.raw.exec("ROLLBACK"); throw error; }
  }
}

function database(): SQLiteDatabase {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0009_design_thread_indexes.sql", "utf8"));
  raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("cohort-test", "테스트 기수", 0, "월", 0, 0);
  raw.prepare('INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("user-test", "test@example.com", "hash", "홍길동", "01012345678", "cohort-test", 0);
  raw.prepare('INSERT INTO "submissions" ("id", "userId", "updatedAt") VALUES (?, ?, ?)').run("submission-test", "user-test", 0);
  return new SQLiteDatabase(raw);
}

function freshDatabase(): SQLiteDatabase {
  const db = database();
  db.raw.prepare('DELETE FROM "submissions" WHERE "userId" = ?').run("user-test");
  return db;
}

describe("coreOperation", () => {
  it("creates a missing submission before saving the first intake fields", async () => {
    const db = freshDatabase();
    const result = await coreOperation(db, "submission-save", { userId: "user-test", data: { 브랜드명: "첫 접수", 홈페이지스타일: "기본" }, now: 100 });

    expect((result as Record<string, unknown>).브랜드명).toBe("첫 접수");
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM submissions WHERE userId = ?').get("user-test")).toEqual({ count: 1 });
    expect(db.raw.prepare('SELECT type FROM workflows WHERE userId = ? ORDER BY type').all("user-test")).toEqual([
      { type: "로고" },
      { type: "홈페이지" },
    ]);
  });

  it("updates a missing submission without dropping the first fields", async () => {
    const db = freshDatabase();
    const result = await coreOperation(db, "submission-update", { userId: "user-test", data: { 브랜드명: "첫 자동저장" }, now: 200 }) as Record<string, unknown>;

    expect(result.브랜드명).toBe("첫 자동저장");
    expect(db.raw.prepare('SELECT 브랜드명, updatedAt FROM submissions WHERE userId = ?').get("user-test")).toEqual({ 브랜드명: "첫 자동저장", updatedAt: 200 });
  });

  it("keeps a concurrent first read safe when another writer creates the submission", async () => {
    const db = freshDatabase();
    const originalBatch = db.batch.bind(db);
    db.batch = async (statements) => {
      db.raw.prepare('INSERT INTO submissions (id, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run("racing-submission", "user-test", 50, 50);
      return originalBatch(statements);
    };

    const result = await coreOperation(db, "submission-get", { userId: "user-test" }) as Record<string, unknown>;
    expect(result.id).toBe("racing-submission");
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM submissions WHERE userId = ?').get("user-test")).toEqual({ count: 1 });
  });

  it("includes the shipping policy flag only in submission get responses", async () => {
    const db = database();
    db.raw.prepare('UPDATE cohorts SET 교육시작일 = ? WHERE id = ?').run(new Date("2026-08-13T00:00:00+09:00").getTime(), "cohort-test");
    const result = await coreOperation(db, "submission-get", { userId: "user-test" }) as Record<string, unknown>;
    expect(result._배송지필수).toBe(true);
    const saved = await coreOperation(db, "submission-save", { userId: "user-test", data: { 브랜드명: "테스트" }, now: 100 }) as Record<string, unknown>;
    expect(saved._배송지필수).toBeUndefined();
  });

  it("saves submission data and creates the gated workflows atomically", async () => {
    const db = database();
    const result = await coreOperation(db, "submission-save", { userId: "user-test", data: { 브랜드명: "테스트", 홈페이지스타일: "기본" }, now: 100 });
    expect((result as Record<string, unknown>).브랜드명).toBe("테스트");
    expect(db.raw.prepare('SELECT type, status FROM workflows WHERE userId = ? ORDER BY type').all("user-test")).toEqual([
      { type: "로고", status: "대기" },
      { type: "홈페이지", status: "제작 진행 중" },
    ]);
  });

  it("requests print workflows and marks the submission complete", async () => {
    const db = database();
    const result = await coreOperation(db, "request-print", { userId: "user-test", printTypes: ["명함", "명찰"], now: 100 });
    expect((result as { workflows: unknown[] }).workflows).toHaveLength(2);
    expect(db.raw.prepare('SELECT isComplete, completedAt FROM submissions WHERE userId = ?').get("user-test")).toEqual({ isComplete: 1, completedAt: 100 });
  });

  it("keeps design messages and thread state in one write batch", async () => {
    const db = database();
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "updatedAt") VALUES (?, ?, ?, ?, ?)').run("workflow-test", "user-test", "로고", "시안중", 0);
    const thread = await coreOperation(db, "design-thread-create", { workflowId: "workflow-test" }) as { id: string };
    const result = await coreOperation(db, "design-thread-message", { userId: "user-test", actorType: "admin", authorName: "관리자", threadId: thread.id, messageType: "design_upload", content: "시안", designUrl: "https://example.com/design.pdf" }) as { thread: { currentVersion: number } };
    expect(result.thread.currentVersion).toBe(1);
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM design_history WHERE workflowId = ?').get("workflow-test")).toEqual({ count: 1 });
  });

  it("enforces workflow order, feedback, save, and modal ownership rules", async () => {
    const db = database();
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "updatedAt") VALUES (?, ?, ?, ?, ?)').run("workflow-test", "user-test", "명함", "발주대기", 0);
    const orderAgreements = ["표기정보확인", "수정불가", "재제작비용부담", "인쇄색상차이확인"];
    const ordered = await coreOperation(db, "workflow-order", { userId: "user-test", workflowId: "workflow-test", agreements: orderAgreements, now: 100 });
    expect((ordered as { status: string }).status).toBe("발주요청");
    expect(ordered).toMatchObject({ __d1Meta: { allOrdersRequested: true, user: { 이름: "홍길동", cohortName: "테스트 기수" } } });
    expect(db.raw.prepare('SELECT 확정배송지, 확정수령인, 확정수령연락처, 확정동의항목 FROM workflows WHERE id = ?').get("workflow-test")).toEqual({ 확정배송지: null, 확정수령인: null, 확정수령연락처: null, 확정동의항목: JSON.stringify(orderAgreements) });
    const feedback = await coreOperation(db, "workflow-feedback", { userId: "user-test", workflowId: "workflow-test", feedback: "수정 요청", now: 200 });
    expect((feedback as { 수정횟수: number }).수정횟수).toBe(1);
    const saved = await coreOperation(db, "workflow-save", { userId: "user-test", workflowId: "workflow-test", workflowData: { brandName: "브랜드" }, isDraft: true, now: 300 });
    expect((saved as { workflow: { isDraft: boolean } }).workflow.isDraft).toBe(true);
    const dismissed = await coreOperation(db, "workflow-dismiss", { userId: "user-test", workflowId: "workflow-test", now: 400 });
    expect((dismissed as { expiresAt: number }).expiresAt).toBe(400 + 24 * 60 * 60 * 1000);
  });

  it("returns bounded user design thread pages and cursor-compatible detail history", async () => {
    const db = database();
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "updatedAt") VALUES (?, ?, ?, ?, ?)').run("workflow-test", "user-test", "로고", "시안중", 100);
    db.raw.prepare('INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("thread-test", "workflow-test", "pending", 1, 100, 100);
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "updatedAt") VALUES (?, ?, ?, ?, ?)').run("workflow-older", "user-test", "명함", "시안중", 99);
    db.raw.prepare('INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("thread-older", "workflow-older", "pending", 1, 99, 99);
    for (let index = 0; index < 3; index += 1) {
      db.raw.prepare('INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`message-${index}`, "thread-test", "user-test", "admin", "관리자", "message", `메시지 ${index}`, "[]", 100 + index);
    }
    const list = await coreOperation(db, "design-threads-list", { userId: "user-test", pageSize: 1, cursorSecret: "0123456789abcdef0123456789abcdef" }) as { threads: Array<Record<string, unknown>>; nextCursor?: string };
    expect(list.threads).toHaveLength(1);
    expect(list.threads[0]).toMatchObject({ workflow: { user: { id: "user-test" } }, lastMessage: { id: "message-2" } });
    expect(list.nextCursor).toBeTruthy();
    const detail = await coreOperation(db, "design-thread-get", { userId: "user-test", threadId: "thread-test", pageSize: 1, cursorSecret: "0123456789abcdef0123456789abcdef" }) as { workflow: { type: string; user: { id: string } }; messages: Array<{ id: string }>; messagesNextCursor?: string };
    expect(detail.workflow).toMatchObject({ type: "로고", user: { id: "user-test" } });
    expect(detail.messages[0]?.id).toBe("message-2");
    expect(detail.messagesNextCursor).toBeTruthy();
    expect(db.raw.prepare('SELECT "unreadByUser" FROM "design_thread_counters" WHERE "threadId" = ?').get("thread-test")).toEqual({ unreadByUser: 2 });
  });

  it("locks shipping fields after a print order while allowing the same values", async () => {
    const db = database();
    db.raw.prepare('UPDATE submissions SET 인쇄물받을주소 = ?, 받는분이름 = ?, 수령연락처 = ?, 우편번호 = ? WHERE userId = ?')
      .run("서울시 중구 세종대로 1", "홍길동", "010-1234-5678", "04524", "user-test");
    db.raw.prepare('INSERT INTO workflows (id, userId, type, status, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run("ordered-print", "user-test", "명함", "발주요청", 0);

    await expect(coreOperation(db, "submission-save", {
      userId: "user-test",
      data: { 인쇄물받을주소: "서울시 중구 세종대로 2" },
      now: 100,
    })).rejects.toMatchObject({ status: 409 });
    await expect(coreOperation(db, "submission-update", {
      userId: "user-test",
      data: { 인쇄물받을주소: "서울시 중구 세종대로 1", 받는분이름: "홍길동" },
      now: 200,
    })).resolves.toBeTruthy();
  });

  it("rejects a stale approval without writing its workflow log", async () => {
    const db = database();
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "updatedAt") VALUES (?, ?, ?, ?, ?)').run("approve-race", "user-test", "로고", "시안컨펌요청", 0);
    const originalBatch = db.batch.bind(db);
    db.batch = async (statements) => {
      db.raw.prepare('UPDATE "workflows" SET "status" = ? WHERE "id" = ?').run("최종확정", "approve-race");
      return originalBatch(statements);
    };

    await expect(coreOperation(db, "workflow-approve", {
      userId: "user-test",
      workflowId: "approve-race",
      agreements: ["표기정보확인", "수정불가", "재제작비용부담"],
      now: 500,
    })).rejects.toMatchObject({ status: 409 });
    expect(db.raw.prepare('SELECT status FROM workflows WHERE id = ?').get("approve-race")).toEqual({ status: "최종확정" });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM workflow_logs WHERE workflowId = ?').get("approve-race")).toEqual({ count: 0 });
  });

  it("rejects a stale feedback without creating communication records", async () => {
    const db = database();
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "수정횟수", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("feedback-race", "user-test", "로고", "시안중", 0, 0);
    const originalBatch = db.batch.bind(db);
    db.batch = async (statements) => {
      db.raw.prepare('UPDATE "workflows" SET "수정횟수" = ?, "feedbackDate" = ?, "updatedAt" = ? WHERE "id" = ?').run(1, 499, 499, "feedback-race");
      return originalBatch(statements);
    };

    await expect(coreOperation(db, "workflow-feedback", {
      userId: "user-test",
      workflowId: "feedback-race",
      feedback: "동시 수정 요청",
      now: 500,
    })).rejects.toMatchObject({ status: 409 });
    expect(db.raw.prepare('SELECT 수정횟수, feedbackDate FROM workflows WHERE id = ?').get("feedback-race")).toEqual({ 수정횟수: 1, feedbackDate: 499 });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM communication_threads WHERE userId = ?').get("user-test")).toEqual({ count: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM communication_messages WHERE authorId = ?').get("user-test")).toEqual({ count: 0 });
  });

  it("rolls back feedback and dependent communication writes as one batch", async () => {
    const db = database();
    db.raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "수정횟수", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("feedback-rollback", "user-test", "로고", "시안중", 0, 0);
    db.failBatchAt = 1;

    await expect(coreOperation(db, "workflow-feedback", {
      userId: "user-test",
      workflowId: "feedback-rollback",
      feedback: "롤백 확인",
      now: 600,
    })).rejects.toThrow("injected batch failure");
    expect(db.raw.prepare('SELECT 수정횟수, feedbackDate, updatedAt FROM workflows WHERE id = ?').get("feedback-rollback")).toEqual({ 수정횟수: 0, feedbackDate: null, updatedAt: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM communication_threads WHERE userId = ?').get("user-test")).toEqual({ count: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS count FROM communication_messages WHERE authorId = ?').get("user-test")).toEqual({ count: 0 });
  });
});
