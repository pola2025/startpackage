import { createHmac } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_BUCKETS = 10_000;

type Bucket = { failures: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function digest(value: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_RATE_LIMIT_SECRET is not configured");
  }
  return createHmac("sha256", secret || "development-only-rate-limit-secret").update(value).digest("hex");
}

function normalizeIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return /^01\d{8,9}$/.test(normalized.replace(/-/g, ""))
    ? normalized.replace(/-/g, "")
    : normalized;
}

function getClientIp(request?: Request) {
  const headerName = process.env.AUTH_TRUSTED_IP_HEADER;
  if (!headerName) return "unknown";
  return request?.headers.get(headerName)?.split(",")[0]?.trim().toLowerCase() || "unknown";
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

export function getLoginRateLimitKey(identifier: string, request?: Request) {
  const ip = getClientIp(request);
  return digest(`${ip}\u0000${normalizeIdentifier(identifier)}`);
}

/** D1 분산 제한기의 계정 키. 관리자 차단 해제 화면이 회원 전화번호·이메일과 대조할 때도 쓴다. */
export function getAccountLoginKey(identifier: string) {
  return digest(`account\u0000${normalizeIdentifier(identifier)}`);
}

export function getLoginRateLimitKeys(identifier: string, request?: Request) {
  const ip = getClientIp(request);
  return {
    account: getAccountLoginKey(identifier),
    ip: digest(`ip\u0000${ip.toLowerCase()}`),
  };
}

function isDistributedLimiterConfigured() {
  return Boolean(process.env.D1_DATA_SERVICE_URL && process.env.D1_DATA_SERVICE_TOKEN);
}

export function isLoginRateLimited(key: string, now = Date.now()) {
  prune(now);
  const bucket = buckets.get(key);
  return Boolean(bucket && bucket.resetAt > now && bucket.failures >= MAX_FAILURES);
}

/**
 * 로그인 차단 판단용. D1 분산 제한기가 설정돼 있으면 그쪽이 기준이다.
 * 인스턴스 메모리 버킷은 관리자 "차단 해제"로 지울 수 없어서 D1이 없을 때(로컬 개발)만 막는다.
 */
export function isLocallyRateLimited(key: string, now = Date.now()) {
  return !isDistributedLimiterConfigured() && isLoginRateLimited(key, now);
}

export function getLoginRetryAfterSeconds(key: string, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return undefined;
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

/** 실패를 기록하고 현재 윈도우의 누적 실패 횟수를 돌려준다. */
export function recordLoginFailure(key: string, now = Date.now()) {
  prune(now);
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { failures: 1, resetAt: now + WINDOW_MS }
    : { failures: existing.failures + 1, resetAt: existing.resetAt };
  buckets.delete(key);
  buckets.set(key, bucket);
  return bucket.failures;
}

export function clearLoginFailures(key: string) {
  buckets.delete(key);
}

type LoginAttemptKind = "account" | "ip";
type DistributedLoginAttempt = { allowed: boolean; retryAfterSeconds?: number; failures?: number };

export type LoginAttemptReservation = {
  allowed: boolean;
  retryAfterSeconds?: number;
  /** 차단된 경우 어느 한도에 걸렸는지 */
  blockedBy?: LoginAttemptKind;
  /** 계정 한도 기준 이번 시도를 포함한 윈도우 내 시도 횟수 (D1 설정 시) */
  accountAttempts?: number;
};

export async function reserveLoginAttempt(identifier: string, request?: Request): Promise<LoginAttemptReservation> {
  const keys = getLoginRateLimitKeys(identifier, request);
  const configured = Boolean(process.env.D1_DATA_SERVICE_URL && process.env.D1_DATA_SERVICE_TOKEN);
  if (!configured) {
    if (process.env.NODE_ENV === "production") throw new Error("Distributed login limiter is not configured");
    return { allowed: true };
  }

  const { callDataService } = await import("../d1/service-client");
  const results = await Promise.all(
    (Object.entries(keys) as Array<[LoginAttemptKind, string]>).map(async ([kind, keyHash]) => ({
      kind,
      result: await callDataService<DistributedLoginAttempt>("auth/consume-attempts", { keyHash, kind }),
    })),
  );
  const blocked = results.find(({ result }) => !result.allowed);
  if (blocked) {
    return { allowed: false, retryAfterSeconds: blocked.result.retryAfterSeconds, blockedBy: blocked.kind };
  }
  const accountFailures = results.find(({ kind }) => kind === "account")?.result.failures;
  return typeof accountFailures === "number" && Number.isFinite(accountFailures)
    ? { allowed: true, accountAttempts: accountFailures }
    : { allowed: true };
}

/**
 * 로그인 성공 직후 D1의 계정 시도 기록을 지운다. 성공한 로그인이 다음 실패 안내("실패 n/5회")와
 * 차단 횟수에 섞이지 않게 한다. IP 기록은 그대로 둔다. 실패해도 로그인은 막지 않는다.
 */
export async function clearDistributedLoginAttempts(identifier: string): Promise<void> {
  if (!isDistributedLimiterConfigured()) return;
  try {
    const { callDataService } = await import("../d1/service-client");
    await callDataService("auth/clear-attempts", { keyHash: getAccountLoginKey(identifier), kind: "account" });
  } catch {
    console.warn("[login] 성공 후 계정 시도 기록을 지우지 못했습니다.");
  }
}

export const loginRateLimitConfig = {
  windowMs: WINDOW_MS,
  maxFailures: MAX_FAILURES,
};
