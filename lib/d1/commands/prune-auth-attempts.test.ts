import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { Database, SqlValue, Statement } from "../database";
import { pruneAuthAttempts } from "./prune-auth-attempts";

it("prunes at most 2000 expired keys through the expiry index and preserves live windows", async () => {
  const raw = new DatabaseSync(":memory:");
  try {
    raw.exec(readFileSync("prisma/d1/0002_auth_attempts.sql", "utf8"));
    const now = 10 * 86_400_000;
    const insert = raw.prepare('INSERT INTO auth_login_attempts VALUES (?, ?, ?, ?)');
    for (let i = 0; i < 2001; i++) insert.run(`expired-${i}`, 0, 1, 0);
    insert.run("live", now, 5, now);
    function statement(sql: string, values: SqlValue[] = []): Statement {
      return {
        bind: (...args) => statement(sql, args),
        async first<T>() { return (raw.prepare(sql).get(...values) as T | undefined) ?? null; },
        async all<T>() { return { results: raw.prepare(sql).all(...values) as T[], success: true, meta: {} }; },
      };
    }
    const db: Database = { prepare: statement, async batch() { throw new Error("Unexpected batch"); } };
    expect(await pruneAuthAttempts(db, now)).toBe(2000);
    expect(raw.prepare('SELECT failures FROM auth_login_attempts WHERE keyHash = ?').get("live")).toEqual({ failures: 5 });
    expect(await pruneAuthAttempts(db, now)).toBe(1);
    const plan = raw.prepare('EXPLAIN QUERY PLAN SELECT keyHash FROM auth_login_attempts WHERE updatedAt < ? ORDER BY updatedAt ASC LIMIT 2000').all(now);
    expect(JSON.stringify(plan)).toContain("auth_login_attempts_updatedAt_idx");
    expect(JSON.stringify(plan)).not.toContain("SCAN auth_login_attempts");
  } finally { raw.close(); }
});
