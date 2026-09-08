import type { Database } from "../database";

/** Remove one indexed batch; retained rows outlive every supported login window. */
export async function pruneAuthAttempts(db: Database, now = Date.now()): Promise<number> {
  const result = await db.prepare(`DELETE FROM "auth_login_attempts" WHERE "keyHash" IN (
    SELECT "keyHash" FROM "auth_login_attempts"
    WHERE "updatedAt" < ? ORDER BY "updatedAt" ASC LIMIT 2000
  ) RETURNING "keyHash"`).bind(now - 2 * 86_400_000).all<{ keyHash: string }>();
  return result.results.length;
}
