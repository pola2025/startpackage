import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendInquiryTelegramMessage: vi.fn(),
  postMessage: vi.fn(),
  loadCommunicationOriginals: vi.fn(),
  sendCommunicationOriginals: vi.fn(),
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
vi.mock("@/lib/storage/communicationOriginal", () => ({
  loadCommunicationOriginals: mocks.loadCommunicationOriginals,
  sendCommunicationOriginals: mocks.sendCommunicationOriginals,
}));

import { POST } from "./route";

const pdfUrl =
  "https://files.example.test/communication/user-1/1759700000000-%EC%82%AC%EC%97%85%EC%9E%90%EB%93%B1%EB%A1%9D%EC%A6%9D.pdf";

function reply(attachments?: string[]) {
  return POST(
    new Request("https://example.test/api/communication/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: "thread-1",
        content: "사업자등록증을 다시 보냅니다.",
        attachments,
      }),
    }),
  );
}

describe("POST /api/communication/messages with D1 runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_QNA_CHANNEL_ID = "C_TEST_QNA";
    mocks.loadCommunicationOriginals.mockResolvedValue([]);
    mocks.sendCommunicationOriginals.mockResolvedValue(0);
    mocks.callDataService.mockResolvedValue({
      success: true,
      message: { id: "message-1" },
      notify: { title: "추가 자료 전달" },
    });
  });

  it("notifies Telegram and Slack with the thread title and hides notify from the response", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      message: { id: "message-1" },
      notify: { title: "추가 자료 전달" },
    });

    const response = await reply([pdfUrl]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: { id: "message-1" },
    });
    const telegram = mocks.sendInquiryTelegramMessage.mock
      .calls[0][0] as string;
    expect(telegram).toContain("[ID: thread-1]");
    expect(telegram).toContain("27기 홍길동");
    expect(telegram).toContain("추가 자료 전달");
    expect(telegram).toContain("사업자등록증을 다시 보냅니다.");
    expect(telegram).toContain(`<a href="${pdfUrl}">사업자등록증.pdf</a>`);
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "C_TEST_QNA",
        text: "💬 [27기 홍길동] 추가 메시지",
      }),
    );
    expect(JSON.stringify(mocks.postMessage.mock.calls[0][0].blocks)).toContain(
      `<${pdfUrl}|사업자등록증.pdf>`,
    );
  });

  it("sends image originals to Slack instead of the webp link", async () => {
    const imageUrl =
      "https://files.example.test/communication/user-1/communication_1.webp";
    const original = {
      url: imageUrl,
      key: "communication/user-1/_original/communication_1",
      buffer: Buffer.from("original"),
      extension: "jpg",
    };
    mocks.loadCommunicationOriginals.mockResolvedValue([original]);

    await reply([pdfUrl, imageUrl]);

    expect(mocks.loadCommunicationOriginals).toHaveBeenCalledWith("user-1", [
      pdfUrl,
      imageUrl,
    ]);
    const slack = JSON.stringify(mocks.postMessage.mock.calls[0][0].blocks);
    expect(slack).toContain(`<${pdfUrl}|사업자등록증.pdf>`);
    expect(slack).not.toContain(imageUrl);
    expect(mocks.sendCommunicationOriginals).toHaveBeenCalledWith({
      channelId: "C_TEST_QNA",
      originals: [original],
      sender: "27기 홍길동",
    });
    // 화면과 텔레그램은 지금처럼 웹 표시용 주소를 쓴다.
    expect(mocks.sendInquiryTelegramMessage.mock.calls[0][0]).toContain(imageUrl);
  });

  it("still notifies when the data service has not been updated to return notify", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      message: { id: "message-1" },
    });

    const response = await reply();

    expect(response.status).toBe(200);
    expect(mocks.sendInquiryTelegramMessage).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledTimes(1);
  });
});
