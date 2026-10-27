import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  callDataService,
  sendMemberNotice,
  resolveNoticeOutcome,
  sendTelegramMessage,
} = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendMemberNotice: vi.fn(),
  resolveNoticeOutcome: vi.fn(),
  sendTelegramMessage: vi.fn(),
}));

vi.mock("@/lib/d1/runtime", () => ({
  isD1RuntimeEnabled: () => process.env.D1_RUNTIME_ENABLED === "true",
}));
vi.mock("@/lib/d1/maintenance", () => ({
  isMigrationMaintenance: () => false,
}));
vi.mock("@/lib/d1/service-client", () => ({ callDataService }));
vi.mock("@/lib/notification/memberNotice", () => ({
  sendMemberNotice,
  resolveNoticeOutcome,
}));
vi.mock("@/lib/notification/telegramClient", () => ({ sendTelegramMessage }));

import { GET } from "./route";

const SECRET = "cron-secret-with-at-least-32-characters";
const START = Date.parse("2026-10-29T09:00:00+09:00");
const WEEK2 = Date.parse("2026-11-05T10:00:00+09:00");

const cohort = {
  id: "c28",
  name: "28기",
  startAt: START,
  roster: [
    { id: "r1", name: "박주원", phone: "01057583824" },
    { id: "r2", name: "유채영", phone: "01020068831" },
  ],
  users: [
    {
      id: "u2",
      name: "유채영",
      phone: "010-2006-8831",
      createdAt: START,
      submission: { 브랜드명: "브랜드" },
    },
  ],
  sentPhones: [] as string[],
};

function request(secret = SECRET) {
  return new Request("https://www.polaai.co.kr/api/cron/cohort-reminders", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("cohort week-2 reminder cron", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(WEEK2 + 60_000);
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("D1_RUNTIME_ENABLED", "true");
    for (const mock of [
      callDataService,
      sendMemberNotice,
      resolveNoticeOutcome,
      sendTelegramMessage,
    ])
      mock.mockReset();
    sendTelegramMessage.mockResolvedValue(true);
    sendMemberNotice.mockResolvedValue({
      via: "alimtalk",
      messageId: "m1",
      smsChannel: "LMS",
      requestedAt: Date.now(),
    });
    resolveNoticeOutcome.mockResolvedValue({
      channel: "알림톡",
      status: "성공",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("rejects an invalid cron secret", async () => {
    const response = await GET(request("wrong"));
    expect(response.status).toBe(401);
    expect(callDataService).not.toHaveBeenCalled();
  });

  it("sends the template to members not signed up or missing materials and reports to admins", async () => {
    let claims = 0;
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/reminder-candidates")
        return { cohorts: [cohort] };
      if (operation === "roster-domain/reminder-claim")
        return { claimed: true, id: `claim-${++claims}` };
      return { ok: true };
    });
    const response = await GET(request());
    expect(await response.json()).toEqual({ sent: 2, candidates: 1 });
    expect(sendMemberNotice).toHaveBeenCalledTimes(2);
    expect(sendMemberNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "01057583824",
        alimtalk: expect.objectContaining({ templateCode: "spSignupRemind01" }),
        sms: expect.objectContaining({
          forceLms: true,
          content: expect.stringContaining(
            "자료제출이 되어야만 진행이 가능합니다.",
          ),
        }),
      }),
    );
    expect(callDataService).toHaveBeenCalledWith(
      "roster-domain/reminder-claim",
      expect.objectContaining({
        phone: "01057583824",
        userId: null,
        reason: "미가입",
      }),
    );
    expect(callDataService).toHaveBeenCalledWith(
      "roster-domain/reminder-claim",
      expect.objectContaining({
        phone: "01020068831",
        userId: "u2",
        reason: "자료 미제출",
      }),
    );
    expect(callDataService).toHaveBeenCalledWith(
      "roster-domain/reminder-finish",
      expect.objectContaining({
        id: "claim-1",
        status: "성공",
        channel: "알림톡",
        metadata: JSON.stringify({ alimtalkMessageId: "m1" }),
      }),
    );
    const report = sendTelegramMessage.mock.calls[0][0] as string;
    expect(report).toContain("[startpackage/2주차알림] <b>28기</b>");
    expect(report).toContain("미가입 1명 · 자료 미제출 1명 · 실패 0건");
  });

  it("does not send to a phone another run already claimed", async () => {
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/reminder-candidates")
        return { cohorts: [cohort] };
      if (operation === "roster-domain/reminder-claim")
        return { claimed: false, id: "x" };
      return { ok: true };
    });
    const response = await GET(request());
    expect(await response.json()).toEqual({ sent: 0, candidates: 1 });
    expect(sendMemberNotice).not.toHaveBeenCalled();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("waits until the week-2 date before sending", async () => {
    vi.setSystemTime(WEEK2 - 60_000);
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/reminder-candidates")
        return { cohorts: [cohort] };
      throw new Error(`unexpected ${operation}`);
    });
    const response = await GET(request());
    expect(await response.json()).toEqual({ sent: 0, candidates: 1 });
    expect(sendMemberNotice).not.toHaveBeenCalled();
  });

  it("records a failed send and keeps going", async () => {
    let claims = 0;
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/reminder-candidates")
        return { cohorts: [cohort] };
      if (operation === "roster-domain/reminder-claim")
        return { claimed: true, id: `claim-${++claims}` };
      return { ok: true };
    });
    sendMemberNotice.mockRejectedValueOnce(new Error("SENS 500"));
    const response = await GET(request());
    expect(await response.json()).toEqual({ sent: 2, candidates: 1 });
    expect(callDataService).toHaveBeenCalledWith(
      "roster-domain/reminder-finish",
      expect.objectContaining({
        id: "claim-1",
        status: "실패",
        note: "발송 요청 실패: SENS 500",
      }),
    );
    expect(sendTelegramMessage.mock.calls[0][0]).toContain("실패 1건");
  });
});
