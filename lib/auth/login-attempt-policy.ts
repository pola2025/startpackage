// 로그인 실패 안내 정책 (서버·클라이언트 공용, 서버 전용 import 금지)
// 계정 차단 한도(5회/15분)는 data worker(auth/consume-attempts, account=5)와
// login-rate-limit.ts가 같은 값을 쓴다. 바꾸려면 세 곳을 함께 바꾼다.

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_RESET_REDIRECT_ATTEMPTS = 2;
export const LOGIN_BLOCK_MINUTES = 15;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 3 * 60;

export type LoginBlockScope = "account" | "ip";

export type LoginFailure =
  | { kind: "invalid"; attempts: number }
  | { kind: "blocked"; scope: LoginBlockScope; retryAfterSeconds: number | null }
  | { kind: "unknown" };

export type LoginFailureView = {
  message: string;
  goToReset: boolean;
};

const MAX_REPORTED_ATTEMPTS = 99;
const MAX_REPORTED_RETRY_SECONDS = 24 * 60 * 60;

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

// Auth.js CredentialsSignin.code 값으로 URL에 실린다. 계정 존재 여부는 담지 않는다.
export function formatInvalidLoginCode(attempts: number) {
  return `invalid_${clampInteger(attempts, 1, MAX_REPORTED_ATTEMPTS)}`;
}

export function formatBlockedLoginCode(scope: LoginBlockScope, retryAfterSeconds?: number) {
  const seconds = retryAfterSeconds === undefined
    ? 0
    : clampInteger(retryAfterSeconds, 0, MAX_REPORTED_RETRY_SECONDS);
  return `blocked_${scope}_${seconds}`;
}

export function parseLoginFailureCode(code?: string | null): LoginFailure {
  if (!code) return { kind: "unknown" };

  const invalid = /^invalid_(\d{1,2})$/.exec(code);
  if (invalid) {
    const attempts = Number(invalid[1]);
    return attempts >= 1 ? { kind: "invalid", attempts } : { kind: "unknown" };
  }

  const blocked = /^blocked_(account|ip)_(\d{1,5})$/.exec(code);
  if (blocked) {
    const seconds = Number(blocked[2]);
    return {
      kind: "blocked",
      scope: blocked[1] as LoginBlockScope,
      retryAfterSeconds: seconds > 0 ? seconds : null,
    };
  }

  return { kind: "unknown" };
}

function retryMinutes(retryAfterSeconds: number | null) {
  if (!retryAfterSeconds) return LOGIN_BLOCK_MINUTES;
  return Math.max(1, Math.ceil(retryAfterSeconds / 60));
}

export function describeLoginFailure(failure: LoginFailure): LoginFailureView {
  if (failure.kind === "blocked") {
    const minutes = retryMinutes(failure.retryAfterSeconds);
    const lead = failure.scope === "ip"
      ? "같은 네트워크(IP)에서 로그인 시도가 너무 많아 로그인이 일시 차단되었습니다."
      : `비밀번호를 ${LOGIN_MAX_ATTEMPTS}회 이상 틀려 로그인이 차단되었습니다.`;
    return {
      goToReset: true,
      message:
        `${lead} 약 ${minutes}분 후 자동으로 풀립니다.\n` +
        "비밀번호가 기억나지 않으면 임시 비밀번호를 받아두고, 차단이 풀린 뒤 로그인해주세요.",
    };
  }

  if (failure.kind === "invalid") {
    const { attempts } = failure;
    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      return {
        goToReset: true,
        message:
          `비밀번호를 ${attempts}회 틀려 약 ${LOGIN_BLOCK_MINUTES}분간 로그인이 차단됩니다.\n` +
          "임시 비밀번호를 받아두고, 차단이 풀린 뒤 로그인해주세요.",
      };
    }
    if (attempts >= LOGIN_RESET_REDIRECT_ATTEMPTS) {
      return {
        goToReset: true,
        message:
          `비밀번호를 ${attempts}회 틀려 비밀번호 재발급 화면으로 이동했습니다. (차단까지 남은 시도 ${LOGIN_MAX_ATTEMPTS - attempts}회)\n` +
          `${LOGIN_MAX_ATTEMPTS}회 틀리면 ${LOGIN_BLOCK_MINUTES}분간 로그인이 차단되니, 임시 비밀번호를 받아 로그인해주세요.`,
      };
    }
    return {
      goToReset: false,
      message:
        `전화번호 또는 비밀번호가 일치하지 않습니다. (실패 ${attempts}/${LOGIN_MAX_ATTEMPTS}회)\n` +
        `${LOGIN_RESET_REDIRECT_ATTEMPTS}회 틀리면 비밀번호 재발급 화면으로 이동하고, ${LOGIN_MAX_ATTEMPTS}회 틀리면 ${LOGIN_BLOCK_MINUTES}분간 로그인이 차단됩니다.`,
    };
  }

  return { goToReset: false, message: "전화번호 또는 비밀번호가 일치하지 않습니다." };
}

export function formatCooldown(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
