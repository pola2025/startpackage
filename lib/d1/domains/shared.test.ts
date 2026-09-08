import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DataServiceError, type Database, type QueryResult, type SqlValue, type Statement } from "../database";
import { sharedOperation } from "./shared";

function setup(): { db: Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  sqlite.exec(readFileSync("prisma/d1/0004_shared.sql", "utf8"));
  sqlite.exec(readFileSync("prisma/d1/0008_fanout_resume.sql", "utf8"));
  sqlite.exec(`INSERT INTO cohorts (id,name,교육시작일,교육요일,자료제출마감일,updatedAt)
    VALUES ('cohort','test',1,'목',2,1);
    INSERT INTO users (id,email,password,이름,연락처,cohortId,SMS수신동의,콘텐츠팁이메일수신,updatedAt)
    VALUES ('user-a','a@test.invalid','old','A','01000000001','cohort',1,1,1);`);
  function statement(sql: string, values: SqlValue[] = []): Statement {
    return {
      bind: (...next) => statement(sql, next),
      async first<T>() { return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null; },
      async all<T>() {
        const result = sqlite.prepare(sql).all(...values) as T[];
        const changes = Number((sqlite.prepare("SELECT changes() AS changes").get() as { changes: number }).changes);
        return { results: result, success: true, meta: { changes } };
      },
    };
  }
  const db: Database = {
    prepare: statement,
    async batch<T>(statements: Statement[]): Promise<QueryResult<T>[]> {
      const results: QueryResult<T>[] = [];
      sqlite.exec("BEGIN");
      try {
        for (const item of statements) results.push(await item.all() as QueryResult<T>);
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
      return results;
    },
  };
  return { db, sqlite };
}

describe("shared D1 operations", () => {
  it("stores no temporary password and atomically enforces reset cooldown", async () => {
    const { db, sqlite } = setup();
    const first = await sharedOperation(db, "shared-domain/password-reset-start", {
      cleanPhone: "01000000001",
      formattedPhone: "010-0000-0001",
      hashedPassword: "hashed-value",
      now: 10_000,
    }) as { notificationId: string };
    const notification = sqlite.prepare("SELECT message, status FROM notifications WHERE id = ?").get(first.notificationId) as { message: string; status: string };
    expect(notification.message).not.toContain("hashed-value");
    expect(notification.status).toBe("전송중");
    await expect(sharedOperation(db, "password-reset-start", {
      cleanPhone: "01000000001",
      formattedPhone: "010-0000-0001",
      hashedPassword: "other-hash",
      now: 10_001,
    })).rejects.toMatchObject({ status: 429 });
  });

  it("uses bounded indexed pages for scheduled recipients", async () => {
    const { db, sqlite } = setup();
    await sharedOperation(db, "scheduled-notification-register", { fanoutKey: "tip-1" });
    await sharedOperation(db, "scheduled-notification-claim", { fanoutKey: "tip-1", leaseToken: "lease-1" });
    const page = await sharedOperation(db, "scheduled-notification-page", {
      pageSize: 1,
      cursorSecret: "shared-test-cursor-secret-with-32-characters",
      fanoutKey: "tip-1",
      leaseToken: "lease-1",
    }) as { items: unknown[] };
    expect(page.items).toHaveLength(1);
    const recipient = page.items[0] as { id: string };
    await sharedOperation(db, "scheduled-notification-delivery", {
      fanoutKey: "tip-1",
      userId: recipient.id,
      status: "sent",
    });
    const sentPage = await sharedOperation(db, "scheduled-notification-page", {
      pageSize: 1,
      cursorSecret: "shared-test-cursor-secret-with-32-characters",
      fanoutKey: "tip-1",
      leaseToken: "lease-1",
    }) as { items: unknown[] };
    expect(sentPage.items).toHaveLength(0);
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN SELECT id FROM users WHERE 콘텐츠팁이메일수신 = 1 AND id > ? ORDER BY id LIMIT ?").all("", 2) as Array<{ detail: string }>;
    expect(plan.some((item) => item.detail.includes("users_content_tip_consent_id_keyset"))).toBe(true);
  });

  it("resumes after 250 recipients and retries failed deliveries", async () => {
    const { db, sqlite } = setup();
    const insert = sqlite.prepare(`INSERT INTO users (id,email,password,이름,연락처,cohortId,SMS수신동의,콘텐츠팁이메일수신,updatedAt)
      VALUES (?, ?, 'old', ?, ?, 'cohort', 1, 1, 1)`);
    for (let index = 0; index < 250; index += 1) {
      const id = `user-${String(index).padStart(3, "0")}`;
      insert.run(id, `${id}@test.invalid`, id, `0100000${String(index).padStart(4, "0")}`);
    }
    const secret = "shared-test-cursor-secret-with-32-characters";
    await sharedOperation(db, "scheduled-notification-register", { fanoutKey: "tip-resume" });
    await sharedOperation(db, "scheduled-notification-claim", { fanoutKey: "tip-resume", leaseToken: "lease-resume" });
    let page = await sharedOperation(db, "scheduled-notification-page", { pageSize: 50, cursorSecret: secret, fanoutKey: "tip-resume", leaseToken: "lease-resume" }) as { items: Array<{ id: string }>; nextCursor?: string; hasMore: boolean };
    for (let index = 0; index < 5; index += 1) {
      expect(page.items).toHaveLength(50);
      await sharedOperation(db, "scheduled-notification-deliveries", {
        fanoutKey: "tip-resume",
        leaseToken: "lease-resume",
        deliveries: page.items.map((item) => ({ userId: item.id, status: "sent" })),
      });
      await sharedOperation(db, "scheduled-notification-advance", { fanoutKey: "tip-resume", leaseToken: "lease-resume", cursor: page.nextCursor, completed: false });
      page = await sharedOperation(db, "scheduled-notification-page", { pageSize: 50, cursorSecret: secret, fanoutKey: "tip-resume", leaseToken: "lease-resume" }) as typeof page;
    }
    expect(page.items).toHaveLength(1);
    expect(page.hasMore).toBe(false);
    await sharedOperation(db, "scheduled-notification-deliveries", { fanoutKey: "tip-resume", leaseToken: "lease-resume", deliveries: [{ userId: page.items[0].id, status: "sent" }] });
    await sharedOperation(db, "scheduled-notification-advance", { fanoutKey: "tip-resume", leaseToken: "lease-resume", cursor: page.nextCursor, completed: true });
    const completed = await sharedOperation(db, "scheduled-notification-page", { pageSize: 50, cursorSecret: secret, fanoutKey: "tip-resume", leaseToken: "lease-resume" }) as { items: unknown[]; completed: boolean };
    expect(completed).toMatchObject({ items: [], completed: true });

    await sharedOperation(db, "scheduled-notification-register", { fanoutKey: "tip-retry" });
    await sharedOperation(db, "scheduled-notification-claim", { fanoutKey: "tip-retry", leaseToken: "lease-retry" });
    const retryPage = await sharedOperation(db, "scheduled-notification-page", { pageSize: 1, cursorSecret: secret, fanoutKey: "tip-retry", leaseToken: "lease-retry" }) as { items: Array<{ id: string }> };
    await sharedOperation(db, "scheduled-notification-deliveries", { fanoutKey: "tip-retry", leaseToken: "lease-retry", deliveries: [{ userId: retryPage.items[0].id, status: "pending" }] });
    await sharedOperation(db, "scheduled-notification-advance", { fanoutKey: "tip-retry", leaseToken: "lease-retry", completed: false });
    const retried = await sharedOperation(db, "scheduled-notification-page", { pageSize: 1, cursorSecret: secret, fanoutKey: "tip-retry", leaseToken: "lease-retry" }) as { items: Array<{ id: string }> };
    expect(retried.items[0].id).toBe(retryPage.items[0].id);
  });
});
