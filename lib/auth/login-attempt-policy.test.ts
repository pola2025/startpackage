import { describe, expect, it } from "vitest";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_RESET_REDIRECT_ATTEMPTS,
  describeLoginFailure,
  formatBlockedLoginCode,
  formatCooldown,
  formatInvalidLoginCode,
  parseLoginFailureCode,
} from "./login-attempt-policy";

describe("login attempt policy", () => {
  it("moves to password reset from the second failure and blocks at the fifth", () => {
    expect(LOGIN_RESET_REDIRECT_ATTEMPTS).toBe(2);
    expect(LOGIN_MAX_ATTEMPTS).toBe(5);
  });

  it("round-trips invalid and blocked codes", () => {
    expect(parseLoginFailureCode(formatInvalidLoginCode(2))).toEqual({ kind: "invalid", attempts: 2 });
    expect(parseLoginFailureCode(formatBlockedLoginCode("ip", 125))).toEqual({
      kind: "blocked",
      scope: "ip",
      retryAfterSeconds: 125,
    });
    expect(parseLoginFailureCode(formatBlockedLoginCode("account"))).toEqual({
      kind: "blocked",
      scope: "account",
      retryAfterSeconds: null,
    });
  });

  it("treats unknown or malformed codes as a generic failure", () => {
    for (const code of [undefined, "", "credentials", "invalid_0", "invalid_abc", "blocked_user_10"]) {
      expect(describeLoginFailure(parseLoginFailureCode(code))).toEqual({
        goToReset: false,
        message: "전화번호 또는 비밀번호가 일치하지 않습니다.",
      });
    }
  });

  it("warns on the first failure with the count and thresholds", () => {
    const view = describeLoginFailure({ kind: "invalid", attempts: 1 });
    expect(view.goToReset).toBe(false);
    expect(view.message).toContain("실패 1/5회");
    expect(view.message).toContain("2회 틀리면 비밀번호 재발급 화면으로 이동");
    expect(view.message).toContain("5회 틀리면 15분간 로그인이 차단");
  });

  it("sends the user to password reset with the remaining attempts", () => {
    const view = describeLoginFailure({ kind: "invalid", attempts: 2 });
    expect(view.goToReset).toBe(true);
    expect(view.message).toContain("2회 틀려 비밀번호 재발급 화면으로 이동");
    expect(view.message).toContain("남은 시도 3회");
  });

  it("explains the block and when it lifts", () => {
    expect(describeLoginFailure({ kind: "invalid", attempts: 5 })).toMatchObject({ goToReset: true });
    const account = describeLoginFailure({ kind: "blocked", scope: "account", retryAfterSeconds: 61 });
    expect(account.goToReset).toBe(true);
    expect(account.message).toContain("5회 이상 틀려 로그인이 차단");
    expect(account.message).toContain("약 2분 후");
    const ip = describeLoginFailure({ kind: "blocked", scope: "ip", retryAfterSeconds: null });
    expect(ip.message).toContain("IP");
    expect(ip.message).toContain("약 15분 후");
  });

  it("formats the reset cooldown as m:ss", () => {
    expect(formatCooldown(180)).toBe("3:00");
    expect(formatCooldown(65.2)).toBe("1:06");
    expect(formatCooldown(-5)).toBe("0:00");
  });
});
