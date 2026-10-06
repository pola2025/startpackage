import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendSMS: vi.fn(),
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
  sendSMS: mocks.sendSMS,
  getSenderPhoneByAdmin: () => undefined,
  smsTypeFor: () => "LMS",
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
  });

  it("records the sent notice in the member's Slack channel after the SMS goes out", async () => {
    const response = await send();

    expect(response.status).toBe(200);
    expect(mocks.sendSMS).toHaveBeenCalledWith(
      "01012345678",
      expect.stringContaining("디자인 시안이 업로드되었습니다."),
      undefined,
    );
    expect(mocks.logOutboundNotice).toHaveBeenCalledWith({
      userId: "user-1",
      notice: "시안 완료·확정 요청 안내",
      channel: "LMS",
      items: ["명함"],
      sentByName: "디자이너",
    });
  });

  it("records nothing when the SMS fails", async () => {
    mocks.sendSMS.mockRejectedValueOnce(new Error("SENS down"));

    const response = await send();

    expect(response.status).toBe(500);
    expect(mocks.logOutboundNotice).not.toHaveBeenCalled();
  });
});
