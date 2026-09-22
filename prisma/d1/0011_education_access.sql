CREATE TABLE IF NOT EXISTS "education_access_events" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT,
  "cohortId" TEXT,
  "eventType" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "ipAddress" TEXT,
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "country" TEXT,
  "city" TEXT,
  "path" TEXT,
  "metadata" TEXT CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "education_access_events_createdAt_id_idx"
  ON "education_access_events" ("createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "education_access_events_eventType_createdAt_id_idx"
  ON "education_access_events" ("eventType", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "education_access_events_userId_createdAt_id_idx"
  ON "education_access_events" ("userId", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "education_access_events_ipHash_createdAt_id_idx"
  ON "education_access_events" ("ipHash", "createdAt" DESC, "id" DESC);

CREATE TABLE IF NOT EXISTS "education_extension_requests" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "currentEndAt" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
  "approvedUntil" INTEGER,
  "requestIp" TEXT,
  "requestedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "reviewedBy" TEXT,
  "reviewedAt" INTEGER,
  "adminNote" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "education_extension_requests_status_requestedAt_id_idx"
  ON "education_extension_requests" ("status", "requestedAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "education_extension_requests_userId_requestedAt_id_idx"
  ON "education_extension_requests" ("userId", "requestedAt" DESC, "id" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "education_extension_requests_one_pending_per_user_idx"
  ON "education_extension_requests" ("userId") WHERE "status" = 'pending';

CREATE TABLE IF NOT EXISTS "education_ip_blocks" (
  "ipHash" TEXT PRIMARY KEY NOT NULL,
  "ipAddress" TEXT,
  "reason" TEXT NOT NULL,
  "hitCount" INTEGER NOT NULL DEFAULT 1,
  "blockedUntil" INTEGER NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "education_ip_blocks_blockedUntil_idx"
  ON "education_ip_blocks" ("blockedUntil");

CREATE TABLE IF NOT EXISTS "education_rate_windows" (
  "keyHash" TEXT PRIMARY KEY NOT NULL,
  "action" TEXT NOT NULL,
  "windowStartedAt" INTEGER NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "blockedUntil" INTEGER,
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "education_rate_windows_action_updatedAt_idx"
  ON "education_rate_windows" ("action", "updatedAt");
CREATE INDEX IF NOT EXISTS "education_rate_windows_blockedUntil_idx"
  ON "education_rate_windows" ("blockedUntil");
