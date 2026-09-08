import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, callDataService, prisma, notifyAdmin, hash } = vi.hoisted(() => {
  const fail = vi.fn(() => { throw new Error("Prisma must not be called while D1 is enabled"); });
  const prisma = {
    admin: { findUnique: fail, create: fail, update: fail },
    adminRequest: { findUnique: fail, create: fail, update: fail },
    user: { findUnique: fail, update: fail },
    workflow: { findFirst: fail, update: fail, create: fail },
    adAutomationPayment: { create: fail },
    adAutomationHistory: { create: fail },
    $transaction: fail,
  };
  return { auth: vi.fn(), callDataService: vi.fn(), prisma, notifyAdmin: vi.fn(), hash: vi.fn() };
});

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ default: prisma, prisma }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService }));
vi.mock("@/lib/d1/route-errors", () => ({ dataServiceErrorResponse: () => null }));
vi.mock("@/lib/notification/telegramClient", () => ({ notifyAdmin }));
vi.mock("bcryptjs", () => ({ hash }));

import { POST as payment } from "./ad-automation/[userId]/payment/route";
import { POST as settings } from "./ad-automation/[userId]/settings/route";
import { POST as toggle } from "./ad-automation/[userId]/toggle/route";
import { POST as createAdmin } from "./admins/create/route";
import { POST as reset2fa } from "./admins/reset-2fa/route";
import { POST as register } from "./register/route";
import { POST as reviewRequest } from "./requests/route";

const params = (userId: string) => ({ params: Promise.resolve({ userId }) });
const req = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin-1", role: "super", name: "관리자", email: "admin@example.com" } });
  hash.mockResolvedValue("hashed-password");
  callDataService.mockResolvedValue({ id: "request-1", email: "new@example.com", payment: { id: "payment-1" }, serviceStartDate: 1735689600000, serviceEndDate: 1738368000000 });
});

describe("admin routes when D1 runtime is enabled", () => {
  it("routes ad automation payment, settings, and toggle through D1 only", async () => {
    const paymentResponse = await payment(req({ paymentDate: "2025-01-01T00:00:00.000Z", paymentAmount: 10000, paymentMethod: "카드" }) as never, params("user-1"));
    const settingsResponse = await settings(req({ adAutomationEnabled: true, smsSettingEnabled: false, naverAdSettingEnabled: false, homepageCompleted: false }) as never, params("user-1"));
    const toggleResponse = await toggle(req({ enabled: true }) as never, params("user-1"));
    expect(paymentResponse.status).toBe(200);
    expect(settingsResponse.status).toBe(200);
    expect(toggleResponse.status).toBe(200);
    expect(callDataService).toHaveBeenCalledTimes(3);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("routes admin creation and 2FA reset through D1 without Prisma preflights", async () => {
    const createResponse = await createAdmin(req({ email: "new@example.com", name: "새 관리자", role: "operator" }) as never);
    const resetResponse = await reset2fa(req({ adminId: "admin-2" }) as never);
    expect(createResponse.status).toBe(200);
    expect(resetResponse.status).toBe(200);
    expect(callDataService).toHaveBeenCalledWith("admin-domain/admin-create", expect.any(Object));
    expect(callDataService).toHaveBeenCalledWith("admin-domain/admin-reset-2fa", expect.any(Object));
    expect(prisma.admin.findUnique).not.toHaveBeenCalled();
  });

  it("routes registration and request review through D1 without Prisma access", async () => {
    const registerResponse = await register(req({ name: "새 관리자", email: "new@example.com", phone: "01012345678", password: "password123" }, { "x-forwarded-for": "198.51.100.10" }));
    const reviewResponse = await reviewRequest(req({ requestId: "request-1", action: "approve", assignedRole: "operator" }));
    expect(registerResponse.status).toBe(201);
    expect(reviewResponse.status).toBe(200);
    expect(callDataService).toHaveBeenCalledWith("admin-domain/admin-request-create", expect.any(Object));
    expect(callDataService).toHaveBeenCalledWith("admin-domain/admin-request-review", expect.any(Object));
    expect(prisma.admin.findUnique).not.toHaveBeenCalled();
    expect(prisma.adminRequest.findUnique).not.toHaveBeenCalled();
  });
});
