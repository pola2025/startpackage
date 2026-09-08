import { DataServiceError, type Database } from "../database";

export type ConsumeLoginAttemptInput = {
  keyHash: string;
  now?: number;
  windowMs?: number;
  maxFailures?: number;
};

export type ConsumeLoginAttemptResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  failures: number;
};

function invalid(message: string): never {
  throw new DataServiceError(400, message);
}

export async function consumeLoginAttempt(
  db: Database,
  input: ConsumeLoginAttemptInput,
): Promise<ConsumeLoginAttemptResult> {
  const keyHash = typeof input?.keyHash === "string" ? input.keyHash : "";
  const now = input?.now ?? Date.now();
  const windowMs = input?.windowMs ?? 15 * 60 * 1000;
  const maxFailures = input?.maxFailures ?? 5;

  if (!/^[a-f0-9]{64}$/.test(keyHash)) invalid("Invalid login attempt key");
  if (!Number.isSafeInteger(now) || now < 0) invalid("Invalid login attempt time");
  if (!Number.isSafeInteger(windowMs) || windowMs < 60_000 || windowMs > 86_400_000) {
    invalid("Invalid login attempt window");
  }
  if (!Number.isSafeInteger(maxFailures) || maxFailures < 1 || maxFailures > 100) {
    invalid("Invalid login attempt limit");
  }

  const row = await db
    .prepare(
      `INSERT INTO "auth_login_attempts" ("keyHash", "windowStartedAt", "failures", "updatedAt")
       VALUES (?, ?, 1, ?)
       ON CONFLICT("keyHash") DO UPDATE SET
         "windowStartedAt" = CASE
           WHEN "auth_login_attempts"."windowStartedAt" + ? <= ? THEN ?
           ELSE "auth_login_attempts"."windowStartedAt"
         END,
         "failures" = CASE
           WHEN "auth_login_attempts"."windowStartedAt" + ? <= ? THEN 1
           ELSE "auth_login_attempts"."failures" + 1
         END,
         "updatedAt" = ?
       RETURNING "windowStartedAt", "failures"`,
    )
    .bind(keyHash, now, now, windowMs, now, now, windowMs, now, now)
    .first<{ windowStartedAt: number; failures: number }>();

  if (!row) throw new DataServiceError(503, "Login limiter unavailable");
  const retryAfterSeconds = Math.max(1, Math.ceil((row.windowStartedAt + windowMs - now) / 1000));
  return {
    allowed: row.failures <= maxFailures,
    retryAfterSeconds,
    failures: row.failures,
  };
}
