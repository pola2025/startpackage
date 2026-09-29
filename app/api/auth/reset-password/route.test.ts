import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  d1Enabled: { value: true },
  callDataService: vi.fn(),
  sendSMS: vi.fn(),
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn() },
    notification: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mocks.prisma }));
vi.mock("@/lib/notification/telegramClient", () => ({ notifyAdmin: vi.fn() }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => mocks.d1Enabled.value }));
vi.mock("@/lib/sms/ncpSensClient", () => ({ sendSMS: mocks.sendSMS }));
vi.mock("@/lib/d1/service-client", () => {
  class DataServiceRequestError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  }
  return { callDataService: mocks.callDataService, DataServiceRequestError };
});

import { POST } from "./route";
import { DataServiceRequestError } from "@/lib/d1/service-client";

let ipSeq = 0;
function resetRequest(phone = "01012345678") {
  ipSeq += 1;
  return new NextRequest("https://example.test/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${ipSeq}` },
    body: JSON.stringify({ 연락처: phone }),
  });
}

describe("POST /api/auth/reset-password cooldown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.d1Enabled.value = true;
  });

  it("returns a 3-minute cooldown when D1 rejects a repeated request", async () => {
    mocks.callDataService.mockRejectedValue(new DataServiceRequestError(429, "Data service request failed (429)"));
    const response = await POST(resetRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("180");
    await expect(response.json()).resolves.toMatchObject({ retryAfterSeconds: 180, error: expect.stringContaining("3분에 1번") });
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("returns the remaining cooldown from the last reset on the Prisma path", async () => {
    mocks.d1Enabled.value = false;
    mocks.prisma.user.findFirst.mockResolvedValue({ id: "user-1", 이름: "회원", 연락처: "01012345678", SMS수신동의: true });
    mocks.prisma.notification.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 60_000) });
    const response = await POST(resetRequest());
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(119);
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(120);
    expect(mocks.prisma.notification.findFirst.mock.calls[0][0].where.createdAt.gte.getTime())
      .toBeGreaterThanOrEqual(Date.now() - 3 * 60_000 - 1_000);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("sends the temporary password SMS even when SMS consent is off", async () => {
    mocks.d1Enabled.value = false;
    mocks.prisma.user.findFirst.mockResolvedValue({ id: "user-2", 이름: "회원", 연락처: "01012345678", SMS수신동의: false });
    mocks.prisma.notification.findFirst.mockResolvedValue(null);
    mocks.sendSMS.mockResolvedValue(undefined);
    const response = await POST(resetRequest());
    expect(response.status).toBe(200);
    expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1);
    expect(mocks.sendSMS).toHaveBeenCalledWith("01012345678", expect.stringContaining("임시 비밀번호"));
  });
});
