import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
  createReadCache,
  parsePageSize,
  ReadPolicyError,
  signCursor,
  verifyCursor,
} from "./read-policy";
import {
  buildCommunicationMessageListQuery,
  buildCommunicationThreadListQuery,
  pageCommunicationMessages,
  pageCommunicationThreads,
} from "./queries";

const SECRET = "test-only-cursor-secret";

describe("D1 read policy", () => {
  it("bounds cached bytes and skips oversized values without truncation", async () => {
    const cache = createReadCache({ maxBytes: 12 });
    const request = { name: "test", scope: "a", key: "1", cacheable: true };
    await cache.getOrSet(request, () => "123456");
    await cache.getOrSet({ ...request, key: "2" }, () => "123456");
    expect(cache.size()).toBe(1);
    expect(cache.bytes()).toBeLessThanOrEqual(12);
    const oversized = "x".repeat(50);
    expect(await cache.getOrSet({ ...request, key: "3" }, () => oversized)).toBe(oversized);
    expect(cache.size()).toBe(1);
    cache.invalidate();
    expect(cache.bytes()).toBe(0);
  });
  it("applies a default and hard cap to page size", () => {
    expect(parsePageSize(undefined)).toBe(20);
    expect(parsePageSize("50")).toBe(50);
    expect(() => parsePageSize(true)).toThrow(ReadPolicyError);
    expect(() => parsePageSize([2])).toThrow(ReadPolicyError);
    expect(() => parsePageSize(51)).toThrow(ReadPolicyError);
    expect(() => parsePageSize(0)).toThrow(ReadPolicyError);
    expect(() => parsePageSize("1.5")).toThrow(ReadPolicyError);
  });

  it("rejects tampered and cross-scope cursors", () => {
    const token = signCursor(SECRET, {
      version: 1,
      scope: "communication-threads:user:user-a",
      sort: [
        { field: "lastReplyAt", value: "1788825600000" },
        { field: "id", value: "thread-2" },
      ],
    });
    expect(verifyCursor(SECRET, token, "communication-threads:user:user-a", ["lastReplyAt", "id"]).scope).toBe(
      "communication-threads:user:user-a",
    );
    const [body, signature] = token.split(".");
    const tampered = `${body.slice(0, -1)}${body.endsWith("a") ? "b" : "a"}.${signature}`;
    expect(() => verifyCursor(SECRET, tampered, "communication-threads:user:user-a", ["lastReplyAt", "id"])).toThrow(
      ReadPolicyError,
    );
    expect(() => verifyCursor(SECRET, token, "communication-threads:user:user-b", ["lastReplyAt", "id"])).toThrow(
      ReadPolicyError,
    );
  });

  it("uses a deterministic keyset condition for duplicate timestamps", () => {
    const cursor = signCursor(SECRET, {
      version: 1,
      scope: "communication-threads:user:user-a",
      sort: [
        { field: "lastReplyAt", value: "1788825600000" },
        { field: "id", value: "thread-2" },
      ],
    });
    const query = buildCommunicationThreadListQuery({ userId: "user-a", pageSize: 2, cursor, cursorSecret: SECRET });
    expect(query.sql).toContain('("lastReplyAt", "id") < (?, ?)');
    expect(query.sql).toContain('ORDER BY "lastReplyAt" DESC, "id" DESC');
    expect(query.sql).not.toMatch(/OFFSET/i);
    expect(query.params).toEqual(["user-a", 1788825600000, "thread-2", 3]);
  });

  it("returns pageSize items and a continuation only for pageSize plus one", () => {
    const rows = [
      { id: "a", lastReplyAt: 1788825600000 },
      { id: "b", lastReplyAt: 1788825600000 },
      { id: "c", lastReplyAt: 1788739200000 },
    ];
    const page = pageCommunicationThreads(rows, 2, SECRET, "user-a");
    expect(page.items.map((row) => row.id)).toEqual(["a", "b"]);
    expect(page.nextCursor).toBeTruthy();
    expect(pageCommunicationThreads(rows.slice(0, 2), 2, SECRET, "user-a").nextCursor).toBeUndefined();
  });

  it("scopes message queries to a thread and retains the same keyset rule", () => {
    const query = buildCommunicationMessageListQuery({ threadId: "thread-a", pageSize: 50, cursorSecret: SECRET });
    expect(query.sql).toContain('WHERE "threadId" = ?');
    expect(query.sql).toContain('ORDER BY "createdAt" DESC, "id" DESC');
    expect(query.sql).not.toMatch(/OFFSET/i);
    expect(query.params).toEqual(["thread-a", 51]);
    const page = pageCommunicationMessages(
      [
        { id: "message-a", createdAt: 1788825600000 },
        { id: "message-b", createdAt: 1788825600000 },
      ],
      1,
      SECRET,
      "thread-a",
    );
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
  });

  it("parses against the checked-in D1 schema and produces an explainable plan", () => {
    const schema = `${readFileSync("prisma/d1/0001_initial.sql", "utf8")}\n${readFileSync("prisma/d1/0007_communication_counters.sql", "utf8")}`;
    const query = buildCommunicationThreadListQuery({ userId: "user-a", pageSize: 20, cursorSecret: SECRET });
    let paramIndex = 0;
    const literalSql = query.sql.replace(/\?/g, () => {
      const value = query.params[paramIndex++];
      return typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
    });
    const result = spawnSync("sqlite3", [":memory:"], {
      input: `${schema}\nEXPLAIN QUERY PLAN ${literalSql};\n`,
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("communication_threads");
  });

  it("walks duplicate-timestamp pages with the D1 row-value boundary", () => {
    const schema = readFileSync("prisma/d1/0001_initial.sql", "utf8");
    const script = [
      "import sqlite3,sys",
      "db=sqlite3.connect(':memory:')",
      "db.executescript(sys.stdin.read())",
      "db.execute(\"INSERT INTO cohorts (id,name,교육시작일,교육요일,자료제출마감일,updatedAt) VALUES ('c','c',0,'월',0,0)\")",
      "db.execute(\"INSERT INTO users (id,email,password,이름,연락처,cohortId,updatedAt) VALUES ('u','u@example.com','x','u','0','c',0)\")",
      "db.executemany(\"INSERT INTO communication_threads (id,userId,title,lastReplyAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)\", [('t1','u','1',100,100,100),('t2','u','2',100,100,100),('t3','u','3',100,100,100)])",
      "page=db.execute('SELECT id,lastReplyAt FROM communication_threads WHERE userId=? ORDER BY lastReplyAt DESC,id DESC LIMIT 3',('u',)).fetchall()",
      "assert [r[0] for r in page[:2]] == ['t3','t2']",
      "next_page=db.execute('SELECT id FROM communication_threads WHERE userId=? AND (lastReplyAt,id)<(?,?) ORDER BY lastReplyAt DESC,id DESC LIMIT 3',('u',page[1][1],page[1][0])).fetchall()",
      "assert [r[0] for r in next_page] == ['t1']",
    ].join(";");
    const result = spawnSync("python", ["-X", "utf8", "-c", script], { input: schema, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("deduplicates concurrent reads, bounds entries, and evicts failures", async () => {
    const cache = createReadCache({ ttlMs: 10_000, maxEntries: 2 });
    const loader = vi.fn(async () => "value");
    const request = { name: "thread-list", scope: "user-a", key: "page-1", cacheable: true };
    await expect(Promise.all([cache.getOrSet(request, loader), cache.getOrSet(request, loader)])).resolves.toEqual([
      "value",
      "value",
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    await cache.getOrSet({ name: "thread-list", scope: "user-a", key: "page-2", cacheable: true }, () => "two");
    await cache.getOrSet({ name: "thread-list", scope: "user-a", key: "page-3", cacheable: true }, () => "three");
    expect(cache.size()).toBe(2);

    const failing = vi.fn(async () => {
      throw new Error("temporary");
    });
    await expect(cache.getOrSet({ name: "thread-list", scope: "user-a", key: "broken", cacheable: true }, failing)).rejects.toThrow("temporary");
    await expect(cache.getOrSet({ name: "thread-list", scope: "user-a", key: "broken", cacheable: true }, failing)).rejects.toThrow("temporary");
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached values and rejects an in-flight overload", async () => {
    const cache = createReadCache({ maxInflight: 1 });
    let release!: (value: string) => void;
    const pending = new Promise<string>((resolve) => { release = resolve; });
    const request = { name: "thread-list", scope: "user-a", key: "same", cacheable: true };
    const first = cache.getOrSet(request, () => pending);
    await expect(cache.getOrSet({ ...request, key: "other" }, () => "blocked")).rejects.toThrow("too many reads");
    cache.invalidate(request);
    release("old");
    await first;
    const fresh = vi.fn(async () => "fresh");
    await expect(cache.getOrSet(request, fresh)).resolves.toBe("fresh");
    cache.invalidate(request);
    await cache.getOrSet(request, fresh);
    expect(fresh).toHaveBeenCalledTimes(2);

    let releaseOld!: (value: string) => void;
    const old = new Promise<string>((resolve) => { releaseOld = resolve; });
    const oldRequest = { name: "thread-list", scope: "user-a", key: "global-clear", cacheable: true };
    const oldRead = cache.getOrSet(oldRequest, () => old);
    cache.invalidate();
    releaseOld("stale");
    await oldRead;
    const afterClear = vi.fn(async () => "current");
    await expect(cache.getOrSet(oldRequest, afterClear)).resolves.toBe("current");
    expect(afterClear).toHaveBeenCalledTimes(1);
  });

  it("expires entries at the configured TTL", async () => {
    vi.useFakeTimers();
    try {
      const cache = createReadCache({ ttlMs: 100 });
      const loader = vi.fn(async () => "value");
      const request = { name: "thread-list", scope: "user-a", key: "ttl", cacheable: true };
      await cache.getOrSet(request, loader);
      vi.advanceTimersByTime(101);
      await cache.getOrSet(request, loader);
      expect(loader).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not cache writes, auth, or confirmations by default", async () => {
    const cache = createReadCache();
    const write = vi.fn(async () => Math.random());
    const auth = vi.fn(async () => Math.random());
    const confirm = vi.fn(async () => Math.random());
    const base = { name: "shared-key", scope: "user-a", key: "same" };
    await cache.getOrSet({ ...base, kind: "write" }, write);
    await cache.getOrSet({ ...base, kind: "write" }, write);
    await cache.getOrSet({ ...base, kind: "auth" }, auth);
    await cache.getOrSet({ ...base, kind: "auth" }, auth);
    await cache.getOrSet({ ...base, kind: "confirm" }, confirm);
    await cache.getOrSet({ ...base, kind: "confirm" }, confirm);
    expect(write).toHaveBeenCalledTimes(2);
    expect(auth).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
