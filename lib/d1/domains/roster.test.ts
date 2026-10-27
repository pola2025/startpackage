import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database, QueryResult, SqlValue, Statement } from "../database";
import { rosterOperation } from "./roster";

// D1 처럼 SELECT 가 아니면 meta.changes 를 돌려준다
class TestDb implements Database {
  constructor(readonly raw: DatabaseSync) {}
  prepare(sql: string): Statement {
    const raw = this.raw;
    const make = (values: SqlValue[]): Statement => ({
      bind: (...next: SqlValue[]) => make(next),
      async first<T>() { return (raw.prepare(sql).get(...values) as T | undefined) ?? null; },
      async all<T>() {
        if (/^\s*SELECT/i.test(sql)) return { results: raw.prepare(sql).all(...values) as T[], success: true, meta: {} } as QueryResult<T>;
        const result = raw.prepare(sql).run(...values);
        return { results: [], success: true, meta: { changes: Number(result.changes) } } as QueryResult<T>;
      },
    });
    return make([]);
  }
  async batch<T = Record<string, unknown>>(statements: Statement[]): Promise<QueryResult<T>[]> {
    const results: QueryResult<T>[] = [];
    for (const statement of statements) results.push(await statement.all<T>());
    return results;
  }
}

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-10-29T09:00:00+09:00");

function seed(): TestDb {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync("prisma/d1/0001_initial.sql", "utf8"));
  raw.prepare(`INSERT INTO cohorts (id,name,"교육시작일","교육요일","자료제출마감일",updatedAt) VALUES (?,?,?,?,?,1)`).run("c28", "28기", START, "목", START + 21 * DAY);
  raw.prepare(`INSERT INTO cohorts (id,name,"교육시작일","교육요일","자료제출마감일",updatedAt) VALUES (?,?,?,?,?,1)`).run("c27", "27기", START - 43 * DAY, "목", START - 22 * DAY);
  raw.exec(`INSERT INTO admins (id,email,password,name,role,updatedAt) VALUES ('admin-1','admin@test.invalid','x','관리자','operator',1);`);
  raw.prepare(`INSERT INTO users (id,email,password,"이름","연락처",cohortId,updatedAt,createdAt) VALUES (?,?,?,?,?,?,1,?)`).run("u1", "a@test.invalid", "x", "유채영", "010-2006-8831", "c28", START + DAY);
  raw.prepare(`INSERT INTO submissions (id,userId,"브랜드명",updatedAt) VALUES (?,?,?,1)`).run("s1", "u1", "브랜드");
  return new TestDb(raw);
}

describe("roster D1 operations", () => {
  it("adds entries once per phone and reports duplicates", async () => {
    const db = seed();
    const first = await rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "박주원", phone: "01057583824" }, { name: "유채영", phone: "010-2006-8831" }] });
    expect(first).toEqual({ added: 2, duplicates: 0 });
    const second = await rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "박주원", phone: "010-5758-3824" }] });
    expect(second).toEqual({ added: 0, duplicates: 1 });
    expect(db.raw.prepare(`SELECT phone FROM cohort_roster ORDER BY phone`).all().map((row) => (row as { phone: string }).phone)).toEqual(["01020068831", "01057583824"]);
  });

  it("rejects a non-admin and invalid entries before writing", async () => {
    const db = seed();
    await expect(rosterOperation(db, "add", { adminId: "nobody", cohortId: "c28", entries: [{ name: "박주원", phone: "01057583824" }] })).rejects.toMatchObject({ status: 403 });
    await expect(rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "<script>", phone: "01057583824" }] })).rejects.toMatchObject({ status: 400 });
    await expect(rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "박주원", phone: "021234567" }] })).rejects.toMatchObject({ status: 400 });
    expect(db.raw.prepare(`SELECT COUNT(*) AS n FROM cohort_roster`).get()).toEqual({ n: 0 });
  });

  it("checks signup phones only for cohorts that have a roster", async () => {
    const db = seed();
    expect(await rosterOperation(db, "signup-check", { cohortId: "c28", phone: "01011112222", name: "박주원" })).toMatchObject({ rosterSize: 0, matched: false });
    await rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "박주원", phone: "01057583824" }] });
    expect(await rosterOperation(db, "signup-check", { cohortId: "c28", phone: "010-5758-3824", name: "박주원" })).toMatchObject({ rosterSize: 1, cohortName: "28기", matched: true, sameName: [] });
    expect(await rosterOperation(db, "signup-check", { cohortId: "c28", phone: "01011112222", name: "박주원" })).toEqual({ rosterSize: 1, cohortName: "28기", matched: false, sameName: [{ name: "박주원", phone: "010-5758-3824" }] });
  });

  it("returns roster, users with submission fields, and sent reminders for one cohort", async () => {
    const db = seed();
    await rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "박주원", phone: "01057583824" }] });
    const detail = await rosterOperation(db, "detail", { adminId: "admin-1", cohortId: "c28" }) as { cohort: { startAt: number }; roster: unknown[]; users: Array<{ id: string; submission: Record<string, unknown> | null }> };
    expect(detail.cohort.startAt).toBe(START);
    expect(detail.roster).toHaveLength(1);
    expect(detail.users).toEqual([expect.objectContaining({ id: "u1", phone: "010-2006-8831", submission: expect.objectContaining({ 브랜드명: "브랜드", 사업자등록증URL: null }) })]);
  });

  it("deletes one roster entry inside the given cohort only", async () => {
    const db = seed();
    await rosterOperation(db, "add", { adminId: "admin-1", cohortId: "c28", entries: [{ name: "박주원", phone: "01057583824" }] });
    const id = (db.raw.prepare(`SELECT id FROM cohort_roster`).get() as { id: string }).id;
    await expect(rosterOperation(db, "delete", { adminId: "admin-1", cohortId: "c27", id })).rejects.toMatchObject({ status: 404 });
    await rosterOperation(db, "delete", { adminId: "admin-1", cohortId: "c28", id });
    expect(db.raw.prepare(`SELECT COUNT(*) AS n FROM cohort_roster`).get()).toEqual({ n: 0 });
  });

  it("picks only cohorts around their week-2 date", async () => {
    const db = seed();
    const before = await rosterOperation(db, "reminder-candidates", { now: START + 2 * DAY }) as { cohorts: unknown[] };
    expect(before.cohorts).toHaveLength(0);
    const during = await rosterOperation(db, "reminder-candidates", { now: START + 7 * DAY + 2 * 60 * 60 * 1000 }) as { cohorts: Array<{ id: string; users: unknown[] }> };
    expect(during.cohorts.map((row) => row.id)).toEqual(["c28"]);
    expect(during.cohorts[0].users).toHaveLength(1);
  });

  it("claims a phone once and records the result in member notifications", async () => {
    const db = seed();
    const claim = { cohortId: "c28", kind: "week2", phone: "01020068831", name: "유채영", userId: "u1", reason: "자료 미제출" };
    const first = await rosterOperation(db, "reminder-claim", claim) as { claimed: boolean; id: string };
    const again = await rosterOperation(db, "reminder-claim", claim) as { claimed: boolean };
    expect(first.claimed).toBe(true);
    expect(again.claimed).toBe(false);
    await rosterOperation(db, "reminder-finish", { id: first.id, status: "성공", channel: "알림톡", note: null, title: "제목", message: "본문", metadata: JSON.stringify({ alimtalkMessageId: "m1" }) });
    expect(db.raw.prepare(`SELECT status, channel FROM cohort_reminders`).get()).toEqual({ status: "성공", channel: "알림톡" });
    expect(db.raw.prepare(`SELECT userId, type, channel, status, sentByName FROM notifications`).get()).toEqual({ userId: "u1", type: "2주차미제출알림", channel: "알림톡", status: "성공", sentByName: "자동 발송" });
  });

  it("records a not-yet-signed-up reminder without a member notification", async () => {
    const db = seed();
    const claim = await rosterOperation(db, "reminder-claim", { cohortId: "c28", kind: "week2", phone: "01057583824", name: "박주원", userId: null, reason: "미가입" }) as { id: string };
    await rosterOperation(db, "reminder-finish", { id: claim.id, status: "성공", channel: "LMS", note: "알림톡 실패(3015)로 문자 대체 발송", title: "제목", message: "본문" });
    expect(db.raw.prepare(`SELECT status, channel, note FROM cohort_reminders`).get()).toEqual({ status: "성공", channel: "LMS", note: "알림톡 실패(3015)로 문자 대체 발송" });
    expect(db.raw.prepare(`SELECT COUNT(*) AS n FROM notifications`).get()).toEqual({ n: 0 });
  });

  it("rejects unknown operations", async () => {
    await expect(rosterOperation(seed(), "unknown", {})).rejects.toMatchObject({ status: 404 });
  });
});
