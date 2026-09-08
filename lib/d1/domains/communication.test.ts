import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { communicationOperation } from "./communication";

class S implements Statement { constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {} bind(...values: SqlValue[]): Statement { return new S(this.db, this.sql, values); } async first<T>(): Promise<T | null> { return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null; } async all<T>(): Promise<QueryResult<T>> { return { results: this.db.prepare(this.sql).all(...this.values) as T[], success: true, meta: {} }; } }
class D implements Database { constructor(readonly raw: DatabaseSync) {} prepare(sql: string): Statement { return new S(this.raw, sql); } async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> { this.raw.exec("BEGIN"); try { for (const statement of statements) { const s = statement as S; this.raw.prepare(s.sql).run(...s.values); } this.raw.exec("COMMIT"); return statements.map(() => ({ results: [], success: true, meta: { changes: 1 } })); } catch (error) { this.raw.exec("ROLLBACK"); throw error; } } }
function db(): D { const raw = new DatabaseSync(":memory:"); raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8")); raw.exec(readFileSync("prisma/d1/0007_communication_counters.sql", "utf8")); raw.prepare('INSERT INTO cohorts (id,name,"교육시작일","교육요일","자료제출마감일",updatedAt) VALUES (?,?,?,?,?,?)').run("cohort", "테스트", 0, "월", 0, 0); raw.prepare('INSERT INTO users (id,email,password,"이름","연락처",cohortId,updatedAt) VALUES (?,?,?,?,?,?,?)').run("user", "u@example.com", "hash", "사용자", "01012345678", "cohort", 0); raw.prepare('INSERT INTO admins (id,email,password,name,role,updatedAt) VALUES (?,?,?,?,?,?)').run("admin", "a@example.com", "hash", "관리자", "operator", 0); return new D(raw); }
beforeEach(() => { process.env.D1_CURSOR_SECRET = "communication-test-secret-32-characters"; });

describe("communicationOperation", () => {
  it("creates a thread and two messages atomically", async () => { const database = db(); const result = await communicationOperation(database, "user-create-thread", { userId: "user", title: "문의", content: "내용" }) as { messages: unknown[]; thread: { userId: string } }; expect(result.thread.userId).toBe("user"); expect(result.messages).toHaveLength(2); });
  it("enforces ownership and returns a signed cursor page", async () => { const database = db(); await communicationOperation(database, "user-create-thread", { userId: "user", title: "문의", content: "내용" }); await expect(communicationOperation(database, "user-messages", { userId: "other", threadId: "missing" })).rejects.toMatchObject({ status: 403 }); const page = await communicationOperation(database, "user-threads", { userId: "user", pageSize: 1 }) as { items: unknown[]; nextCursor?: string }; expect(page.items).toHaveLength(1); expect(page.nextCursor).toBeUndefined(); });
  it("uses admin identity from admins and keeps list bounded", async () => { const database = db(); const result = await communicationOperation(database, "admin-create-thread", { adminId: "admin", targetUserId: "user", title: "안내", content: "답변" }) as { message: { authorType: string } }; expect(result.message.authorType).toBe("admin"); const page = await communicationOperation(database, "admin-threads", { adminId: "admin", pageSize: 1 }) as { items: unknown[] }; expect(page.items).toHaveLength(1); });
  it("commits workflow, design thread, design message, and linked reply together", async () => { const database = db(); const result = await communicationOperation(database, "admin-create-design-thread", { adminId: "admin", userId: "user", workflowType: "명함", message: "시안 안내", designUrl: "https://example.com/design.pdf" }) as { workflow: { status: string }; designThread: { currentVersion: number }; message: { messageType: string } }; expect(result.workflow.status).toBe("시안중"); expect(result.designThread.currentVersion).toBe(1); expect(result.message.messageType).toBe("design_upload"); });
  it("maintains user, thread, and global unread counters across read and delete", async () => {
    const database = db();
    const created = await communicationOperation(database, "user-create-thread", { userId: "user", title: "문의", content: "내용" }) as { thread: { id: string } };
    const threadId = created.thread.id;
    expect(database.raw.prepare('SELECT messageCount, unreadByUser, unreadByAdmin FROM communication_thread_counters WHERE threadId = ?').get(threadId)).toMatchObject({ messageCount: 2, unreadByUser: 0, unreadByAdmin: 1 });
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user")).toMatchObject({ unreadCount: 0 });
    expect(database.raw.prepare('SELECT unreadByAdmin FROM communication_global_counters WHERE id = 1').get()).toMatchObject({ unreadByAdmin: 1 });
    const reply = await communicationOperation(database, "admin-reply", { adminId: "admin", threadId, content: "답변" }) as { message: { id: string; isReadByUser: boolean; createdAt: string } };
    expect(reply.message.isReadByUser).toBe(false);
    expect(reply.message.createdAt).toMatch(/T/);
    expect(database.raw.prepare('SELECT messageCount, unreadByUser, unreadByAdmin FROM communication_thread_counters WHERE threadId = ?').get(threadId)).toMatchObject({ messageCount: 3, unreadByUser: 1, unreadByAdmin: 1 });
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user")).toMatchObject({ unreadCount: 1 });
    await communicationOperation(database, "user-mark-read", { userId: "user", threadId });
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user")).toMatchObject({ unreadCount: 0 });
    expect(database.raw.prepare('SELECT unreadByUser FROM communication_thread_counters WHERE threadId = ?').get(threadId)).toMatchObject({ unreadByUser: 0 });
    database.raw.prepare('DELETE FROM communication_messages WHERE id = ?').run(reply.message.id);
    expect(database.raw.prepare('SELECT messageCount, unreadByUser, unreadByAdmin FROM communication_thread_counters WHERE threadId = ?').get(threadId)).toMatchObject({ messageCount: 2, unreadByUser: 0, unreadByAdmin: 1 });
  });
  it("binds admin cursors to their status and category filters", async () => {
    const database = db();
    await communicationOperation(database, "admin-create-thread", { adminId: "admin", targetUserId: "user", title: "첫 문의", content: "답변", category: "일반" });
    await communicationOperation(database, "admin-create-thread", { adminId: "admin", targetUserId: "user", title: "두번째 문의", content: "답변", category: "인쇄" });
    const page = await communicationOperation(database, "admin-threads", { adminId: "admin", category: "일반", pageSize: 1 }) as { nextCursor?: string };
    expect(page.nextCursor).toBeUndefined();
    const database2 = db();
    await communicationOperation(database2, "admin-create-thread", { adminId: "admin", targetUserId: "user", title: "첫 문의", content: "답변", category: "일반" });
    await communicationOperation(database2, "admin-create-thread", { adminId: "admin", targetUserId: "user", title: "두번째 문의", content: "답변", category: "일반" });
    const paged = await communicationOperation(database2, "admin-threads", { adminId: "admin", category: "일반", pageSize: 1 }) as { nextCursor?: string };
    expect(paged.nextCursor).toBeTruthy();
    await expect(communicationOperation(database2, "admin-threads", { adminId: "admin", category: "인쇄", pageSize: 1, cursor: paged.nextCursor })).rejects.toThrow(/cursor scope or sort key/);
  });
  it("keeps counters correct when a thread is reassigned or cascaded away", async () => {
    const database = db();
    database.raw.prepare('INSERT INTO users (id,email,password,"이름","연락처",cohortId,updatedAt) VALUES (?,?,?,?,?,?,?)').run("user-two", "two@example.com", "hash", "두번째 사용자", "01000000000", "cohort", 0);
    const created = await communicationOperation(database, "user-create-thread", { userId: "user", title: "문의", content: "내용" }) as { thread: { id: string } };
    const threadId = created.thread.id;
    await communicationOperation(database, "admin-reply", { adminId: "admin", threadId, content: "답변" });
    database.raw.prepare('UPDATE communication_threads SET userId = ? WHERE id = ?').run("user-two", threadId);
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user")).toMatchObject({ unreadCount: 0 });
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user-two")).toMatchObject({ unreadCount: 1 });
    database.raw.prepare('DELETE FROM communication_threads WHERE id = ?').run(threadId);
    expect(database.raw.prepare('SELECT COUNT(*) AS count FROM communication_thread_counters WHERE threadId = ?').get(threadId)).toMatchObject({ count: 0 });
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user-two")).toMatchObject({ unreadCount: 0 });
    expect(database.raw.prepare('SELECT unreadByAdmin FROM communication_global_counters WHERE id = 1').get()).toMatchObject({ unreadByAdmin: 0 });
  });
  it("does not retain a user counter when the owning user is deleted", async () => {
    const database = db();
    const created = await communicationOperation(database, "user-create-thread", { userId: "user", title: "문의", content: "내용" }) as { thread: { id: string } };
    await communicationOperation(database, "admin-reply", { adminId: "admin", threadId: created.thread.id, content: "답변" });
    expect(database.raw.prepare('SELECT unreadCount FROM communication_user_counters WHERE userId = ?').get("user")).toMatchObject({ unreadCount: 1 });
    database.raw.prepare('DELETE FROM users WHERE id = ?').run("user");
    expect(database.raw.prepare('SELECT COUNT(*) AS count FROM communication_user_counters WHERE userId = ?').get("user")).toMatchObject({ count: 0 });
    expect(database.raw.prepare('SELECT COUNT(*) AS count FROM communication_thread_counters WHERE threadId = ?').get(created.thread.id)).toMatchObject({ count: 0 });
    expect(database.raw.prepare('SELECT unreadByAdmin FROM communication_global_counters WHERE id = 1').get()).toMatchObject({ unreadByAdmin: 0 });
  });
});
