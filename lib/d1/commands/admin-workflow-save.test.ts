import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { saveAdminWorkflow } from "./admin-workflow-save";
import { calculateExpectedArrival } from "@/lib/utils/businessDays";

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach(db => db.close()));

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  sqlite.exec(readFileSync("prisma/d1/0005_workflow_history_index.sql", "utf8"));
  sqlite.exec(`INSERT INTO cohorts (id,name,교육시작일,교육요일,자료제출마감일,updatedAt) VALUES ('c','test',1,'목',2,1);
    INSERT INTO users (id,email,password,이름,연락처,cohortId,updatedAt) VALUES ('u','u@test.invalid','hash','test','01000000001','c',1);
    INSERT INTO admins (id,email,password,name,role,updatedAt) VALUES ('a','a@test.invalid','hash','admin','super',1);
    INSERT INTO workflows (id,userId,type,status,updatedAt) VALUES ('w','u','홈페이지','제작 진행 중',1);`);
  function statement(sql: string, values: SqlValue[] = []): Statement {
    return {
      bind: (...bound) => statement(sql, bound),
      async first<T>() { return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null; },
      async all<T>() {
        const results = sqlite.prepare(sql).all(...values) as T[];
        const changes = Number((sqlite.prepare('SELECT changes() AS n').get() as { n: number }).n);
        return { results, success: true, meta: { changes } };
      },
    };
  }
  const db: Database = {
    prepare: statement,
    async batch<T>(items: Statement[]): Promise<QueryResult<T>[]> {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const item of items) results.push(await item.all<T>());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const input = { adminId: "a", workflowId: "w", expectedUpdatedAt: 1, homepageComplete: true, changes: { status: "제작 완료", 시안URL: "https://test.invalid/design" } };
  return { db, sqlite, input };
}

describe("administrator workflow transaction", () => {
  it("saves completion, history and audit together without changing confirmation agreements", async () => {
    const { db, sqlite, input } = setup();
    sqlite.prepare('UPDATE workflows SET 확정동의항목 = ? WHERE id = ?').run('["인쇄색상차이확인"]', 'w');
    const result = await saveAdminWorkflow(db, input);
    expect(result.workflow.status).toBe("제작 완료");
    expect(result.workflow.확정동의항목).toEqual(["인쇄색상차이확인"]);
    expect(result.history).toMatchObject({ version: 1 });
    expect(sqlite.prepare('SELECT homepageCompleted FROM users WHERE id = ?').get('u')).toMatchObject({ homepageCompleted: 1 });
    await expect(saveAdminWorkflow(db, input)).rejects.toMatchObject({ status: 409 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM workflow_logs').get()).toMatchObject({ n: 1 });
  });

  it("guards a race at batch time so the loser changes no related rows", async () => {
    const { db, sqlite, input } = setup();
    const batch = db.batch.bind(db);
    db.batch = async items => {
      sqlite.prepare('UPDATE workflows SET updatedAt = 2, status = ? WHERE id = ?').run('다른 변경', 'w');
      return batch(items);
    };
    await expect(saveAdminWorkflow(db, input)).rejects.toMatchObject({ status: 409 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM design_history').get()).toMatchObject({ n: 0 });
    expect(sqlite.prepare('SELECT homepageCompleted FROM users WHERE id = ?').get('u')).toMatchObject({ homepageCompleted: 0 });
  });

  it("rolls back every write if a later history insert fails", async () => {
    const { db, sqlite, input } = setup();
    sqlite.exec("CREATE TRIGGER fail_history BEFORE INSERT ON design_history BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END;");
    await expect(saveAdminWorkflow(db, input)).rejects.toThrow('synthetic failure');
    expect(sqlite.prepare('SELECT status,updatedAt FROM workflows WHERE id = ?').get('w')).toMatchObject({ status: '제작 진행 중', updatedAt: 1 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM workflow_logs').get()).toMatchObject({ n: 0 });
    expect(sqlite.prepare('SELECT homepageCompleted FROM users WHERE id = ?').get('u')).toMatchObject({ homepageCompleted: 0 });
  });

  it("denies removed administrators before any write", async () => {
    const { db, sqlite, input } = setup();
    sqlite.prepare('DELETE FROM admins WHERE id = ?').run('a');
    await expect(saveAdminWorkflow(db, input)).rejects.toMatchObject({ status: 403 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM workflow_logs').get()).toMatchObject({ n: 0 });
  });

  it("stores generated arrival ranges when approving a print order", async () => {
    const { db, sqlite } = setup();
    sqlite.prepare('UPDATE workflows SET type = ?, status = ?, updatedAt = ? WHERE id = ?').run("명함", "발주대기", 10, "w");
    const expectedArrival = calculateExpectedArrival(new Date("2026-09-08T00:00:00.000Z"), "명함");
    const result = await saveAdminWorkflow(db, {
      adminId: "a",
      workflowId: "w",
      expectedUpdatedAt: 10,
      homepageComplete: false,
      changes: {
        status: "발주완료",
        발주승인일: new Date("2026-09-08T00:00:00.000Z").toISOString(),
        예상도착일: expectedArrival,
      },
    });
    expect(result.workflow.예상도착일).toBe(expectedArrival);
    expect(result.workflow.status).toBe("발주완료");
  });
});
