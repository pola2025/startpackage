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
