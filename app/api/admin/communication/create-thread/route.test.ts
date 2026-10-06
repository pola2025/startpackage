import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  notifyUser: vi.fn(),
  sendEmail: vi.fn(),
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
vi.mock("@/lib/email/resendClient", () => ({
  sendEmail: mocks.sendEmail,
  getAdminMessageEmailHTML: () => "<p>안내</p>",
}));

import { POST } from "./route";

const userId = "0f8fad5b-d9cb-469f-a165-70867728950e";

function create() {
  return POST(
    new Request("https://example.test/api/admin/communication/create-thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title: "추가 자료 요청",
        category: "제작",
        content: "로고 원본 파일을 보내주세요.",
      }),
    }),
  );
}

describe("POST /api/admin/communication/create-thread with D1 runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue(true);
  });

  it("notifies the member in real time and by email after the thread is saved", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      thread: { id: "thread-1" },
      message: { id: "message-1" },
      targetUser: { id: userId, name: "홍길동", email: "member@test.invalid" },
    });

    const response = await create();

    expect(response.status).toBe(200);
    expect(mocks.notifyUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        type: "new_message",
        data: expect.objectContaining({ threadId: "thread-1" }),
      }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@test.invalid",
        subject: "[스타트패키지] 새로운 메시지: 추가 자료 요청",
      }),
    );
  });

  it("skips the email when the member has no address", async () => {
    mocks.callDataService.mockResolvedValue({
      success: true,
      thread: { id: "thread-1" },
      message: { id: "message-1" },
      targetUser: { id: userId, name: "홍길동", email: null },
    });

    const response = await create();

    expect(response.status).toBe(200);
    expect(mocks.notifyUser).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
