import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // 라우트가 모듈 로드 시점에 시크릿을 읽으므로 import 보다 먼저 넣는다.
  process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-reply-test-secret";
  return {
    callDataService: vi.fn(),
    notifyUser: vi.fn(),
    postMessage: vi.fn(),
    fetch: vi.fn(),
  };
});

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
vi.mock("@/lib/notification/slackClient", () => ({
  postMessage: mocks.postMessage,
}));

import { POST } from "./route";

function reply(secret = "telegram-reply-test-secret") {
  return POST(
    new Request("https://example.test/api/admin/communication/telegram-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Secret": secret },
      body: JSON.stringify({
        threadId: "thread-1",
        content: "내일 오전에 전달드리겠습니다.",
      }),
    }),
  );
}

describe("POST /api/admin/communication/telegram-reply with D1 runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_QNA_CHANNEL_ID = "C_TEST_QNA";
    process.env.TELEGRAM_INQUIRY_BOT_TOKEN = "test-bot-token";
    mocks.fetch.mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("notifies the member and records the reply in Slack after saving", async () => {
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
      expect.objectContaining({ type: "new_message" }),
    );
    const [url, init] = mocks.fetch.mock.calls[0] as [string, { body: string }];
    expect(url).toContain("api.telegram.org");
    expect(JSON.parse(init.body)).toMatchObject({ chat_id: "tg-1" });
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "C_TEST_QNA",
        text: "📤 [관리자] → [홍길동] 답변 (텔레그램)",
      }),
    );
  });

  it("rejects a wrong secret before touching the data service", async () => {
    const response = await reply("wrong-secret");

    expect(response.status).toBe(401);
    expect(mocks.callDataService).not.toHaveBeenCalled();
    expect(mocks.notifyUser).not.toHaveBeenCalled();
  });
});
