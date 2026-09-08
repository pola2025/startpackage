import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { consumeLoginAttempt } from "./auth-attempts";

class SQLiteStatement implements Statement {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {}
  bind(...values: SqlValue[]): Statement { return new SQLiteStatement(this.db, this.sql, values); }
  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }
  async all<T>(): Promise<QueryResult<T>> {
    const results = this.db.prepare(this.sql).all(...this.values) as T[];
    return { results, success: true, meta: { rows_read: results.length } };
  }
}

class SQLiteDatabase implements Database {
  constructor(private readonly db: DatabaseSync) {}
  prepare(sql: string): Statement { return new SQLiteStatement(this.db, sql); }
  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    return statements.map(() => ({ results: [], success: true, meta: {} }));
  }
}

function createDatabase() {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0002_auth_attempts.sql", "utf8"));
  return new SQLiteDatabase(raw);
}

describe("consumeLoginAttempt", () => {
  it("atomically counts failures and blocks after the configured limit", async () => {
    const db = createDatabase();
    const keyHash = "a".repeat(64);
    const results = [];
    for (let index = 0; index < 6; index += 1) {
      results.push(await consumeLoginAttempt(db, { keyHash, now: 1_000 + index }));
    }
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, true, true, false]);
    expect(results[5].retryAfterSeconds).toBeGreaterThan(0);
  });

  it("starts a fresh window without deleting the key", async () => {
    const db = createDatabase();
    const keyHash = "b".repeat(64);
    await consumeLoginAttempt(db, { keyHash, now: 1_000, windowMs: 60_000 });
    const result = await consumeLoginAttempt(db, { keyHash, now: 61_000, windowMs: 60_000 });
    expect(result).toMatchObject({ allowed: true, failures: 1 });
  });
});
