import { DataServiceError, type Database } from "./database";
import { createReadCache } from "./read-policy";
import { createHash } from "node:crypto";

const cache = createReadCache({ ttlMs: 15_000, maxEntries: 50, maxInflight: 50, maxBytes: 2_000_000 });
const databaseIds = new WeakMap<object, number>();
let nextDatabaseId = 1;

function databaseBoundary(db: Database): number {
  const existing = databaseIds.get(db);
  if (existing) return existing;
  const id = nextDatabaseId++;
  databaseIds.set(db, id);
  return id;
}

async function readVersion(db: Database): Promise<number> {
  try {
    const row = await db.prepare('SELECT "version" FROM "cohort_read_cache_version" WHERE "id" = 1').first<{ version: number }>();
    if (!row || !Number.isSafeInteger(row.version) || row.version < 0) throw new Error("invalid cache version");
    return row.version;
  } catch { throw new DataServiceError(503, "Service unavailable"); }
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function cachedCohortRead<T>(db: Database, key: string, loader: () => Promise<T>): Promise<T> {
  const version = await readVersion(db);
  return cache.getOrSet({ name: "admin-cohorts-page", scope: `${databaseBoundary(db)}:${version}`, key, kind: "read", cacheable: true }, loader);
}

export function cachedCohortPage<T>(db: Database, pageSize: number, cursor: string | undefined, secret: string, loader: () => Promise<T>): Promise<T> {
  return cachedCohortRead(db, `${pageSize}:${cursor ?? ""}:${fingerprint(secret)}`, loader);
}

export function cachedCohortStats<T>(db: Database, loader: () => Promise<T>): Promise<T> {
  return cachedCohortRead(db, "stats", loader);
}

export function clearCohortPageCache(): void {
  cache.invalidate();
}
