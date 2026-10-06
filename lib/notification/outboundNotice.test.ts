import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({
  callDataService: mocks.callDataService,
}));
vi.mock("./telegramClient", () => ({}));
vi.mock("./slackClient", () => ({ postMessage: mocks.postMessage }));

import { logOutboundNotice } from "./notificationService";
import { smsTypeFor } from "@/lib/sms/ncpSensClient";

describe("logOutboundNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callDataService.mockResolvedValue({
      id: "user-1",
      이름: "홍길동",
      연락처: "01012345678",
      email: "member@test.invalid",
      slackChannelId: "C_MEMBER",
    });
  });

  it("records what went out and by which route in the member's Slack channel", async () => {
    await logOutboundNotice({
      userId: "user-1",
      notice: "시안 완료·확정 요청 안내",
      channel: "LMS",
      items: ["명함", "명찰"],
      sentByName: "운영",
    });

    expect(mocks.callDataService).toHaveBeenCalledWith(
      "shared-domain/notification-user-context",
      { userId: "user-1" },
    );
    const sent = mocks.postMessage.mock.calls[0][0];
    expect(sent.channelId).toBe("C_MEMBER");
    expect(sent.text).toBe("📨 시안 완료·확정 요청 안내 발송 · 문자(LMS)");
    const blocks = JSON.stringify(sent.blocks);
    expect(blocks).toContain("홍길동");
    expect(blocks).toContain("명함, 명찰");
    expect(blocks).toContain("운영");
  });

  it("labels an alimtalk send and carries the fallback note", async () => {
    await logOutboundNotice({
      userId: "user-1",
      notice: "발주 완료 안내",
      channel: "알림톡",
      note: "알림톡 실패 시 문자로 대체",
    });

    const sent = mocks.postMessage.mock.calls[0][0];
    expect(sent.text).toBe("📨 발주 완료 안내 발송 · 알림톡");
    expect(JSON.stringify(sent.blocks)).toContain("알림톡 실패 시 문자로 대체");
  });

  it("skips members without a Slack channel and never throws", async () => {
    mocks.callDataService.mockResolvedValueOnce({
      id: "user-1",
      이름: "홍길동",
      연락처: "",
      email: "",
      slackChannelId: null,
    });
    await logOutboundNotice({
      userId: "user-1",
      notice: "배송 시작 안내",
      channel: "SMS",
    });
    expect(mocks.postMessage).not.toHaveBeenCalled();

    mocks.callDataService.mockRejectedValueOnce(new Error("data service down"));
    await expect(
      logOutboundNotice({
        userId: "user-1",
        notice: "배송 시작 안내",
        channel: "SMS",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("smsTypeFor", () => {
  it("uses SMS up to 90 bytes and LMS beyond", () => {
    expect(smsTypeFor("짧은 안내")).toBe("SMS");
    expect(
      smsTypeFor(
        "[스타트패키지]\n\n디자인 시안이 업로드되었습니다.\n확인 부탁드립니다.",
      ),
    ).toBe("LMS");
  });
});
