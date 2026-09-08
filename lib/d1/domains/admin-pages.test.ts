import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { adminPagesOperation } from "./admin-pages";

class SQLiteStatement implements Statement {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {}
  bind(...values: SqlValue[]): Statement { return new SQLiteStatement(this.db, this.sql, values); }
  async first<T>(): Promise<T | null> { return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null; }
  async all<T>(): Promise<QueryResult<T>> { return { results: this.db.prepare(this.sql).all(...this.values) as T[], success: true, meta: {} }; }
}

class SQLiteDatabase implements Database {
  constructor(readonly raw: DatabaseSync) {}
  prepare(sql: string): Statement { return new SQLiteStatement(this.raw, sql); }
  async batch<T = Record<string, unknown>>(): Promise<QueryResult<T>[]> { return []; }
}

function database(): SQLiteDatabase {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0006_admin_pages.sql", "utf8"));
  raw.prepare('INSERT INTO "admins" ("id", "email", "password", "name", "role", "twoFactorEnabled", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("admin-1", "admin@test.invalid", "hash", "관리자", "operator", 1, 1);
  raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("cohort-1", "2026 1기", 1, "월", 10, 1, 1);
  raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("cohort-2", "2026 2기", 2, "화", 20, 2, 2);
  raw.prepare('INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "role", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run("user-1", "one@test.invalid", "hash", "가나다", "01011111111", "cohort-1", "user", 1);
  raw.prepare('INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "role", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run("user-2", "two@test.invalid", "hash", "라마바", "01022222222", "cohort-2", "user", 2);
  for (let index = 0; index < 4; index += 1) {
    raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "feedback", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run(`workflow-1-${index}`, "user-1", `제작물${index}`, index === 0 ? "발주요청" : "시안중", index === 1 ? "수정" : null, 100 + index, 100 + index);
  }
  raw.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run("workflow-2", "user-2", "명함", "대기", 200, 200);
  raw.prepare('INSERT INTO "notifications" ("id", "userId", "type", "channel", "title", "message", "status", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run("notification-1", "user-1", "수동", "SMS", "제목", "본문", "성공", 300);
  raw.prepare('INSERT INTO "system_alerts" ("id", "title", "content", "type", "priority", "startDate", "endDate", "isActive", "createdBy", "createdByName", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run("alert-1", "알림", "내용", "info", 1, 1, 10, 1, "admin-1", "관리자", 1, 1);
  return new SQLiteDatabase(raw);
}

describe("adminPagesOperation", () => {
  it("pages workflow users without splitting a user's workflow group", async () => {
    const db = database();
    const result = await adminPagesOperation(db, "workflows-page", {
      adminId: "admin-1",
      pageSize: 1,
      cursorSecret: "0123456789abcdef0123456789abcdef",
    }) as { workflowsByUser: Record<string, { user: { 이름: string; cohort: { name: string } | null }; workflows: Array<{ user?: { 이름: string; cohort: { name: string } | null } }> }>; nextCursor?: string };
    expect(Object.keys(result.workflowsByUser)).toEqual(["user-1"]);
    expect(result.workflowsByUser["user-1"].workflows).toHaveLength(4);
    expect(result.workflowsByUser["user-1"].user).toMatchObject({ 이름: "가나다", cohort: { name: "2026 1기" } });
    expect(result.workflowsByUser["user-1"].workflows[0].user).toMatchObject({ 이름: "가나다", cohort: { name: "2026 1기" } });
    expect(result.nextCursor).toBeTruthy();
  });

  it("filters users globally before paging", async () => {
    const db = database();
    const result = await adminPagesOperation(db, "users-page", {
      adminId: "admin-1",
      pageSize: 1,
      search: "라마",
      cursorSecret: "0123456789abcdef0123456789abcdef",
    }) as { items: Array<{ id: string }> };
    expect(result.items.map((user) => user.id)).toEqual(["user-2"]);
  });

  it("returns dashboard and notification stats from bounded aggregate queries", async () => {
    const db = database();
    const dashboard = await adminPagesOperation(db, "dashboard-summary", { adminId: "admin-1" }) as { totalUsers: number; recentWorkflows: unknown[] };
    const notifications = await adminPagesOperation(db, "notifications-page", {
      adminId: "admin-1",
      pageSize: 1,
      cursorSecret: "0123456789abcdef0123456789abcdef",
    }) as { stats: { total: number; smsCount: number; successCount: number } };
    expect(dashboard.totalUsers).toBe(2);
    expect(dashboard.recentWorkflows).toHaveLength(5);
    expect(notifications.stats).toMatchObject({ total: 1, smsCount: 1, successCount: 1 });
  });
});
