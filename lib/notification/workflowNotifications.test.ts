import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleStateChange: vi.fn(),
  handleOrderRequest: vi.fn(),
  sendTelegramMessage: vi.fn(),
  notifyAdmin: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("./notificationService", () => ({
  handleStateChange: mocks.handleStateChange,
  handleOrderRequest: mocks.handleOrderRequest,
}));
vi.mock("./telegramClient", () => ({
  sendTelegramMessage: mocks.sendTelegramMessage,
  notifyAdmin: mocks.notifyAdmin,
}));
vi.mock("./slackClient", () => ({ postMessage: mocks.postMessage }));

import {
  notifyWorkflowApproval,
  notifyWorkflowFeedback,
  notifyWorkflowOrder,
} from "./workflowNotifications";

describe("workflow notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the order notifications and sends the aggregate message once", async () => {
    await notifyWorkflowOrder({
      userId: "user-1",
      workflowType: "명함",
      userName: "홍길동",
      cohortName: "1기",
      allOrdersRequested: true,
    });

    expect(mocks.handleStateChange).toHaveBeenCalledOnce();
    expect(mocks.handleOrderRequest).toHaveBeenCalledOnce();
    expect(mocks.sendTelegramMessage).toHaveBeenCalledOnce();
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith(
      "🎉 *전체 발주 요청 완료*\n\n*1기 홍길동* 님의 모든 디자인 시안 발주 요청이 접수되었습니다.\n\n관리자 승인을 기다리고 있습니다.",
    );
  });

  it("preserves approval context in Slack and Telegram", async () => {
    await notifyWorkflowApproval({
      userId: "user-1",
      workflowType: "로고",
      userName: "홍길동",
      cohortName: "1기",
      brandName: "폴라애드",
      slackChannelId: "C123",
      previousStatus: "시안컨펌요청",
      confirmedAt: new Date("2026-09-08T00:00:00.000Z"),
    });

    expect(mocks.postMessage).toHaveBeenCalledOnce();
    const slack = mocks.postMessage.mock.calls[0][0] as { text: string; blocks: Array<{ type: string; fields?: Array<{ text: string }>; elements?: Array<{ text: string }> }> };
    expect(slack.text).toBe("✅ 로고 최종 확정");
    expect(slack.blocks[1].fields?.map((field) => field.text)).toEqual([
      "*항목:*\n로고",
      "*이전 상태:*\n시안컨펌요청",
      "*현재 상태:*\n최종확정",
      "*확정자:*\n홍길동",
    ]);
    expect(mocks.notifyAdmin).toHaveBeenCalledWith({
      title: "✅ 로고 확정",
      message: "1기_홍길동_폴라애드 님이 로고 시안을 확정했습니다.",
      details: {
        "기수": "1기",
        "이름": "홍길동",
        "브랜드명": "폴라애드",
        "항목": "로고",
        "이전 상태": "시안컨펌요청",
        "현재 상태": "최종확정",
      },
    });
  });

  it("includes cohort and time context for feedback notifications", async () => {
    await notifyWorkflowFeedback({
      userId: "user-1",
      workflowType: "명함",
      userName: "홍길동",
      cohortName: "1기",
      slackChannelId: "C123",
      feedback: "수정 부탁드립니다.",
    });

    expect(mocks.sendTelegramMessage).toHaveBeenCalledOnce();
    expect(mocks.sendTelegramMessage.mock.calls[0][0]).toMatch(
      /\*사용자:\* 홍길동 \(1기\)[\s\S]*\*시간:\* /,
    );
    expect(mocks.postMessage).toHaveBeenCalledOnce();
    const slack = mocks.postMessage.mock.calls[0][0] as { blocks: Array<{ elements?: Array<{ text: string }> }> };
    expect(slack.blocks[1].elements?.[0].text).toMatch(/^📅 /);
  });
});
