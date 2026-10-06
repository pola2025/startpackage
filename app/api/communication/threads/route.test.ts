import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendInquiryTelegramMessage: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: async () => ({
    user: { id: "user-1", name: "홍길동", cohortName: "27기" },
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
vi.mock("@/lib/notification/telegramClient", () => ({
  sendInquiryTelegramMessage: mocks.sendInquiryTelegramMessage,
}));
vi.mock("@/lib/notification/slackClient", () => ({
  postMessage: mocks.postMessage,
}));

import { POST } from "./route";

const pdfUrl =
  "https://files.example.test/communication/user-1/1759700000000-%EC%82%AC%EC%97%85%EC%9E%90%EB%93%B1%EB%A1%9D%EC%A6%9D.pdf";

function create(
  body: Record<string, unknown> = {
    title: "시안 문의",
    category: "디자인",
    content: "색상을 바꾸고 싶습니다.",
  },
) {
  return POST(
    new Request("https://example.test/api/communication/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/communication/threads with D1 runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_QNA_CHANNEL_ID = "C_TEST_QNA";
    mocks.callDataService.mockResolvedValue({
      success: true,
      thread: { id: "thread-1" },
      messages: [],
    });
  });

  it("notifies Telegram and Slack with the cohort after the thread is saved", async () => {
    const response = await create();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      thread: { id: "thread-1" },
      messages: [],
    });
    expect(mocks.callDataService).toHaveBeenCalledWith(
      "communication-domain/user-create-thread",
      expect.objectContaining({
        userId: "user-1",
        title: "시안 문의",
        category: "디자인",
      }),
    );
    const telegram = mocks.sendInquiryTelegramMessage.mock
      .calls[0][0] as string;
    expect(telegram).toContain("[ID: thread-1]");
    expect(telegram).toContain("27기 홍길동");
    expect(telegram).toContain("디자인");
    expect(telegram).toContain("색상을 바꾸고 싶습니다.");
    expect(telegram).not.toContain("첨부");
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "C_TEST_QNA",
        text: "🔔 [27기 홍길동] 새 문의",
      }),
    );
  });

  it("adds attachment links to both channels and drops unsafe ones", async () => {
    await create({
      title: "추가 자료 전달",
      category: "추가자료",
      content: "새 사업자등록증입니다.",
      attachments: [pdfUrl, "javascript:alert(1)"],
    });

    const telegram = mocks.sendInquiryTelegramMessage.mock
      .calls[0][0] as string;
    expect(telegram).toContain(`<a href="${pdfUrl}">사업자등록증.pdf</a>`);
    expect(telegram).not.toContain("javascript:");
    const slack = JSON.stringify(mocks.postMessage.mock.calls[0][0].blocks);
    expect(slack).toContain(`<${pdfUrl}|사업자등록증.pdf>`);
    expect(slack).not.toContain("javascript:");
  });

  it("keeps the inquiry when a notification channel fails", async () => {
    mocks.sendInquiryTelegramMessage.mockRejectedValueOnce(
      new Error("telegram down"),
    );

    const response = await create();

    expect(response.status).toBe(200);
    expect(mocks.postMessage).toHaveBeenCalledTimes(1);
  });

  it("sends no notification when the thread was not saved", async () => {
    const { DataServiceRequestError } = await import("@/lib/d1/service-client");
    mocks.callDataService.mockRejectedValueOnce(
      new DataServiceRequestError(400, "Data service request failed (400)"),
    );

    const response = await create({ title: "", content: "" });

    expect(response.status).toBe(400);
    expect(mocks.sendInquiryTelegramMessage).not.toHaveBeenCalled();
    expect(mocks.postMessage).not.toHaveBeenCalled();
  });
});
