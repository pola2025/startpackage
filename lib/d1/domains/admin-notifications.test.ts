import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { adminNotificationOperation } from "./admin-notifications";

class TestDb implements Database {
  constructor(readonly raw: DatabaseSync) {}
  prepare(sql: string): Statement {
    const raw = this.raw;
    const make = (values: SqlValue[]): Statement => ({
      bind: (...next: SqlValue[]) => { if (next.length > 100) throw new Error("D1 parameter limit"); return make(next); },
      async first<T>() { return (raw.prepare(sql).get(...values) as T | undefined) ?? null; },
      async all<T>() { return { results: raw.prepare(sql).all(...values) as T[], success: true, meta: {} } as QueryResult<T>; },
    });
    return make([]);
  }
  async batch<T = Record<string, unknown>>(): Promise<QueryResult<T>[]> { return []; }
}

function seed(): TestDb {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.exec(`INSERT INTO cohorts (id,name,"교육시작일","교육요일","자료제출마감일",updatedAt) VALUES ('cohort-1','테스트',0,'월',0,1); INSERT INTO users (id,email,password,"이름","연락처",cohortId,SMS수신동의,이메일수신동의,updatedAt) VALUES ('user-1','a@test.invalid','x','테스트','01000000000','cohort-1',1,1,1); INSERT INTO admins (id,email,password,name,role,updatedAt) VALUES ('admin-1','admin@test.invalid','x','관리자','operator',1);`);
  raw.prepare('INSERT INTO workflows (id,userId,type,status,"시안URL",createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)').run("workflow-1", "user-1", "명함", "시안중", "https://example.test/design", 1, 1);
  return new TestDb(raw);
}

describe("admin notification D1 operations", () => {
  it("returns only the requested user and design workflows", async () => {
    const result = await adminNotificationOperation(seed(), "user-design-data", { adminId: "admin-1", userId: "user-1" }) as { user: { id: string }; workflows: Array<{ id: string }> };
    expect(result.user.id).toBe("user-1");
    expect(result.workflows.map((row) => row.id)).toEqual(["workflow-1"]);
  });

  it("rejects an unknown operation instead of falling through", async () => {
    await expect(adminNotificationOperation(seed(), "unknown", { adminId: "admin-1" })).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a revoked admin before reading or writing notifications", async () => {
    const db = seed();
    db.raw.prepare('DELETE FROM admins WHERE id = ?').run("admin-1");
    await expect(adminNotificationOperation(db, "notification-create", { adminId: "admin-1", userId: "user-1", type: "수동발송", channel: "SMS", title: "제목", message: "x".repeat(2000) })).rejects.toMatchObject({ status: 403 });
  });
});

it("returns every selected design across four bounded lookup chunks", async () => {
  const db = seed();
  try {
    const ids = Array.from({ length: 200 }, (_, index) => `selected-${index}`);
    const insert = db.raw.prepare('INSERT INTO workflows (id,userId,type,status,"시안URL",createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)');
    for (const id of ids) insert.run(id, "user-1", `test-type-${id}`, "시안중", "https://example.test/design", 1, 1);
    const result = await adminNotificationOperation(db, "all-design-data", { adminId: "admin-1", workflowIds: ids }) as { workflows: { id: string }[] };
    expect(result.workflows).toHaveLength(200);
    expect(new Set(result.workflows.map(row => row.id))).toEqual(new Set(ids));
    const grouped = await adminNotificationOperation(db, "grouped-design-data", { adminId: "admin-1", userId: "user-1", workflowIds: ids }) as { workflows: { id: string }[] };
    expect(grouped.workflows).toHaveLength(200);
  } finally { db.raw.close(); }
});
