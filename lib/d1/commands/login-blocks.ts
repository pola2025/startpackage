import { DataServiceError, type Database } from "../database";

// 로그인 시도 예산(auth-attempts.ts)과 같은 창·한도. 기준을 바꾸면 함께 바꾼다.
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_ACCOUNT_BLOCK_ATTEMPTS = 5;

const ADMIN_ROLES = new Set(["super", "designer", "operator"]);
const KEY_HASH = /^[a-f0-9]{64}$/;
const ADMIN_ID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_BLOCK_ROWS = 200;
const MAX_IDENTITY_ROWS = 5000;
export const MAX_CLEAR_KEYS = 50;

export type LoginBlockRow = {
  keyHash: string;
  attempts: number;
  windowStartedAt: number;
  lastAttemptAt: number;
  retryAfterSeconds: number;
};

export type LoginIdentityRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  cohortName: string | null;
};

function invalid(message: string): never {
  throw new DataServiceError(400, message);
}

function validNow(value: unknown): number {
  const now = value ?? Date.now();
  if (typeof now !== "number" || !Number.isSafeInteger(now) || now < 0) invalid("Invalid time");
  return now;
}

async function assertAdmin(db: Database, adminId: unknown): Promise<void> {
  if (typeof adminId !== "string" || !ADMIN_ID.test(adminId)) invalid("Invalid admin ID");
  const admin = await db.prepare('SELECT "role" FROM "admins" WHERE "id" = ? LIMIT 1')
    .bind(adminId).first<{ role: string }>();
  if (!admin || !ADMIN_ROLES.has(admin.role)) throw new DataServiceError(403, "Forbidden");
}

/**
 * 현재 창(15분) 안에서 계정 한도(5회)에 도달한 시도 기록과, 해시를 회원과 대조할 식별자를 돌려준다.
 * 키는 HMAC이라 워커는 계정·IP를 구분할 수 없다. 대조는 비밀키를 가진 Next가 한다.
 */
export async function listLoginBlocks(
  db: Database,
  input: { adminId?: unknown; now?: unknown },
): Promise<{ now: number; windowMs: number; blocks: LoginBlockRow[]; identities: LoginIdentityRow[] }> {
  await assertAdmin(db, input?.adminId);
  const now = validNow(input?.now);
  const since = now - LOGIN_ATTEMPT_WINDOW_MS;
  // updatedAt ≥ windowStartedAt 이므로 updatedAt 인덱스로 먼저 좁힌다.
  const result = await db.prepare(`SELECT "keyHash", "failures", "windowStartedAt", "updatedAt"
    FROM "auth_login_attempts"
    WHERE "updatedAt" > ? AND "windowStartedAt" > ? AND "failures" >= ?
    ORDER BY "updatedAt" DESC LIMIT ?`)
    .bind(since, since, LOGIN_ACCOUNT_BLOCK_ATTEMPTS, MAX_BLOCK_ROWS)
    .all<{ keyHash: string; failures: number; windowStartedAt: number; updatedAt: number }>();
  if (!result.success) throw new DataServiceError(503, "Login blocks unavailable");

  const blocks = result.results.map((row) => ({
    keyHash: row.keyHash,
    attempts: row.failures,
    windowStartedAt: row.windowStartedAt,
    lastAttemptAt: row.updatedAt,
    retryAfterSeconds: Math.max(1, Math.ceil((row.windowStartedAt + LOGIN_ATTEMPT_WINDOW_MS - now) / 1000)),
  }));
  if (blocks.length === 0) return { now, windowMs: LOGIN_ATTEMPT_WINDOW_MS, blocks, identities: [] };

  const people = await db.prepare(`SELECT u."id", u."이름" AS "name", u."연락처" AS "phone", u."email", c."name" AS "cohortName"
    FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId"
    ORDER BY u."id" ASC LIMIT ?`).bind(MAX_IDENTITY_ROWS).all<LoginIdentityRow>();
  if (!people.success) throw new DataServiceError(503, "Login identities unavailable");
  return { now, windowMs: LOGIN_ATTEMPT_WINDOW_MS, blocks, identities: people.results };
}

function keyHashes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLEAR_KEYS) invalid("Invalid key list");
  const unique = [...new Set(value)];
  if (!unique.every((key): key is string => typeof key === "string" && KEY_HASH.test(key))) invalid("Invalid login attempt key");
  return unique;
}

async function deleteKeys(db: Database, keys: string[]): Promise<number> {
  const placeholders = keys.map(() => "?").join(", ");
  const result = await db.prepare(`DELETE FROM "auth_login_attempts" WHERE "keyHash" IN (${placeholders}) RETURNING "keyHash"`)
    .bind(...keys).all<{ keyHash: string }>();
  if (!result.success) throw new DataServiceError(503, "Login blocks unavailable");
  return result.results.length;
}

/** 관리자가 선택한 시도 기록을 지운다. 지우면 해당 계정·IP는 즉시 다시 로그인할 수 있다. */
export async function clearLoginBlocks(
  db: Database,
  input: { adminId?: unknown; keyHashes?: unknown },
): Promise<{ cleared: number }> {
  await assertAdmin(db, input?.adminId);
  return { cleared: await deleteKeys(db, keyHashes(input?.keyHashes)) };
}

/** 로그인 성공 직후 해당 계정의 시도 기록만 지운다(성공한 로그인이 다음 실패 횟수에 섞이지 않게). */
export async function clearAccountAttempt(db: Database, input: { keyHash?: unknown }): Promise<{ cleared: number }> {
  const keyHash = input?.keyHash;
  if (typeof keyHash !== "string" || !KEY_HASH.test(keyHash)) invalid("Invalid login attempt key");
  return { cleared: await deleteKeys(db, [keyHash]) };
}
