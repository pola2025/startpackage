import { describe, expect, it } from "vitest";
import {
  buildRosterView,
  formatRosterPhone,
  isWeek2SendWindow,
  parseRosterText,
  submissionProgress,
  week2ReminderAt,
  week2ReminderTargets,
} from "./cohort-roster";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-10-29T09:00:00+09:00");

const COMPLETE_SUBMISSION = {
  사업자등록증URL: "r2://biz",
  프로필사진URL: "r2://profile",
  브랜드명: "브랜드",
  업종: "컨설팅",
  주소: "서울",
  대표번호: "02-123-4567",
  이메일: "a@example.com",
  로고제작방식: "기존로고",
  로고URL: "r2://logo",
};

describe("parseRosterText", () => {
  it("reads name and phone in either order with comma, tab or space", () => {
    const result = parseRosterText(
      "박주원 01057583824\n010-2006-8831, 유채영\n\n김 하나\t010.1234.5678\n박주원 010-5758-3824",
    );
    expect(result.errors).toEqual([]);
    expect(result.entries).toEqual([
      { name: "박주원", phone: "01057583824" },
      { name: "유채영", phone: "01020068831" },
      { name: "김 하나", phone: "01012345678" },
    ]);
  });

  it("reports lines without a mobile number or with a bad name", () => {
    const result = parseRosterText(
      "홍길동\n<b>홍</b> 01012345678\n02-123-4567 사무실",
    );
    expect(result.entries).toEqual([]);
    expect(result.errors.map((error) => error.line)).toEqual([1, 2, 3]);
  });

  it("formats stored digits for display", () => {
    expect(formatRosterPhone("01057583824")).toBe("010-5758-3824");
    expect(formatRosterPhone("0111234567")).toBe("011-123-4567");
  });
});

describe("submissionProgress", () => {
  it("is complete only when basic info and logo info are filled", () => {
    expect(submissionProgress(COMPLETE_SUBMISSION)).toEqual({
      complete: true,
      missing: [],
    });
    const partial = submissionProgress({
      ...COMPLETE_SUBMISSION,
      사업자등록증URL: "",
      로고URL: null,
    });
    expect(partial.complete).toBe(false);
    expect(partial.missing).toEqual(["사업자등록증", "기존 로고 파일"]);
    expect(submissionProgress(null).complete).toBe(false);
  });
});

describe("week-2 reminder timing", () => {
  it("sends at 10:00 KST seven days after the start date", () => {
    expect(new Date(week2ReminderAt(START)).toISOString()).toBe(
      "2026-11-05T01:00:00.000Z",
    );
    // 관리자 화면에서 날짜만 고르면 00:00 UTC(09:00 KST)로 저장된다. 다른 시각이어도 한국 날짜 기준으로 계산한다
    expect(week2ReminderAt(Date.parse("2026-10-29T00:30:00+09:00"))).toBe(
      week2ReminderAt(START),
    );
  });

  it("keeps a three-day catch-up window", () => {
    const at = week2ReminderAt(START);
    expect(isWeek2SendWindow(START, at - 1)).toBe(false);
    expect(isWeek2SendWindow(START, at)).toBe(true);
    expect(isWeek2SendWindow(START, at + 3 * DAY - 1)).toBe(true);
    expect(isWeek2SendWindow(START, at + 3 * DAY)).toBe(false);
  });
});

const roster = [
  { id: "r1", name: "박주원", phone: "01057583824" },
  { id: "r2", name: "유채영", phone: "01020068831" },
  { id: "r3", name: "김완료", phone: "01011112222" },
];
const users = [
  {
    id: "u2",
    name: "유채영",
    phone: "010-2006-8831",
    createdAt: START,
    submission: { 브랜드명: "브랜드" },
  },
  {
    id: "u3",
    name: "김완료",
    phone: "01011112222",
    createdAt: START,
    submission: COMPLETE_SUBMISSION,
  },
  {
    id: "u4",
    name: "명단밖",
    phone: "010-9999-0000",
    createdAt: START + DAY,
    submission: null,
  },
];

describe("buildRosterView", () => {
  it("marks each roster member and lists members who joined outside the roster", () => {
    const view = buildRosterView({ roster, users, reminders: [] });
    expect(view.members.map((member) => [member.name, member.status])).toEqual([
      ["박주원", "미가입"],
      ["유채영", "자료 미제출"],
      ["김완료", "자료 제출 완료"],
    ]);
    expect(view.members[1].missing).toContain("사업자등록증");
    expect(view.outsiders).toEqual([
      {
        userId: "u4",
        name: "명단밖",
        phone: "01099990000",
        createdAt: START + DAY,
      },
    ]);
    expect(view.counts).toEqual({ roster: 3, joined: 2, complete: 1 });
  });
});

describe("week2ReminderTargets", () => {
  it("targets roster members not signed up and members with missing materials", () => {
    expect(week2ReminderTargets({ roster, users, sentPhones: [] })).toEqual([
      { phone: "01057583824", name: "박주원", userId: null, reason: "미가입" },
      {
        phone: "01020068831",
        name: "유채영",
        userId: "u2",
        reason: "자료 미제출",
      },
      {
        phone: "01099990000",
        name: "명단밖",
        userId: "u4",
        reason: "자료 미제출",
      },
    ]);
  });

  it("skips phones that were already sent", () => {
    const targets = week2ReminderTargets({
      roster,
      users,
      sentPhones: ["01057583824", "01099990000"],
    });
    expect(targets.map((target) => target.name)).toEqual(["유채영"]);
  });
});
