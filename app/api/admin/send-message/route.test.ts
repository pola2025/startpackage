import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendSMS: vi.fn(),
  sendEmailWithAttachments: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "admin-1", role: "operator", name: "운영", email: "op@test.invalid" } }) }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => {
  class DataServiceRequestError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  return { callDataService: mocks.callDataService, DataServiceRequestError };
});
vi.mock("@/lib/sms/ncpSensClient", () => ({ sendSMS: mocks.sendSMS, getSenderPhoneByAdmin: () => undefined }));
vi.mock("@/lib/email/emailClient", () => ({ sendEmailWithAttachments: mocks.sendEmailWithAttachments }));

import { POST } from "./route";

const userId = "cjld2cjxh0000qzrmn831i7rn";

function send(channel: "SMS" | "EMAIL") {
  return POST(new Request("https://example.test/api/admin/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, channel, title: "디자인 확인", message: "시안을 확인해주세요." }),
  }));
}

describe("POST /api/admin/send-message consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callDataService.mockImplementation(async (operation: string) => {
      if (operation === "admin-notifications/message-user") {
        return { id: userId, 이름: "회원", 연락처: "01012345678", email: "member@test.invalid", SMS수신동의: 0, 이메일수신동의: 0 };
      }
      if (operation === "admin-notifications/notification-create") return { id: "notification-1", sentAt: 1 };
      return { success: true };
    });
  });

  it("sends SMS even when the member has SMS consent off", async () => {
    const response = await send("SMS");
    expect(response.status).toBe(200);
    expect(mocks.sendSMS).toHaveBeenCalledWith("01012345678", expect.stringContaining("시안을 확인해주세요."), undefined);
  });

  it("still respects email consent", async () => {
    const response = await send("EMAIL");
    expect(response.status).toBe(400);
    expect(mocks.sendEmailWithAttachments).not.toHaveBeenCalled();
  });
});
