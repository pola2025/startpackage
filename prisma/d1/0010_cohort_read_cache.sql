CREATE TABLE IF NOT EXISTS "cohort_read_cache_version" (
  "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
  "version" INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO "cohort_read_cache_version" ("id", "version") VALUES (1, 0);

CREATE TRIGGER IF NOT EXISTS "cohorts_read_cache_version_insert"
AFTER INSERT ON "cohorts"
BEGIN
  UPDATE "cohort_read_cache_version" SET "version" = "version" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "cohorts_read_cache_version_update"
AFTER UPDATE ON "cohorts"
BEGIN
  UPDATE "cohort_read_cache_version" SET "version" = "version" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "cohorts_read_cache_version_delete"
AFTER DELETE ON "cohorts"
BEGIN
  UPDATE "cohort_read_cache_version" SET "version" = "version" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "users_read_cache_version_insert"
AFTER INSERT ON "users" WHEN NEW."role" = 'user'
BEGIN
  UPDATE "cohort_read_cache_version" SET "version" = "version" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "users_read_cache_version_update"
AFTER UPDATE ON "users" WHEN OLD."role" IS NOT NEW."role" OR OLD."cohortId" IS NOT NEW."cohortId"
BEGIN
  UPDATE "cohort_read_cache_version" SET "version" = "version" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER IF NOT EXISTS "users_read_cache_version_delete"
AFTER DELETE ON "users" WHEN OLD."role" = 'user'
BEGIN
  UPDATE "cohort_read_cache_version" SET "version" = "version" + 1 WHERE "id" = 1;
END;
