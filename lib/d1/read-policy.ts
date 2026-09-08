import { createHmac, timingSafeEqual } from "node:crypto";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
const MAX_CURSOR_LENGTH = 2048;

export class ReadPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadPolicyError";
  }
}

export function parsePageSize(value: unknown): number {
  if (value === undefined || value === null || value === "") return DEFAULT_PAGE_SIZE;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^[1-9]\d*$/.test(value.trim())
      ? Number(value)
      : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
    throw new ReadPolicyError(`pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  return parsed;
}

type CursorSortValue = { field: string; value: string };
export type ReadCursor = { version: 1; scope: string; sort: CursorSortValue[] };

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(secret: string, body: string): Buffer {
  if (!secret || secret.length < 16) {
    throw new ReadPolicyError("cursor secret must contain at least 16 characters");
  }
  return createHmac("sha256", secret).update(body).digest();
}

export function signCursor(secret: string, cursor: ReadCursor): string {
  if (cursor.version !== 1 || !cursor.scope || !cursor.sort.length) {
    throw new ReadPolicyError("invalid cursor payload");
  }
  const body = encode(JSON.stringify(cursor));
  const token = `${body}.${signature(secret, body).toString("base64url")}`;
  if (token.length > MAX_CURSOR_LENGTH) throw new ReadPolicyError("cursor is too long");
  return token;
}

export function verifyCursor(secret: string, token: string, expectedScope: string, expectedFields: string[]): ReadCursor {
  if (typeof token !== "string" || token.length > MAX_CURSOR_LENGTH) throw new ReadPolicyError("invalid cursor");
  const [body, encodedSignature, ...extra] = token.split(".");
  if (!body || !encodedSignature || extra.length || !expectedScope) throw new ReadPolicyError("invalid cursor");
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    throw new ReadPolicyError("invalid cursor signature");
  }
  const expectedSignature = signature(secret, body);
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
    throw new ReadPolicyError("invalid cursor signature");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decode(body));
  } catch {
    throw new ReadPolicyError("invalid cursor payload");
  }
  if (!parsed || typeof parsed !== "object") throw new ReadPolicyError("invalid cursor payload");
  const candidate = parsed as Partial<ReadCursor>;
  if (
    candidate.version !== 1 ||
    candidate.scope !== expectedScope ||
    !Array.isArray(candidate.sort) ||
    candidate.sort.length !== expectedFields.length ||
    candidate.sort.some((item, index) =>
      !item || typeof item !== "object" ||
      (item as CursorSortValue).field !== expectedFields[index] ||
      typeof (item as CursorSortValue).value !== "string" ||
      !(item as CursorSortValue).value,
    )
  ) throw new ReadPolicyError("cursor scope or sort key does not match the request");
  return candidate as ReadCursor;
}

type CacheKind = "read" | "write" | "auth" | "confirm";
export type ReadCacheRequest = {
  name: string;
  scope: string;
  key: string;
  kind?: CacheKind;
  cacheable?: boolean;
};

type CacheEntry = { value: unknown; expiresAt: number; bytes: number };
export type ReadCacheOptions = { ttlMs?: number; maxEntries?: number; maxInflight?: number; maxBytes?: number };

export function createReadCache({ ttlMs = 30_000, maxEntries = 100, maxInflight = 100, maxBytes = 2_000_000 }: ReadCacheOptions = {}) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(maxEntries) || maxEntries < 1 || !Number.isSafeInteger(maxInflight) || maxInflight < 1 || !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new ReadPolicyError("cache ttlMs and maxEntries must be positive");
  }
  const entries = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<unknown>>();
  let pendingCount = 0;
  let storedBytes = 0;

  function removeEntry(key: string): void {
    storedBytes -= entries.get(key)?.bytes ?? 0;
    entries.delete(key);
  }

  function cacheKey(request: ReadCacheRequest): string {
    if (!request.name || !request.scope || !request.key) {
      throw new ReadPolicyError("cache request requires name, scope, and key");
    }
    return JSON.stringify([request.name, request.scope, request.key]);
  }

  async function getOrSet<T>(request: ReadCacheRequest, loader: () => Promise<T> | T): Promise<T> {
    const key = cacheKey(request);
    const allowCache = (request.kind ?? "read") === "read" && request.cacheable === true;
    if (!allowCache) return loader();
    const existing = entries.get(key);
    if (existing) {
      if (existing.expiresAt > Date.now()) return existing.value as T;
      removeEntry(key);
    }
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
    if (pendingCount >= maxInflight) throw new ReadPolicyError("too many reads in flight");
    pendingCount += 1;
    const promise = Promise.resolve().then(loader);
    inflight.set(key, promise);
    promise.then(
      (value) => {
        pendingCount -= 1;
        if (inflight.get(key) !== promise) return;
        inflight.delete(key);
        removeEntry(key);
        let bytes: number;
        try {
          bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
        } catch {
          return;
        }
        if (bytes > maxBytes) return;
        entries.set(key, { value, expiresAt: Date.now() + ttlMs, bytes });
        storedBytes += bytes;
        while (entries.size > maxEntries || storedBytes > maxBytes) {
          removeEntry(entries.keys().next().value as string);
        }
      },
      () => {
        pendingCount -= 1;
        if (inflight.get(key) !== promise) return;
        inflight.delete(key);
        removeEntry(key);
      },
    );
    return promise;
  }

  function invalidate(request?: Pick<ReadCacheRequest, "name" | "scope" | "key">): void {
    if (!request) {
      entries.clear();
      storedBytes = 0;
      inflight.clear();
      return;
    }
    const key = cacheKey(request);
    removeEntry(key);
    inflight.delete(key);
  }

  return { getOrSet, invalidate, size: () => entries.size, bytes: () => storedBytes };
}
