import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendSMS: vi.fn(),
  clientSendSMS: vi.fn(),
  isAlimtalkConfigured: vi.fn(),
  requestAlimtalk: vi.fn(),
  getAlimtalkResult: vi.fn(),
}));

vi.mock("@/lib/sms/ncpSensClient", () => ({
  sendSMS: mocks.sendSMS,
  getSMSClient: () => ({ sendSMS: mocks.clientSendSMS }),
  smsTypeFor: (content: string) => (content.length <= 20 ? "SMS" : "LMS"),
}));
vi.mock("@/lib/sms/ncpAlimtalkClient", () => ({
  isAlimtalkConfigured: mocks.isAlimtalkConfigured,
  requestAlimtalk: mocks.requestAlimtalk,
  getAlimtalkResult: mocks.getAlimtalkResult,
}));

import { resolveNoticeOutcome, sendMemberNotice } from "./memberNotice";

const template = { templateCode: "spDesignReady01", content: "알림톡 본문" };
const sms = {
  content: "디자인 시안이 업로드되었습니다. 확인 부탁드립니다.",
  from: "01066246615",
};
const noSleep = async () => undefined;

describe("sendMemberNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAlimtalkConfigured.mockReturnValue(true);
  });

  it("requests the alimtalk first and sends no SMS itself when it is accepted", async () => {
    mocks.requestAlimtalk.mockResolvedValue({
      accepted: true,
      messageId: "m-1",
    });

    const sent = await sendMemberNotice({
      to: "01012345678",
      alimtalk: template,
      sms,
    });

    expect(sent).toMatchObject({
      via: "alimtalk",
      messageId: "m-1",
      smsChannel: "LMS",
    });
    expect(mocks.requestAlimtalk).toHaveBeenCalledWith({
      to: "01012345678",
      message: template,
      failover: { content: sms.content, from: "01066246615" },
    });
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("sends the SMS right away when the alimtalk request is rejected", async () => {
    mocks.requestAlimtalk.mockResolvedValue({
      accepted: false,
      reason: "Invalid templateCode",
    });

    const sent = await sendMemberNotice({
      to: "01012345678",
      alimtalk: template,
      sms,
    });

    expect(mocks.sendSMS).toHaveBeenCalledWith("01012345678", sms.content, {
      from: "01066246615",
    });
    expect(sent).toEqual({
      via: "sms",
      channel: "LMS",
      note: "알림톡 요청 거절(Invalid templateCode)로 문자 발송",
    });
  });

  it("keeps sending plain SMS when alimtalk is not configured or the notice has no template", async () => {
    mocks.isAlimtalkConfigured.mockReturnValue(false);
    expect(
      await sendMemberNotice({ to: "01012345678", alimtalk: template, sms }),
    ).toEqual({ via: "sms", channel: "LMS" });

    mocks.isAlimtalkConfigured.mockReturnValue(true);
    expect(
      await sendMemberNotice({
        to: "01012345678",
        alimtalk: null,
        sms: { content: "짧은 안내" },
      }),
    ).toEqual({ via: "sms", channel: "SMS" });

    expect(mocks.requestAlimtalk).not.toHaveBeenCalled();
    expect(mocks.sendSMS).toHaveBeenCalledTimes(2);
  });

  it("does not send an SMS when the alimtalk request outcome is unknown", async () => {
    mocks.requestAlimtalk.mockRejectedValue(new Error("timeout"));

    await expect(
      sendMemberNotice({ to: "01012345678", alimtalk: template, sms }),
    ).rejects.toThrow("timeout");
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("uses the LMS client when the notice must go out as LMS", async () => {
    await sendMemberNotice({
      to: "01012345678",
      alimtalk: null,
      sms: { content: "짧은 안내", forceLms: true },
    });

    expect(mocks.clientSendSMS).toHaveBeenCalledWith(
      "01012345678",
      "짧은 안내",
      "LMS",
      undefined,
    );
  });
});

describe("resolveNoticeOutcome", () => {
  const accepted = {
    via: "alimtalk" as const,
    messageId: "m-1",
    smsChannel: "LMS" as const,
    requestedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports an alimtalk that arrived", async () => {
    mocks.getAlimtalkResult.mockResolvedValue({ state: "delivered" });
    expect(await resolveNoticeOutcome(accepted, { sleep: noSleep })).toEqual({
      channel: "알림톡",
    });
  });

  it("reports the SMS that SENS sent in place of a failed alimtalk", async () => {
    mocks.getAlimtalkResult.mockResolvedValue({
      state: "failover",
      description: "템플릿을 찾을 수 없음",
    });
    expect(await resolveNoticeOutcome(accepted, { sleep: noSleep })).toEqual({
      channel: "LMS",
      note: "알림톡 실패(템플릿을 찾을 수 없음)로 문자 대체 발송",
    });
  });

  it("looks once more when the result is not ready, then records it as unconfirmed", async () => {
    mocks.getAlimtalkResult.mockResolvedValue({ state: "pending" });

    expect(await resolveNoticeOutcome(accepted, { sleep: noSleep })).toEqual({
      channel: "알림톡",
      note: "결과 확인 전, 실패하면 문자로 대체 발송",
    });
    expect(mocks.getAlimtalkResult).toHaveBeenCalledTimes(2);
  });

  it("passes a direct SMS through with its note", async () => {
    expect(
      await resolveNoticeOutcome({
        via: "sms",
        channel: "SMS",
        note: "알림톡 요청 거절(x)로 문자 발송",
      }),
    ).toEqual({
      channel: "SMS",
      note: "알림톡 요청 거절(x)로 문자 발송",
    });
    expect(mocks.getAlimtalkResult).not.toHaveBeenCalled();
  });
});
