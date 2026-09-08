import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDataService, type DataEnvironment } from "./worker";
import type { Database, QueryResult, SqlValue, Statement } from "../../lib/d1/database";

const token = "local-test-service-token-with-32-characters";
const databases: DatabaseSync[] = [];

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  sqlite.exec(readFileSync("prisma/d1/0002_auth_attempts.sql", "utf8"));
  sqlite.exec(readFileSync("prisma/d1/0007_communication_counters.sql", "utf8"));
  sqlite.exec(readFileSync("prisma/d1/0009_design_thread_indexes.sql", "utf8"));
  sqlite.exec(`INSERT INTO cohorts (id,name,교육시작일,교육요일,자료제출마감일,updatedAt)
    VALUES ('cohort','test',1,'목',2,1);
    INSERT INTO users (id,email,password,이름,연락처,cohortId,updatedAt)
    VALUES ('user-a','a@test.invalid','hash','A','01000000001','cohort',1),
           ('user-b','b@test.invalid','hash','B','01000000002','cohort',1);`);
  for (let index = 0; index < 55; index += 1) {
    sqlite.prepare('INSERT INTO communication_threads (id,userId,title,category,lastReplyAt,updatedAt) VALUES (?,?,?,?,?,?)')
      .run(`thread-${String(index).padStart(2, "0")}`, "user-a", "test", "일반", 100, 100);
  }
  sqlite.prepare('INSERT INTO communication_messages (id,threadId,authorId,authorType,authorName,content) VALUES (?,?,?,?,?,?)')
    .run("message-1", "thread-00", "user-a", "user", "A", "test message");
  const queries: string[] = [];
  function statement(sql: string, params: SqlValue[] = []): Statement {
    return {
      bind: (...values) => statement(sql, values),
      async first<T>() {
        queries.push(sql);
        return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
      },
      async all<T>() {
        queries.push(sql);
        return { results: sqlite.prepare(sql).all(...params) as T[], success: true, meta: {} };
      },
    };
  }
  const db: Database = {
    prepare: statement,
    async batch<T>(): Promise<QueryResult<T>[]> { throw new Error("Read endpoint must never write"); },
  };
  const env: DataEnvironment = {
    DB: db,
    DATA_SERVICE_TOKEN: token,
    CURSOR_SECRET: "local-test-cursor-secret-with-32-characters",
    READ_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
  const service = createDataService();
  function request(path: string, input: unknown, suppliedToken = token) {
    return service.fetch(new Request(`https://data.test/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${suppliedToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }), env);
  }
  return { request, queries, sqlite, env };
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

describe("D1 data service HTTP boundary", () => {
  it("keeps server cursor secrets out of strict content payloads", async () => {
    const { request } = setup();
    const response = await request("content-domain/active-cohorts", {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.any(Array));
    expect((await request("content-domain/active-cohorts", { cursorSecret: "injected" })).status).toBe(400);
  });

  it("reserves independent account and IP attempts with server-controlled limits", async () => {
    const { request } = setup();
    const account = { keyHash: "a".repeat(64), kind: "account" };
    for (let index = 0; index < 5; index += 1) {
      expect(await (await request("auth/consume-attempts", account)).json()).toMatchObject({ allowed: true });
    }
    expect(await (await request("auth/consume-attempts", account)).json()).toMatchObject({ allowed: false });
    for (let index = 0; index < 6; index += 1) {
      expect(await (await request("auth/consume-attempts", { keyHash: "b".repeat(64), kind: "ip" })).json()).toMatchObject({ allowed: true });
    }
    expect((await request("auth/consume-attempts", { ...account, maxFailures: 100 })).status).toBe(400);
    expect((await request("auth/consume-attempts", { ...account, now: 0 })).status).toBe(400);
  });

  it("rejects unknown auth commands and only reads the requested identity", async () => {
    const { request } = setup();
    expect((await request("auth/consume-attempt", { keyHash: "c".repeat(64) })).status).toBe(404);
    const found = await request("auth/user-by-email", { identifier: "a@test.invalid" });
    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ id: "user-a", email: "a@test.invalid" });
    expect(await (await request("auth/admin-state", { adminId: "absent" })).json()).toBeNull();
  });
  it("rejects authentication, arbitrary SQL and invalid page sizes before querying", async () => {
    const { request, queries } = setup();
    expect((await request("communication/threads", { userId: "user-a" }, "bad-token")).status).toBe(401);
    expect((await request("sql", { sql: "SELECT * FROM users" })).status).toBe(404);
    expect((await request("communication/threads", { userId: "user-a", pageSize: 51 })).status).toBe(400);
    expect((await request("communication/threads", { userId: "user-a", sql: "SELECT * FROM users" })).status).toBe(400);
    expect(queries).toHaveLength(0);
  });

  it("returns all rows across bounded pages without duplicates and uses private cache", async () => {
    const { request, queries } = setup();
    const firstResponse = await request("communication/threads", { userId: "user-a", pageSize: 50 });
    expect(firstResponse.headers.get("Cache-Control")).toBe("private, no-store");
    expect(firstResponse.status).toBe(200);
    const first = await firstResponse.json() as { items: { id: string }[]; nextCursor: string };
    expect(first.items).toHaveLength(50);
    const afterFirst = queries.length;
    const cached = await request("communication/threads", { userId: "user-a", pageSize: 50 });
    expect(await cached.json()).toEqual(first);
    expect(queries.length - afterFirst).toBe(1);
    const secondResponse = await request("communication/threads", { userId: "user-a", pageSize: 50, cursor: first.nextCursor });
    const second = await secondResponse.json() as { items: { id: string }[]; nextCursor?: string };
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeUndefined();
    expect(new Set([...first.items, ...second.items].map(row => row.id)).size).toBe(55);
    expect((await request("communication/threads", { userId: "user-b", cursor: first.nextCursor })).status).toBe(400);
  });

  it("checks ownership on every message request, including cache hits", async () => {
    const { request, sqlite, queries } = setup();
    expect((await request("communication/messages", { userId: "user-a", threadId: "thread-00" })).status).toBe(200);
    expect(queries).toHaveLength(3);
    expect((await request("communication/messages", { userId: "user-b", threadId: "thread-00" })).status).toBe(404);
    sqlite.prepare('UPDATE communication_threads SET userId = ? WHERE id = ?').run("user-b", "thread-00");
    expect((await request("communication/messages", { userId: "user-a", threadId: "thread-00" })).status).toBe(404);
  });

  it("rejects limited or oversized traffic without D1 calls", async () => {
    const { request, env, queries } = setup();
    env.READ_LIMITER.limit = vi.fn(async () => ({ success: false }));
    const limited = await request("communication/threads", { userId: "user-a" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    env.READ_LIMITER.limit = vi.fn(async () => ({ success: true }));
    expect((await request("communication/threads", { userId: "user-a", padding: "x".repeat(8192) })).status).toBe(413);
    expect(queries).toHaveLength(0);
  });
});
