import { describe, expect, it, vi } from "vitest";
import {
  clearLoginFailures,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure,
  reserveLoginAttempt,
} from "./login-rate-limit";
import { callDataService } from "../d1/service-client";

vi.mock("../d1/service-client", () => ({ callDataService: vi.fn() }));

process.env.AUTH_TRUSTED_IP_HEADER = "x-forwarded-for";

describe("login rate limit", () => {
  it("blocks the sixth failure within the window and clears on success", () => {
    const key = getLoginRateLimitKey("member@example.com", new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    }));

    for (let index = 0; index < 5; index += 1) {
      recordLoginFailure(key, 1_000 + index);
    }
    expect(isLoginRateLimited(key, 2_000)).toBe(true);

    clearLoginFailures(key);
    expect(isLoginRateLimited(key, 2_000)).toBe(false);
  });

  it("separates identifiers and client addresses", () => {
    const sameAddress = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const otherAddress = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    });

    expect(getLoginRateLimitKey("a@example.com", sameAddress)).not.toBe(
      getLoginRateLimitKey("b@example.com", sameAddress),
    );
    expect(getLoginRateLimitKey("a@example.com", sameAddress)).not.toBe(
      getLoginRateLimitKey("a@example.com", otherAddress),
    );
  });

  it("reserves account and IP budgets before credential verification", async () => {
    process.env.D1_DATA_SERVICE_URL = "https://data.example.test";
    process.env.D1_DATA_SERVICE_TOKEN = "x".repeat(32);
    vi.mocked(callDataService).mockResolvedValue({ allowed: true, failures: 1 });

    await expect(reserveLoginAttempt("member@example.com", new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    }))).resolves.toEqual({ allowed: true });
    expect(callDataService).toHaveBeenCalledTimes(2);
    expect(vi.mocked(callDataService).mock.calls.map(([operation, input]) => ({ operation, kind: (input as { kind: string }).kind }))).toEqual([
      { operation: "auth/consume-attempts", kind: "account" },
      { operation: "auth/consume-attempts", kind: "ip" },
    ]);

    delete process.env.D1_DATA_SERVICE_URL;
    delete process.env.D1_DATA_SERVICE_TOKEN;
    vi.mocked(callDataService).mockReset();
  });
});
