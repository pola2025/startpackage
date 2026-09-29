import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { consumeLoginAttempt } from "./auth-attempts";
import { clearAccountAttempt, clearLoginBlocks, listLoginBlocks } from "./login-blocks";

const opened: DatabaseSync[] = [];

function setup() {
  const raw = new DatabaseSync(":memory:");
  opened.push(raw);
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(readFileSync("prisma/d1/0002_auth_attempts.sql", "utf8"));
  raw.exec(`INSERT INTO cohorts (id,name,교육시작일,교육요일,자료제출마감일,updatedAt) VALUES ('cohort-1','27기',0,'월',0,1);
    INSERT INTO users (id,email,password,이름,연락처,cohortId,updatedAt) VALUES ('user-1','a@test.invalid','x','홍길동','010-1111-2222','cohort-1',1);
    INSERT INTO admins (id,email,password,name,role,updatedAt) VALUES ('admin-1','op@test.invalid','x','운영','operator',1),('admin-2','no@test.invalid','x','기타','viewer',1);`);
  function statement(sql: string, values: SqlValue[] = []): Statement {
    return {
      bind: (...next) => statement(sql, next),
      async first<T>() { return (raw.prepare(sql).get(...values) as T | undefined) ?? null; },
      async all<T>() { return { results: raw.prepare(sql).all(...values) as T[], success: true, meta: {} } as QueryResult<T>; },
    };
  }
  const db: Database = { prepare: (sql) => statement(sql), async batch() { throw new Error("unused"); } };
  return { db, raw };
}

async function attempts(db: Database, keyHash: string, count: number, now: number) {
  for (let index = 0; index < count; index += 1) await consumeLoginAttempt(db, { keyHash, now: now + index });
}

afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});

describe("login block commands", () => {
  it("lists only keys at the account limit inside the current window, with identities to match", async () => {
    const { db } = setup();
    const now = 10_000_000;
    await attempts(db, "a".repeat(64), 5, now - 60_000);
    await attempts(db, "b".repeat(64), 4, now - 60_000);
    await attempts(db, "c".repeat(64), 6, now - 16 * 60_000);

    const result = await listLoginBlocks(db, { adminId: "admin-1", now });
    expect(result.blocks.map((row) => row.keyHash)).toEqual(["a".repeat(64)]);
    expect(result.blocks[0]).toMatchObject({ attempts: 5 });
    expect(result.blocks[0].retryAfterSeconds).toBeGreaterThan(13 * 60);
    expect(result.identities).toEqual([
      { id: "user-1", name: "홍길동", phone: "010-1111-2222", email: "a@test.invalid", cohortName: "27기" },
    ]);
  });

  it("skips the user lookup when nothing is blocked", async () => {
    const { db } = setup();
    await expect(listLoginBlocks(db, { adminId: "admin-1", now: 1_000_000 })).resolves.toMatchObject({ blocks: [], identities: [] });
  });

  it("requires an administrator", async () => {
    const { db } = setup();
    await expect(listLoginBlocks(db, { adminId: "admin-2" })).rejects.toMatchObject({ status: 403 });
    await expect(listLoginBlocks(db, { adminId: "missing" })).rejects.toMatchObject({ status: 403 });
    await expect(clearLoginBlocks(db, { adminId: "bad id!", keyHashes: ["a".repeat(64)] })).rejects.toMatchObject({ status: 400 });
  });

  it("clears the selected keys so the next attempt is allowed again", async () => {
    const { db, raw } = setup();
    const now = 20_000_000;
    await attempts(db, "a".repeat(64), 6, now);
    await attempts(db, "b".repeat(64), 6, now);
    expect((await consumeLoginAttempt(db, { keyHash: "a".repeat(64), now: now + 10 })).allowed).toBe(false);

    await expect(clearLoginBlocks(db, { adminId: "admin-1", keyHashes: ["a".repeat(64), "a".repeat(64)] })).resolves.toEqual({ cleared: 1 });
    expect((await consumeLoginAttempt(db, { keyHash: "a".repeat(64), now: now + 11 })).allowed).toBe(true);
    expect(raw.prepare("SELECT failures FROM auth_login_attempts WHERE keyHash = ?").get("b".repeat(64))).toEqual({ failures: 6 });
  });

  it("validates clear input", async () => {
    const { db } = setup();
    await expect(clearLoginBlocks(db, { adminId: "admin-1", keyHashes: [] })).rejects.toMatchObject({ status: 400 });
    await expect(clearLoginBlocks(db, { adminId: "admin-1", keyHashes: ["xyz"] })).rejects.toMatchObject({ status: 400 });
    await expect(clearLoginBlocks(db, { adminId: "admin-1", keyHashes: Array.from({ length: 51 }, (_, i) => i.toString(16).padStart(64, "0")) }))
      .rejects.toMatchObject({ status: 400 });
    await expect(clearAccountAttempt(db, { keyHash: "nope" })).rejects.toMatchObject({ status: 400 });
  });

  it("clears one account key after a successful login", async () => {
    const { db } = setup();
    await attempts(db, "d".repeat(64), 2, 30_000_000);
    await expect(clearAccountAttempt(db, { keyHash: "d".repeat(64) })).resolves.toEqual({ cleared: 1 });
    await expect(clearAccountAttempt(db, { keyHash: "d".repeat(64) })).resolves.toEqual({ cleared: 0 });
  });
});
