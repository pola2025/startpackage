import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendMemberNotice: vi.fn(),
  resolveNoticeOutcome: vi.fn(),
  logOutboundNotice: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: async () => ({
    user: {
      id: "admin-1",
      role: "designer",
      name: "디자이너",
      email: "designer@test.invalid",
    },
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
vi.mock("@/lib/sms/ncpSensClient", () => ({
  sendSMS: vi.fn(),
  getSenderPhoneByAdmin: () => undefined,
}));
vi.mock("@/lib/notification/memberNotice", () => ({
  sendMemberNotice: mocks.sendMemberNotice,
  resolveNoticeOutcome: mocks.resolveNoticeOutcome,
}));
vi.mock("@/lib/notification/notificationService", () => ({
  logOutboundNotice: mocks.logOutboundNotice,
}));

import { POST } from "./route";

function send() {
  return POST(
    new Request("https://example.test/api/admin/workflows/send-design-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId: "workflow-1" }),
    }) as never,
  );
}

describe("POST /api/admin/workflows/send-design-sms with D1 runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callDataService.mockImplementation(async (operation: string) => {
      if (operation === "admin-notifications/workflow-design-data") {
        return {
          workflow: {
            id: "workflow-1",
            userId: "user-1",
            type: "명함",
            시안URL: "https://files.example.test/design.jpg",
            이름: "홍길동",
            연락처: "01012345678",
          },
        };
      }
      return { id: "notification-1" };
    });
    mocks.sendMemberNotice.mockResolvedValue({
      via: "alimtalk",
      messageId: "m-1",
      smsChannel: "LMS",
      requestedAt: 0,
    });
    mocks.resolveNoticeOutcome.mockResolvedValue({
      channel: "LMS",
      note: "알림톡 실패(템플릿을 찾을 수 없음)로 문자 대체 발송",
    });
  });

  it("sends the alimtalk template with the existing SMS text as its fallback", async () => {
    const response = await send();

    expect(response.status).toBe(200);
    const input = mocks.sendMemberNotice.mock.calls[0][0];
    expect(input.to).toBe("01012345678");
    expect(input.alimtalk.templateCode).toBe("spDesignReady01");
    expect(input.alimtalk.content).toContain(
      "홍길동님, 명함 디자인 시안이 업로드되었습니다.",
    );
    expect(input.sms.content).toBe(
      "[스타트패키지]\n\n디자인 시안이 업로드되었습니다.\n확인 부탁드립니다.",
    );
  });

  it("records in Slack which route the notice actually took", async () => {
    await send();

    expect(mocks.logOutboundNotice).toHaveBeenCalledWith({
      userId: "user-1",
      notice: "시안 완료·확정 요청 안내",
      channel: "LMS",
      note: "알림톡 실패(템플릿을 찾을 수 없음)로 문자 대체 발송",
      items: ["명함"],
      sentByName: "디자이너",
    });
  });

  it("records nothing when the notice could not be sent", async () => {
    mocks.sendMemberNotice.mockRejectedValueOnce(new Error("SENS down"));

    const response = await send();

    expect(response.status).toBe(500);
    expect(mocks.logOutboundNotice).not.toHaveBeenCalled();
  });
});
