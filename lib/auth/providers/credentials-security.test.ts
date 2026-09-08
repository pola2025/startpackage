import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authenticateUser,
  authenticateAdmin,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure,
  clearLoginFailures,
  reserveLoginAttempt,
} = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  authenticateAdmin: vi.fn(),
  getLoginRateLimitKey: vi.fn(() => "local-key"),
  isLoginRateLimited: vi.fn(() => false),
  recordLoginFailure: vi.fn(),
  clearLoginFailures: vi.fn(),
  reserveLoginAttempt: vi.fn(),
}));

vi.mock("../services/user-auth.service", () => ({ authenticateUser }));
vi.mock("../services/admin-auth.service", () => ({ authenticateAdmin }));
vi.mock("../login-rate-limit", () => ({
  clearLoginFailures,
  getLoginRateLimitKey,
  isLoginRateLimited,
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
    isLoginRateLimited.mockReturnValue(false);
  });

  it("does not look up credentials when the distributed budget is blocked", async () => {
    reserveLoginAttempt.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request)).resolves.toBeNull();
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(recordLoginFailure).not.toHaveBeenCalled();
  });

  it("records one local failure after a failed lookup", async () => {
    authenticateUser.mockResolvedValue(null);
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "bad" }, request)).resolves.toBeNull();
    expect(reserveLoginAttempt).toHaveBeenCalledTimes(1);
    expect(authenticateUser).toHaveBeenCalledTimes(1);
    expect(recordLoginFailure).toHaveBeenCalledTimes(1);
  });

  it("clears only the local bucket after valid credentials", async () => {
    authenticateUser.mockResolvedValue({ id: "user-1", email: "member@example.com", name: "Member", role: "user", userType: "user" });
    await expect(userAuthorize({ emailOrPhone: "member@example.com", password: "good" }, request)).resolves.toMatchObject({ id: "user-1" });
    expect(clearLoginFailures).toHaveBeenCalledTimes(1);
    expect(recordLoginFailure).not.toHaveBeenCalled();
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
