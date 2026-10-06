import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  notifyUser: vi.fn(),
  sendTelegramMessage: vi.fn(),
  sendInquiryTelegramMessage: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: async () => ({
    user: { id: "admin-1", role: "operator", name: "운영" },
  }),
}));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => {
  class DataServiceRequestError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return { callDataService: mocks.callDataService, DataServiceRequestError };
});
vi.mock("@/lib/notifications/notification-manager", () => ({
  notificationManager: { notifyUser: mocks.notifyUser },
}));
vi.mock("@/lib/notification/telegramClient", () => ({
  sendTelegramMessage: mocks.sendTelegramMessage,
  sendInquiryTelegramMessage: mocks.sendInquiryTelegramMessage,
}));
vi.mock("@/lib/notification/slackClient", () => ({
  postMessage: mocks.postMessage,
}));

import { POST } from "./route";

function reply() {
  return POST(
    new Request("https://example.test/api/admin/communication/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: "thread-1",
        content: "수정해서 다시 올렸습니다.",
      }),
    }),
  );
}

describe("POST /api/admin/communication/reply with D1 runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_QNA_CHANNEL_ID = "C_TEST_QNA";
  });

  it("notifies the member and the operations channels after the reply is saved", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      message: { id: "message-1" },
      notify: {
        userId: "user-1",
        title: "시안 문의",
        userName: "홍길동",
        telegramChatId: "tg-1",
      },
    });

    const response = await reply();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: { id: "message-1" },
    });
    expect(mocks.notifyUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        type: "new_message",
        data: expect.objectContaining({ threadId: "thread-1" }),
      }),
    );
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining("시안 문의"),
      "tg-1",
    );
    expect(mocks.sendInquiryTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining("[ID: thread-1]"),
    );
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "C_TEST_QNA",
        text: "📤 [관리자] → [홍길동] 답변",
      }),
    );
  });

  it("skips the member Telegram message when the member has not linked Telegram", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      message: { id: "message-1" },
      notify: {
        userId: "user-1",
        title: "시안 문의",
        userName: "홍길동",
        telegramChatId: null,
      },
    });

    await reply();

    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
    expect(mocks.notifyUser).toHaveBeenCalledTimes(1);
  });

  it("saves the reply without notifying when the data service returns no notify context", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      message: { id: "message-1" },
    });

    const response = await reply();

    expect(response.status).toBe(200);
    expect(mocks.notifyUser).not.toHaveBeenCalled();
    expect(mocks.postMessage).not.toHaveBeenCalled();
  });
});
