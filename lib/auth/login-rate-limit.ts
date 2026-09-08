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

export function getLoginRateLimitKeys(identifier: string, request?: Request) {
  const ip = getClientIp(request);
  const normalizedIdentifier = normalizeIdentifier(identifier);
  return {
    account: digest(`account\u0000${normalizedIdentifier}`),
    ip: digest(`ip\u0000${ip.toLowerCase()}`),
  };
}

export function isLoginRateLimited(key: string, now = Date.now()) {
  prune(now);
  const bucket = buckets.get(key);
  return Boolean(bucket && bucket.resetAt > now && bucket.failures >= MAX_FAILURES);
}

export function recordLoginFailure(key: string, now = Date.now()) {
  prune(now);
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { failures: 1, resetAt: now + WINDOW_MS }
    : { failures: existing.failures + 1, resetAt: existing.resetAt };
  buckets.delete(key);
  buckets.set(key, bucket);
}

export function clearLoginFailures(key: string) {
  buckets.delete(key);
}

type DistributedLoginAttempt = { allowed: boolean; retryAfterSeconds?: number };

export async function reserveLoginAttempt(identifier: string, request?: Request): Promise<DistributedLoginAttempt> {
  const keys = getLoginRateLimitKeys(identifier, request);
  const configured = Boolean(process.env.D1_DATA_SERVICE_URL && process.env.D1_DATA_SERVICE_TOKEN);
  if (!configured) {
    if (process.env.NODE_ENV === "production") throw new Error("Distributed login limiter is not configured");
    return { allowed: true };
  }

  const { callDataService } = await import("../d1/service-client");
  const results = await Promise.all(
    (Object.entries(keys) as Array<["account" | "ip", string]>).map(async ([kind, keyHash]) =>
      callDataService<DistributedLoginAttempt>("auth/consume-attempts", { keyHash, kind })),
  );
  const blocked = results.find((result) => !result.allowed);
  return blocked ?? { allowed: true };
}

export const loginRateLimitConfig = {
  windowMs: WINDOW_MS,
  maxFailures: MAX_FAILURES,
};
