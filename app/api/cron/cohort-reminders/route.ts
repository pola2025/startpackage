import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { isMigrationMaintenance } from "@/lib/d1/maintenance";
import { callDataService } from "@/lib/d1/service-client";
import {
  resolveNoticeOutcome,
  sendMemberNotice,
  type NoticeOutcome,
  type NoticeSend,
} from "@/lib/notification/memberNotice";
import { sendTelegramMessage } from "@/lib/notification/telegramClient";
import {
  SIGNUP_REMIND_TEXT,
  signupRemindTemplate,
} from "@/lib/sms/alimtalkTemplates";
import {
  isWeek2SendWindow,
  week2ReminderTargets,
  WEEK2_REMINDER_BATCH,
  WEEK2_REMINDER_KIND,
  type ReminderTarget,
  type RosterRow,
  type RosterUser,
} from "@/lib/cohort-roster";

export const maxDuration = 60;

const TITLE = "[스타트패키지] 가입·자료 제출 안내";

type Candidate = {
  id: string;
  name: string;
  startAt: number;
  roster: RosterRow[];
  users: RosterUser[];
  sentPhones: string[];
};

type Result = {
  target: ReminderTarget;
  status: NoticeOutcome["status"];
  channel: NoticeOutcome["channel"] | null;
  note?: string;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] as string,
  );

function hasCronSecret(request: Request): boolean {
  const configured = process.env.CRON_SECRET ?? "";
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || !provided) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(provided);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

async function finish(id: string, result: Result, send?: NoticeSend) {
  await callDataService("roster-domain/reminder-finish", {
    id,
    status: result.status,
    channel: result.channel,
    note: result.note ?? null,
    title: TITLE,
    message: SIGNUP_REMIND_TEXT,
    metadata:
      send?.via === "alimtalk"
        ? JSON.stringify({ alimtalkMessageId: send.messageId })
        : null,
  });
}

/** 한 기수의 대상자에게 보낸다. 기록을 먼저 잡은 연락처에만 보내므로 다시 실행해도 두 번 가지 않는다. */
async function sendCohort(cohort: Candidate, targets: ReminderTarget[]) {
  const sent: Array<{ id: string; target: ReminderTarget; send: NoticeSend }> =
    [];
  const results: Result[] = [];
  for (const target of targets) {
    const claim = await callDataService<{ claimed: boolean; id: string }>(
      "roster-domain/reminder-claim",
      {
        cohortId: cohort.id,
        kind: WEEK2_REMINDER_KIND,
        phone: target.phone,
        name: target.name,
        userId: target.userId,
        reason: target.reason,
      },
    );
    if (!claim.claimed) continue;
    try {
      const send = await sendMemberNotice({
        to: target.phone,
        alimtalk: signupRemindTemplate(),
        sms: { content: SIGNUP_REMIND_TEXT, forceLms: true },
      });
      sent.push({ id: claim.id, target, send });
    } catch (error) {
      const result: Result = {
        target,
        status: "실패",
        channel: null,
        note: `발송 요청 실패: ${error instanceof Error ? error.message.slice(0, 200) : "알 수 없는 오류"}`,
      };
      results.push(result);
      await finish(claim.id, result);
    }
  }

  // 알림톡 결과 조회는 건마다 1~3초 걸려서 한꺼번에 기다린다
  const outcomes = await Promise.all(
    sent.map((item) =>
      resolveNoticeOutcome(item.send).catch(
        (): NoticeOutcome => ({
          channel: item.send.via === "alimtalk" ? "알림톡" : item.send.channel,
          status: "확인 전",
          note: "발송 결과 조회 실패",
        }),
      ),
    ),
  );
  for (const [index, item] of sent.entries()) {
    const outcome = outcomes[index];
    const result: Result = {
      target: item.target,
      status: outcome.status,
      channel: outcome.channel,
      ...(outcome.note ? { note: outcome.note } : {}),
    };
    results.push(result);
    await finish(item.id, result, item.send);
  }
  return results;
}

function report(cohortName: string, results: Result[]): string {
  const count = (reason: ReminderTarget["reason"]) =>
    results.filter((row) => row.target.reason === reason).length;
  const failed = results.filter((row) => row.status === "실패").length;
  const lines = results.map((row) => {
    const via =
      row.status === "실패"
        ? "실패"
        : row.channel === "알림톡"
          ? "알림톡"
          : `문자(${row.channel ?? "?"})`;
    return `• ${escapeHtml(row.target.name)} · ${row.target.reason} · ${via}${row.status === "확인 전" ? " 확인 전" : ""}`;
  });
  return [
    `[startpackage/2주차알림] <b>${escapeHtml(cohortName)}</b>`,
    `미가입 ${count("미가입")}명 · 자료 미제출 ${count("자료 미제출")}명 · 실패 ${failed}건`,
    "",
    ...lines,
  ].join("\n");
}

async function run(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32)
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  if (!hasCronSecret(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isD1RuntimeEnabled() || isMigrationMaintenance())
    return NextResponse.json({ skipped: true, sent: 0 });

  const now = Date.now();
  const data = await callDataService<{ cohorts: Candidate[] }>(
    "roster-domain/reminder-candidates",
    { now },
  );
  let budget = WEEK2_REMINDER_BATCH;
  let total = 0;
  for (const cohort of data.cohorts) {
    if (budget <= 0) break;
    if (!isWeek2SendWindow(cohort.startAt, now)) continue;
    const targets = week2ReminderTargets(cohort).slice(0, budget);
    if (targets.length === 0) continue;
    budget -= targets.length;
    try {
      const results = await sendCohort(cohort, targets);
      total += results.length;
      if (results.length > 0)
        await sendTelegramMessage(report(cohort.name, results)).catch((error) =>
          console.error("[startpackage/2주차알림] 텔레그램 실패:", error),
        );
    } catch (error) {
      console.error("[startpackage/2주차알림] 발송 실패:", error);
      await sendTelegramMessage(
        `[startpackage/2주차알림] <b>${escapeHtml(cohort.name)}</b> 발송 중 오류\n${escapeHtml(error instanceof Error ? error.message.slice(0, 200) : "알 수 없는 오류")}`,
      ).catch(() => undefined);
    }
  }
  return NextResponse.json({ sent: total, candidates: data.cohorts.length });
}

export const GET = run;
export const POST = run;
