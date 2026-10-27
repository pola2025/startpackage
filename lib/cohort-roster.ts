/**
 * 기수 대상자 명단과 2주차 안내.
 *
 * - 관리자가 붙여 넣은 "이름 연락처" 줄을 명단 항목으로 바꾼다.
 * - 자료 제출 완료는 수강생 대시보드와 같은 기준(기본 정보 7항목 + 로고 정보)으로 판정한다.
 * - 2주차 안내는 교육 시작일 + 7일(한국 시간) 오전 10시부터 3일 동안만 보낸다.
 */

import {
  basicChecklist,
  logoChecklist,
  missingItems,
} from "@/lib/submission/parts";

export const ROSTER_MAX_ENTRIES = 300;
export const NOT_ON_ROSTER_MESSAGE =
  "교육생 명단에 없는 연락처입니다. 폴라애드로 연락바랍니다.";
export const WEEK2_REMINDER_KIND = "week2";
export const WEEK2_REMINDER_TYPE = "2주차미제출알림";
/** 한 번 실행에서 보내는 최대 건수. 남은 대상은 다음 날 이어서 보낸다. */
export const WEEK2_REMINDER_BATCH = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK2_SEND_WINDOW_MS = 3 * DAY_MS;
const NAME_PATTERN = /^[가-힣a-zA-Z\s]{1,50}$/;
const PHONE_PATTERN = /01[0-9][-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4}/;

export type RosterEntry = { name: string; phone: string };
export type RosterParseError = { line: number; text: string; message: string };

export function normalizeRosterPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return /^01\d{8,9}$/.test(digits) ? digits : null;
}

export function formatRosterPhone(digits: string): string {
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

/** 한 줄에 한 명씩 "이름 연락처"(쉼표·탭·공백 구분, 순서 무관)를 읽는다. */
export function parseRosterText(text: string): {
  entries: RosterEntry[];
  errors: RosterParseError[];
} {
  const entries: RosterEntry[] = [];
  const errors: RosterParseError[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const match = PHONE_PATTERN.exec(line);
    const phone = match ? normalizeRosterPhone(match[0]) : null;
    if (!match || !phone) {
      errors.push({
        line: index + 1,
        text: line,
        message: "연락처 형식이 아닙니다 (예: 010-1234-5678)",
      });
      return;
    }
    const name = (
      line.slice(0, match.index) +
      " " +
      line.slice(match.index + match[0].length)
    )
      .replace(/[,\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!NAME_PATTERN.test(name)) {
      errors.push({
        line: index + 1,
        text: line,
        message: "이름은 한글 또는 영문으로 입력해주세요",
      });
      return;
    }
    if (seen.has(phone)) return;
    seen.add(phone);
    entries.push({ name, phone });
  });
  if (entries.length > ROSTER_MAX_ENTRIES)
    errors.push({
      line: 0,
      text: "",
      message: `한 번에 ${ROSTER_MAX_ENTRIES}명까지 등록할 수 있습니다`,
    });
  return { entries, errors };
}

/** 대시보드와 같은 기준: 기본 정보 7항목과 로고 정보가 모두 채워져야 제출 완료다. */
export function submissionProgress(
  sub: Record<string, unknown> | null | undefined,
): {
  complete: boolean;
  missing: string[];
} {
  const missing = [
    ...missingItems(basicChecklist(sub)),
    ...missingItems(logoChecklist(sub)),
  ].map((item) => item.label);
  return { complete: missing.length === 0, missing };
}

/** 교육 시작일의 한국 날짜 + 7일, 오전 10시(한국 시간) */
export function week2ReminderAt(startAt: number): number {
  const kstMidnight =
    Math.floor((startAt + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
  return kstMidnight + 7 * DAY_MS + 10 * 60 * 60 * 1000;
}

export function isWeek2SendWindow(startAt: number, now: number): boolean {
  const at = week2ReminderAt(startAt);
  return now >= at && now < at + WEEK2_SEND_WINDOW_MS;
}

export type RosterUser = {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
  submission: Record<string, unknown> | null;
};

export type RosterRow = {
  id: string;
  name: string;
  phone: string;
};

export type RosterReminder = {
  phone: string;
  status: string;
  channel: string | null;
  note: string | null;
  createdAt: number;
};

export type RosterMemberStatus = "미가입" | "자료 미제출" | "자료 제출 완료";

export type RosterView = {
  members: Array<{
    id: string;
    name: string;
    phone: string;
    status: RosterMemberStatus;
    missing: string[];
    userName: string | null;
    reminder: RosterReminder | null;
  }>;
  /** 명단에 없는데 이 기수로 가입한 회원(명단 등록 전 가입 등) */
  outsiders: Array<{
    userId: string;
    name: string;
    phone: string;
    createdAt: number;
  }>;
  counts: { roster: number; joined: number; complete: number };
};

export function buildRosterView(input: {
  roster: RosterRow[];
  users: RosterUser[];
  reminders: RosterReminder[];
}): RosterView {
  const usersByPhone = new Map<string, RosterUser>();
  for (const user of input.users) {
    const phone = normalizeRosterPhone(user.phone);
    if (phone && !usersByPhone.has(phone)) usersByPhone.set(phone, user);
  }
  const reminderByPhone = new Map(
    input.reminders.map((row) => [row.phone, row]),
  );
  const rosterPhones = new Set(input.roster.map((row) => row.phone));

  const members = input.roster.map((row) => {
    const user = usersByPhone.get(row.phone);
    const progress = user ? submissionProgress(user.submission) : null;
    const status: RosterMemberStatus = !user
      ? "미가입"
      : progress?.complete
        ? "자료 제출 완료"
        : "자료 미제출";
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      status,
      missing: progress && !progress.complete ? progress.missing : [],
      userName: user ? user.name : null,
      reminder: reminderByPhone.get(row.phone) ?? null,
    };
  });

  const outsiders = input.users
    .filter((user) => {
      const phone = normalizeRosterPhone(user.phone);
      return !phone || !rosterPhones.has(phone);
    })
    .map((user) => ({
      userId: user.id,
      name: user.name,
      phone: normalizeRosterPhone(user.phone) ?? user.phone,
      createdAt: user.createdAt,
    }));

  return {
    members,
    outsiders,
    counts: {
      roster: members.length,
      joined: members.filter((member) => member.status !== "미가입").length,
      complete: members.filter((member) => member.status === "자료 제출 완료")
        .length,
    },
  };
}

export type ReminderTarget = {
  phone: string;
  name: string;
  userId: string | null;
  reason: "미가입" | "자료 미제출";
};

/** 명단 중 미가입자 + 이 기수 회원 중 자료 미제출자. 이미 보낸 연락처와 중복 연락처는 뺀다. */
export function week2ReminderTargets(input: {
  roster: RosterRow[];
  users: RosterUser[];
  sentPhones: Iterable<string>;
}): ReminderTarget[] {
  const sent = new Set(input.sentPhones);
  const targets = new Map<string, ReminderTarget>();
  const usersByPhone = new Map<string, RosterUser>();
  for (const user of input.users) {
    const phone = normalizeRosterPhone(user.phone);
    if (phone && !usersByPhone.has(phone)) usersByPhone.set(phone, user);
  }
  for (const row of input.roster) {
    if (sent.has(row.phone) || usersByPhone.has(row.phone)) continue;
    targets.set(row.phone, {
      phone: row.phone,
      name: row.name,
      userId: null,
      reason: "미가입",
    });
  }
  for (const [phone, user] of usersByPhone) {
    if (sent.has(phone) || targets.has(phone)) continue;
    if (submissionProgress(user.submission).complete) continue;
    targets.set(phone, {
      phone,
      name: user.name,
      userId: user.id,
      reason: "자료 미제출",
    });
  }
  return [...targets.values()];
}
