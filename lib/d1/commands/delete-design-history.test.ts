import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { deleteDesignHistory } from "./delete-design-history";

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  sqlite.exec("INSERT INTO cohorts (id,name,교육시작일,교육요일,자료제출마감일,updatedAt) VALUES ('c','Test',1,'목',2,1); INSERT INTO admins (id,email,password,name,role,updatedAt) VALUES ('a','a@test.invalid','hash','Admin','designer',1); INSERT INTO users (id,email,password,이름,연락처,cohortId,updatedAt) VALUES ('u','u@test.invalid','hash','User','01000000000','c',1); INSERT INTO workflows (id,userId,type,status,updatedAt) VALUES ('w','u','명함','시안중',1);");
  sqlite.exec("INSERT INTO design_history (id,workflowId,version,fileUrl,uploadedBy,uploadedByName,createdAt) VALUES ('h1','w',1,'https://x/1','a','Admin',1),('h2','w',2,'https://x/2','a','Admin',2),('h3','w',3,'https://x/3','a','Admin',3);");
  function statement(sql: string, values: SqlValue[] = []): Statement {
    return { bind: (...bound) => statement(sql, bound), async first<T>() { return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null; }, async all<T>() { const results = sqlite.prepare(sql).all(...values) as T[]; const changes = Number((sqlite.prepare('SELECT changes() AS n').get() as { n: number }).n); return { results, success: true, meta: { changes } }; } };
  }
  const db: Database = { prepare: statement, async batch<T>(items: Statement[]): Promise<QueryResult<T>[]> { sqlite.exec("BEGIN"); try { const result: QueryResult<T>[] = []; for (const item of items) result.push(await item.all<T>()); sqlite.exec("COMMIT"); return result; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } } };
  return { db, sqlite };
}

describe("deleteDesignHistory", () => {
  it("deletes one history and renumbers remaining versions atomically", async () => {
    const { db, sqlite } = setup();
    await expect(deleteDesignHistory(db, { adminId: "a", workflowId: "w", historyId: "h2" })).resolves.toMatchObject({ remainingCount: 2 });
    expect(sqlite.prepare("SELECT id,version FROM design_history WHERE workflowId='w' ORDER BY version").all()).toEqual([{ id: "h1", version: 1 }, { id: "h3", version: 2 }]);
    expect(sqlite.prepare("SELECT 시안URL,수정횟수 FROM workflows WHERE id='w'").get()).toMatchObject({ 시안URL: "https://x/3", 수정횟수: 1 });
  });

  it("rolls back deletion and renumbering when a later statement fails", async () => {
    const { db, sqlite } = setup();
    sqlite.exec("CREATE TRIGGER fail_workflow BEFORE UPDATE ON workflows BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END;");
    await expect(deleteDesignHistory(db, { adminId: "a", workflowId: "w", historyId: "h2" })).rejects.toThrow("synthetic failure");
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM design_history WHERE workflowId='w'").get()).toMatchObject({ n: 3 });
    expect(sqlite.prepare("SELECT version FROM design_history WHERE id='h3'").get()).toMatchObject({ version: 3 });
  });

  it("rejects a stale workflow claim before deleting history", async () => {
    const { db, sqlite } = setup();
    const conflicted: Database = {
      prepare: db.prepare.bind(db),
      async batch<T>(items: Statement[]) {
        sqlite.prepare('UPDATE workflows SET updatedAt = ? WHERE id = ?').run(999, "w");
        return db.batch<T>(items);
      },
    };
    await expect(deleteDesignHistory(conflicted, { adminId: "a", workflowId: "w", historyId: "h2" })).rejects.toMatchObject({ status: 409 });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM design_history WHERE workflowId='w'").get()).toMatchObject({ n: 3 });
  });

  it("rejects history sets over the explicit 100-item cap before writes", async () => {
    const { db, sqlite } = setup();
    const insert = sqlite.prepare('INSERT INTO design_history (id,workflowId,version,fileUrl,uploadedBy,uploadedByName,createdAt) VALUES (?,?,?,?,?,?,?)');
    for (let index = 4; index <= 104; index += 1) insert.run(`h${index}`, "w", index, `https://x/${index}`, "a", "Admin", index);
    await expect(deleteDesignHistory(db, { adminId: "a", workflowId: "w", historyId: "h1" })).rejects.toMatchObject({ status: 400 });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM design_history WHERE workflowId='w'").get()).toMatchObject({ n: 104 });
  });

  it("does not leave a claim when the requested history disappears before the batch", async () => {
    const { db, sqlite } = setup();
    const missingHistory: Database = {
      prepare: db.prepare.bind(db),
      async batch<T>(items: Statement[]) {
        sqlite.prepare('DELETE FROM design_history WHERE id = ?').run("h2");
        return db.batch<T>(items);
      },
    };
    await expect(deleteDesignHistory(missingHistory, { adminId: "a", workflowId: "w", historyId: "h2" })).rejects.toMatchObject({ status: 409 });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_logs WHERE workflowId='w'").get()).toMatchObject({ n: 0 });
    expect(sqlite.prepare("SELECT updatedAt FROM workflows WHERE id='w'").get()).toMatchObject({ updatedAt: 1 });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM design_history WHERE workflowId='w'").get()).toMatchObject({ n: 2 });
  });

  it("allows only one same-time concurrent delete to claim the workflow", async () => {
    const { db, sqlite } = setup();
    const results = await Promise.allSettled([
      deleteDesignHistory(db, { adminId: "a", workflowId: "w", historyId: "h2" }),
      deleteDesignHistory(db, { adminId: "a", workflowId: "w", historyId: "h2" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_logs WHERE workflowId='w'").get()).toMatchObject({ n: 1 });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM design_history WHERE workflowId='w'").get()).toMatchObject({ n: 2 });
  });
});
