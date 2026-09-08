CREATE TABLE IF NOT EXISTS "design_thread_counters" (
  "threadId" TEXT PRIMARY KEY NOT NULL,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "unreadByAdmin" INTEGER NOT NULL DEFAULT 0,
  "unreadByUser" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  "workflowType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("threadId") REFERENCES "design_threads" ("id") ON DELETE CASCADE
);

INSERT OR IGNORE INTO "design_thread_counters"
SELECT t."id", COUNT(m."id"),
  COALESCE(SUM(CASE WHEN m."authorType" = 'user' AND m."isReadByAdmin" = 0 THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN m."authorType" = 'admin' AND m."isReadByUser" = 0 THEN 1 ELSE 0 END), 0),
  w."userId", w."type", t."status", t."updatedAt"
FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId"
LEFT JOIN "design_thread_messages" m ON m."threadId" = t."id"
GROUP BY t."id", w."userId", w."type", t."status", t."updatedAt";

CREATE INDEX IF NOT EXISTS "design_thread_counters_updated_id_idx" ON "design_thread_counters" ("updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_status_updated_id_idx" ON "design_thread_counters" ("status", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_type_updated_id_idx" ON "design_thread_counters" ("workflowType", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_type_status_updated_id_idx" ON "design_thread_counters" ("workflowType", "status", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_user_updated_id_idx" ON "design_thread_counters" ("userId", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_user_status_updated_id_idx" ON "design_thread_counters" ("userId", "status", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_user_type_updated_id_idx" ON "design_thread_counters" ("userId", "workflowType", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_counters_user_type_status_updated_id_idx" ON "design_thread_counters" ("userId", "workflowType", "status", "updatedAt", "threadId");
CREATE INDEX IF NOT EXISTS "design_thread_messages_thread_author_read_idx" ON "design_thread_messages" ("threadId", "authorType", "isReadByAdmin");

CREATE TRIGGER IF NOT EXISTS "design_thread_counter_insert" AFTER INSERT ON "design_thread_messages" BEGIN
  INSERT INTO "design_thread_counters" ("threadId", "messageCount", "unreadByAdmin", "unreadByUser", "userId", "workflowType", "status", "updatedAt")
  SELECT NEW."threadId", 1,
    CASE WHEN NEW."authorType" = 'user' AND NEW."isReadByAdmin" = 0 THEN 1 ELSE 0 END,
    CASE WHEN NEW."authorType" = 'admin' AND NEW."isReadByUser" = 0 THEN 1 ELSE 0 END,
    w."userId", w."type", t."status", t."updatedAt"
  FROM "design_threads" t INNER JOIN "workflows" w ON w."id" = t."workflowId" WHERE t."id" = NEW."threadId"
  ON CONFLICT("threadId") DO UPDATE SET
    "messageCount" = "messageCount" + 1,
    "unreadByAdmin" = "unreadByAdmin" + CASE WHEN NEW."authorType" = 'user' AND NEW."isReadByAdmin" = 0 THEN 1 ELSE 0 END,
    "unreadByUser" = "unreadByUser" + CASE WHEN NEW."authorType" = 'admin' AND NEW."isReadByUser" = 0 THEN 1 ELSE 0 END;
END;

CREATE TRIGGER IF NOT EXISTS "design_thread_counter_update" AFTER UPDATE OF "authorType", "isReadByAdmin", "isReadByUser" ON "design_thread_messages" BEGIN
  UPDATE "design_thread_counters" SET
    "unreadByAdmin" = "unreadByAdmin" + CASE WHEN NEW."authorType" = 'user' AND NEW."isReadByAdmin" = 0 THEN 1 ELSE 0 END - CASE WHEN OLD."authorType" = 'user' AND OLD."isReadByAdmin" = 0 THEN 1 ELSE 0 END,
    "unreadByUser" = "unreadByUser" + CASE WHEN NEW."authorType" = 'admin' AND NEW."isReadByUser" = 0 THEN 1 ELSE 0 END - CASE WHEN OLD."authorType" = 'admin' AND OLD."isReadByUser" = 0 THEN 1 ELSE 0 END
  WHERE "threadId" = NEW."threadId";
END;

CREATE TRIGGER IF NOT EXISTS "design_thread_counter_delete" AFTER DELETE ON "design_thread_messages" BEGIN
  UPDATE "design_thread_counters" SET "messageCount" = "messageCount" - 1,
    "unreadByAdmin" = "unreadByAdmin" - CASE WHEN OLD."authorType" = 'user' AND OLD."isReadByAdmin" = 0 THEN 1 ELSE 0 END,
    "unreadByUser" = "unreadByUser" - CASE WHEN OLD."authorType" = 'admin' AND OLD."isReadByUser" = 0 THEN 1 ELSE 0 END
  WHERE "threadId" = OLD."threadId";
END;

CREATE TRIGGER IF NOT EXISTS "design_thread_projection_insert" AFTER INSERT ON "design_threads" BEGIN
  INSERT OR IGNORE INTO "design_thread_counters" ("threadId", "userId", "workflowType", "status", "updatedAt")
  SELECT NEW."id", w."userId", w."type", NEW."status", NEW."updatedAt" FROM "workflows" w WHERE w."id" = NEW."workflowId";
END;

CREATE TRIGGER IF NOT EXISTS "design_thread_projection_update" AFTER UPDATE OF "status", "updatedAt", "workflowId" ON "design_threads" BEGIN
  UPDATE "design_thread_counters" SET "userId" = (SELECT "userId" FROM "workflows" WHERE "id" = NEW."workflowId"), "workflowType" = (SELECT "type" FROM "workflows" WHERE "id" = NEW."workflowId"), "status" = NEW."status", "updatedAt" = NEW."updatedAt" WHERE "threadId" = NEW."id";
END;

CREATE TRIGGER IF NOT EXISTS "design_thread_projection_workflow_update" AFTER UPDATE OF "userId", "type" ON "workflows" BEGIN
  UPDATE "design_thread_counters" SET "userId" = NEW."userId", "workflowType" = NEW."type" WHERE "threadId" IN (SELECT "id" FROM "design_threads" WHERE "workflowId" = NEW."id");
END;

CREATE TRIGGER IF NOT EXISTS "design_thread_projection_delete" BEFORE DELETE ON "design_threads" BEGIN
  DELETE FROM "design_thread_counters" WHERE "threadId" = OLD."id";
END;
