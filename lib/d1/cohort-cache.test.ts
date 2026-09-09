import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "./database";
import { DataServiceError } from "./database";
import { cachedCohortPage, clearCohortPageCache } from "./cohort-cache";
import { adminPagesOperation } from "./domains/admin-pages";

class SqliteStatement implements Statement {
  constructor(private readonly db: DatabaseSync, private readonly sql: string, private readonly values: SqlValue[] = []) {}
  bind(...values: SqlValue[]): Statement { return new SqliteStatement(this.db, this.sql, values); }
  async first<T>(): Promise<T | null> { return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null; }
  async all<T>(): Promise<QueryResult<T>> { return { results: this.db.prepare(this.sql).all(...this.values) as T[], success: true, meta: {} }; }
}

class SqliteDatabase implements Database {
  statsReads = 0;
  constructor(readonly raw: DatabaseSync) {}
  prepare(sql: string): Statement {
    if (sql.includes('SELECT (SELECT COUNT(*) FROM "cohorts")')) this.statsReads += 1;
    return new SqliteStatement(this.raw, sql);
  }
  async batch<T = Record<string, unknown>>(): Promise<QueryResult<T>[]> { return []; }
}

function database(): SqliteDatabase {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0006_admin_pages.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0010_cohort_read_cache.sql", "utf8"));
  raw.prepare('INSERT INTO "admins" ("id", "email", "password", "name", "role", "twoFactorEnabled", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("admin", "admin@test.invalid", "x", "관리자", "operator", 0, 0);
  raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("cohort", "27기", 100, "화", 200, 0, 0);
  return new SqliteDatabase(raw);
}

afterEach(() => { clearCohortPageCache(); vi.useRealTimers(); });

describe("cohort page cache", () => {
  it("merges concurrent reads and expires successful entries", async () => {
    vi.useFakeTimers();
    const db = database();
    let loads = 0;
    const loader = async () => { loads += 1; return { loads }; };
    await Promise.all([1, 2, 3].map(() => cachedCohortPage(db, 20, undefined, "secret", loader)));
    expect(loads).toBe(1);
    await cachedCohortPage(db, 20, undefined, "secret", loader);
    expect(loads).toBe(1);
    vi.advanceTimersByTime(15_001);
    await cachedCohortPage(db, 20, undefined, "secret", loader);
    expect(loads).toBe(2);
    db.raw.close();
  });

  it("isolates databases and invalidates after cohort and user writes", async () => {
    const first = database();
    const second = database();
    let firstLoads = 0;
    let secondLoads = 0;
    const readFirst = () => cachedCohortPage(first, 20, undefined, "secret", async () => ++firstLoads);
    const readSecond = () => cachedCohortPage(second, 20, undefined, "secret", async () => ++secondLoads);
    await readFirst(); await readFirst(); await readSecond(); await readSecond();
    expect([firstLoads, secondLoads]).toEqual([1, 1]);
    first.raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run("new-cohort", "28기", 300, "화", 400, 0, 0);
    await readFirst();
    expect(firstLoads).toBe(2);
    first.raw.prepare('INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "role", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run("user", "u@test.invalid", "x", "사용자", "0", "cohort", "user", 0);
    await readFirst();
    expect(firstLoads).toBe(3);
    first.raw.prepare('UPDATE "users" SET "cohortId" = ? WHERE "id" = ?').run("new-cohort", "user");
    await readFirst();
    expect(firstLoads).toBe(4);
    first.raw.prepare('DELETE FROM "users" WHERE "id" = ?').run("user");
    await readFirst();
    expect(firstLoads).toBe(5);
    first.raw.prepare('UPDATE "cohorts" SET "name" = ? WHERE "id" = ?').run("27기 수정", "cohort");
    await readFirst();
    expect(firstLoads).toBe(6);
    first.raw.prepare('DELETE FROM "cohorts" WHERE "id" = ?').run("new-cohort");
    await readFirst();
    expect(firstLoads).toBe(7);
    expect(secondLoads).toBe(1);
    first.raw.close(); second.raw.close();
  });

  it("rejects version read failure and never serves a stale value", async () => {
    const db = database();
    await expect(cachedCohortPage(db, 20, undefined, "secret", async () => "fresh")).resolves.toBe("fresh");
    db.raw.exec('DROP TABLE "cohort_read_cache_version"');
    await expect(cachedCohortPage(db, 20, undefined, "secret", async () => "stale")).rejects.toMatchObject({ status: 503 });
    db.raw.close();
  });

  it("checks admin authorization before a populated cache can be returned", async () => {
    const db = database();
    const input = { adminId: "admin", pageSize: 20, cursorSecret: "0123456789abcdef0123456789abcdef" };
    await adminPagesOperation(db, "cohorts-page", input);
    db.raw.prepare('UPDATE "admins" SET "role" = ? WHERE "id" = ?').run("viewer", "admin");
    await expect(adminPagesOperation(db, "cohorts-page", input)).rejects.toBeInstanceOf(DataServiceError);
    await expect(adminPagesOperation(db, "cohorts-page", input)).rejects.toMatchObject({ status: 403 });
    db.raw.close();
  });

  it("keeps large cohort reads keyset bounded and reuses stats across cursors", async () => {
    const db = database();
    const insert = db.raw.prepare('INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (let index = 1; index <= 120; index += 1) insert.run(`large-${index}`, `${index}기`, index, "화", index, index, index);
    const input = { adminId: "admin", pageSize: 10, cursorSecret: "0123456789abcdef0123456789abcdef" };
    const firstPage = await adminPagesOperation(db, "cohorts-page", input) as { items: unknown[]; nextCursor?: string };
    expect(firstPage.items).toHaveLength(10);
    expect(firstPage.nextCursor).toBeTruthy();
    const secondPage = await adminPagesOperation(db, "cohorts-page", { ...input, cursor: firstPage.nextCursor }) as { items: unknown[] };
    expect(secondPage.items).toHaveLength(10);
    expect(db.statsReads).toBe(1);
    const plan = db.raw.prepare('EXPLAIN QUERY PLAN SELECT c.* FROM "cohorts" c WHERE (c."교육시작일", c."id") < (?, ?) ORDER BY c."교육시작일" DESC, c."id" DESC LIMIT ?').all(120, "large-120", 11) as Array<{ detail: string }>;
    expect(plan.some((row) => row.detail.includes("cohorts_start_id_idx"))).toBe(true);
    expect(plan.some((row) => row.detail.includes("TEMP B-TREE"))).toBe(false);
    db.raw.close();
  });
});
