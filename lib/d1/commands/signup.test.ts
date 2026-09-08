import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { createSignup } from "./signup";

class SQLiteStatement implements Statement {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SqlValue[] = []) {}

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
  constructor(private readonly db: DatabaseSync, private readonly beforeBatch?: () => void) {}

  prepare(sql: string): Statement {
    return new SQLiteStatement(this.db, sql);
  }

  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    this.beforeBatch?.();
    this.db.exec("BEGIN");
    try {
      for (const statement of statements) {
        const local = statement as SQLiteStatement;
        this.db.prepare(local.sql).run(...local.values);
      }
      this.db.exec("COMMIT");
      const result: QueryResult<T> = { results: [], success: true, meta: { rows_written: 1 } };
      return statements.map(() => result);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

function createDatabase(): { db: SQLiteDatabase; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.prepare(
    'INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
  ).run("cohort-test", "테스트 기수", 0, "월", 0, 0);
  return { db: new SQLiteDatabase(raw), raw };
}

const input = {
  email: "new@example.com",
  passwordHash: "bcrypt-hash",
  name: "홍길동",
  phone: "010-1234-5678",
  cohortId: "cohort-test",
  now: 1788825600000,
  createId: (() => {
    let sequence = 0;
    return () => `id-${++sequence}`;
  })(),
};

describe("createSignup", () => {
  it("creates one user, seven workflows, and one submission atomically", async () => {
    const { db, raw } = createDatabase();
    const result = await createSignup(db, input);
    expect(result.workflowIds).toHaveLength(7);
    expect(raw.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 1 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM workflows").get()).toEqual({ count: 7 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM submissions").get()).toEqual({ count: 1 });
    expect(raw.prepare("SELECT 연락처, SMS수신동의, 이메일수신동의 FROM users").get()).toEqual({
      연락처: "01012345678",
      SMS수신동의: 1,
      이메일수신동의: 1,
    });
  });

  it("rolls back all nine inserts when a unique constraint fails", async () => {
    const { db, raw } = createDatabase();
    await createSignup(db, input);
    await expect(createSignup(db, { ...input, email: "other@example.com" })).rejects.toMatchObject({ status: 409 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 1 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM workflows").get()).toEqual({ count: 7 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM submissions").get()).toEqual({ count: 1 });
  });

  it("rejects a legacy formatted phone duplicate without adding rows", async () => {
    const { db, raw } = createDatabase();
    raw.prepare(
      'INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run("legacy-user", "legacy@example.com", "hash", "김테스트", "010-1234-5678", "cohort-test", 0);
    await expect(createSignup(db, { ...input, email: "phone@example.com" })).rejects.toMatchObject({ status: 409 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 1 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM workflows").get()).toEqual({ count: 0 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM submissions").get()).toEqual({ count: 0 });
  });

  it("rolls back when a phone duplicate appears after preflight", async () => {
    const raw = new DatabaseSync(":memory:");
    raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
    raw.prepare(
      'INSERT INTO "cohorts" ("id", "name", "교육시작일", "교육요일", "자료제출마감일", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
    ).run("cohort-test", "테스트 기수", 0, "월", 0, 0);
    const db = new SQLiteDatabase(raw, () => {
      raw.prepare(
        'INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run("racing-user", "racing@example.com", "hash", "이경쟁", "01012345678", "cohort-test", 0);
    });
    await expect(createSignup(db, { ...input, email: "race@example.com" })).rejects.toMatchObject({ status: 409 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 1 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM workflows").get()).toEqual({ count: 0 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM submissions").get()).toEqual({ count: 0 });
  });

  it("does not write when the cohort does not exist", async () => {
    const { db, raw } = createDatabase();
    await expect(createSignup(db, { ...input, email: "missing@example.com", cohortId: "missing" })).rejects.toMatchObject({ status: 400 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 0 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM workflows").get()).toEqual({ count: 0 });
    expect(raw.prepare("SELECT COUNT(*) AS count FROM submissions").get()).toEqual({ count: 0 });
  });
});
