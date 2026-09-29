import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authenticateUser,
  authenticateAdmin,
  getLoginRateLimitKey,
  getLoginRetryAfterSeconds,
  isLocallyRateLimited,
  recordLoginFailure,
  clearLoginFailures,
  reserveLoginAttempt,
  clearDistributedLoginAttempts,
} = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  authenticateAdmin: vi.fn(),
  getLoginRateLimitKey: vi.fn(() => "local-key"),
  getLoginRetryAfterSeconds: vi.fn(() => 600),
  isLocallyRateLimited: vi.fn(() => false),
  recordLoginFailure: vi.fn(() => 1),
  clearLoginFailures: vi.fn(),
  reserveLoginAttempt: vi.fn(),
  clearDistributedLoginAttempts: vi.fn(async () => undefined),
}));

vi.mock("../services/user-auth.service", () => ({ authenticateUser }));
vi.mock("../services/admin-auth.service", () => ({ authenticateAdmin }));
// next-auth 루트는 next/server를 불러와 vitest에서 해석되지 않는다. 실제와 같은 에러 클래스만 노출한다.
vi.mock("next-auth", async () => ({
  CredentialsSignin: (await import("@auth/core/errors")).CredentialsSignin,
}));
vi.mock("../login-rate-limit", () => ({
  clearDistributedLoginAttempts,
  clearLoginFailures,
  getLoginRateLimitKey,
  getLoginRetryAfterSeconds,
  isLocallyRateLimited,
  recordLoginFailure,
  reserveLoginAttempt,
}));

import { adminCredentialsProvider } from "./admin-credentials";
import { userCredentialsProvider } from "./user-credentials";

type Authorize = (credentials: Record<string, unknown>, request: Request) => Promise<unknown>;
const userAuthorize = (userCredentialsProvider as unknown as { options: { authorize: Authorize } }).options.authorize;
const adminAuthorize = (adminCredentialsProvider as unknown as { options: { authorize: Authorize } }).options.authorize;
const request = new Request("https://example.test");

describe("credentials provider security contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reserveLoginAttempt.mockResolvedValue({ allowed: true });
    isLocallyRateLimited.mockReturnValue(false);
    recordLoginFailure.mockReturnValue(1);
  });

  it("does not look up credentials when the distributed budget is blocked", async () => {
    reserveLoginAttempt.mockResolvedValue({ allowed: false, retryAfterSeconds: 60, blockedBy: "ip" });
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request))
      .rejects.toMatchObject({ type: "CredentialsSignin", code: "blocked_ip_60" });
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(recordLoginFailure).not.toHaveBeenCalled();
  });

  it("reports the local block without reserving another distributed attempt", async () => {
    isLocallyRateLimited.mockReturnValue(true);
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request))
      .rejects.toMatchObject({ type: "CredentialsSignin", code: "blocked_account_600" });
    expect(reserveLoginAttempt).not.toHaveBeenCalled();
    expect(authenticateUser).not.toHaveBeenCalled();
  });

  it("records one local failure after a failed lookup and reports the attempt count", async () => {
    authenticateUser.mockResolvedValue(null);
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request))
      .rejects.toMatchObject({ type: "CredentialsSignin", code: "invalid_1" });
    expect(reserveLoginAttempt).toHaveBeenCalledTimes(1);
    expect(authenticateUser).toHaveBeenCalledTimes(1);
    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
  });

  it("prefers the distributed attempt count so admin releases and resets are reflected", async () => {
    authenticateUser.mockResolvedValue(null);
    reserveLoginAttempt.mockResolvedValue({ allowed: true, accountAttempts: 1 });
    recordLoginFailure.mockReturnValue(4);
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request))
      .rejects.toMatchObject({ code: "invalid_1" });
  });

  it("falls back to the local count without a distributed limiter", async () => {
    authenticateUser.mockResolvedValue(null);
    recordLoginFailure.mockReturnValue(2);
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request))
      .rejects.toMatchObject({ code: "invalid_2" });
  });

  it("clears the local bucket and the distributed account attempts after valid credentials", async () => {
    authenticateUser.mockResolvedValue({ id: "user-1", email: "member@example.com", name: "Member", role: "user", userType: "user" });
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "good" }, request)).resolves.toMatchObject({ id: "user-1" });
    expect(clearLoginFailures).toHaveBeenCalledTimes(1);
    expect(clearDistributedLoginAttempts).toHaveBeenCalledWith("member@example.com");
    expect(recordLoginFailure).not.toHaveBeenCalled();
  });

  it("does not reset distributed attempts after a failed login", async () => {
    authenticateUser.mockResolvedValue(null);
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request)).rejects.toBeDefined();
    expect(clearDistributedLoginAttempts).not.toHaveBeenCalled();
  });

  it("records a single failure when administrator 2FA is not configured", async () => {
    authenticateAdmin.mockResolvedValue({ error: "2FA_NOT_SETUP" });
    await expect(adminAuthorize({ email: "admin@example.com", totpCode: "000000" }, request)).rejects.toThrow("2FA_NOT_SETUP");
    expect(reserveLoginAttempt).toHaveBeenCalledTimes(1);
    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the distributed limiter is unavailable", async () => {
    reserveLoginAttempt.mockRejectedValue(new Error("limiter unavailable"));
    await expect(adminAuthorize({ email: "admin@example.com", totpCode: "000000" }, request)).rejects.toThrow("limiter unavailable");
    expect(authenticateAdmin).not.toHaveBeenCalled();
  });

  it("rejects non-string credential input before normalization", async () => {
    await expect(userAuthorize({ emailOrPhone: 123, password: "bad" }, request)).resolves.toBeNull();
    expect(getLoginRateLimitKey).not.toHaveBeenCalled();
  });
});
