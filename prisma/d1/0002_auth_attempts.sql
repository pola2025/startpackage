CREATE TABLE IF NOT EXISTS "auth_login_attempts" (
  "keyHash" TEXT PRIMARY KEY NOT NULL,
  "windowStartedAt" INTEGER NOT NULL,
  "failures" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "auth_login_attempts_updatedAt_idx"
  ON "auth_login_attempts" ("updatedAt");
