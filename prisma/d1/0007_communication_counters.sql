CREATE TABLE IF NOT EXISTS "communication_thread_counters" ("threadId" TEXT PRIMARY KEY NOT NULL,"userId" TEXT NOT NULL,"messageCount" INTEGER NOT NULL DEFAULT 0,"unreadByUser" INTEGER NOT NULL DEFAULT 0,"unreadByAdmin" INTEGER NOT NULL DEFAULT 0,FOREIGN KEY ("threadId") REFERENCES "communication_threads" ("id") ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS "communication_user_counters" ("userId" TEXT PRIMARY KEY NOT NULL,"unreadCount" INTEGER NOT NULL DEFAULT 0,FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS "communication_global_counters" ("id" INTEGER PRIMARY KEY CHECK ("id" = 1),"unreadByAdmin" INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO "communication_thread_counters" SELECT t."id",t."userId",COUNT(m."id"),COALESCE(SUM(CASE WHEN m."authorType"='admin' AND m."isReadByUser"=0 THEN 1 ELSE 0 END),0),COALESCE(SUM(CASE WHEN m."authorType"='user' AND m."isReadByAdmin"=0 THEN 1 ELSE 0 END),0) FROM "communication_threads" t LEFT JOIN "communication_messages" m ON m."threadId"=t."id" GROUP BY t."id",t."userId";
INSERT OR IGNORE INTO "communication_user_counters" SELECT t."userId",COUNT(m."id") FROM "communication_threads" t INNER JOIN "communication_messages" m ON m."threadId"=t."id" WHERE m."authorType"='admin' AND m."isReadByUser"=0 GROUP BY t."userId";
INSERT OR IGNORE INTO "communication_global_counters" VALUES (1,(SELECT COUNT(*) FROM "communication_messages" WHERE "authorType"='user' AND "isReadByAdmin"=0));
INSERT OR IGNORE INTO "communication_global_counters" VALUES (1,0);
CREATE TRIGGER IF NOT EXISTS "communication_message_counter_insert" AFTER INSERT ON "communication_messages" BEGIN
INSERT INTO "communication_thread_counters" SELECT NEW."threadId",t."userId",1,CASE WHEN NEW."authorType"='admin' AND NEW."isReadByUser"=0 THEN 1 ELSE 0 END,CASE WHEN NEW."authorType"='user' AND NEW."isReadByAdmin"=0 THEN 1 ELSE 0 END FROM "communication_threads" t WHERE t."id"=NEW."threadId" ON CONFLICT("threadId") DO UPDATE SET "messageCount"="messageCount"+1,"unreadByUser"="unreadByUser"+CASE WHEN NEW."authorType"='admin' AND NEW."isReadByUser"=0 THEN 1 ELSE 0 END,"unreadByAdmin"="unreadByAdmin"+CASE WHEN NEW."authorType"='user' AND NEW."isReadByAdmin"=0 THEN 1 ELSE 0 END;
INSERT INTO "communication_user_counters" SELECT "userId",CASE WHEN NEW."authorType"='admin' AND NEW."isReadByUser"=0 THEN 1 ELSE 0 END FROM "communication_threads" WHERE "id"=NEW."threadId" ON CONFLICT("userId") DO UPDATE SET "unreadCount"="unreadCount"+CASE WHEN NEW."authorType"='admin' AND NEW."isReadByUser"=0 THEN 1 ELSE 0 END;
UPDATE "communication_global_counters" SET "unreadByAdmin"="unreadByAdmin"+CASE WHEN NEW."authorType"='user' AND NEW."isReadByAdmin"=0 THEN 1 ELSE 0 END WHERE "id"=1;
END;
CREATE TRIGGER IF NOT EXISTS "communication_message_counter_update" AFTER UPDATE OF "isReadByUser","isReadByAdmin" ON "communication_messages" BEGIN
UPDATE "communication_thread_counters" SET "unreadByUser"="unreadByUser"+CASE WHEN NEW."authorType"='admin' AND OLD."isReadByUser"=1 AND NEW."isReadByUser"=0 THEN 1 WHEN NEW."authorType"='admin' AND OLD."isReadByUser"=0 AND NEW."isReadByUser"=1 THEN -1 ELSE 0 END,"unreadByAdmin"="unreadByAdmin"+CASE WHEN NEW."authorType"='user' AND OLD."isReadByAdmin"=1 AND NEW."isReadByAdmin"=0 THEN 1 WHEN NEW."authorType"='user' AND OLD."isReadByAdmin"=0 AND NEW."isReadByAdmin"=1 THEN -1 ELSE 0 END WHERE "threadId"=NEW."threadId";
UPDATE "communication_user_counters" SET "unreadCount"="unreadCount"+CASE WHEN NEW."authorType"='admin' AND OLD."isReadByUser"=1 AND NEW."isReadByUser"=0 THEN 1 WHEN NEW."authorType"='admin' AND OLD."isReadByUser"=0 AND NEW."isReadByUser"=1 THEN -1 ELSE 0 END WHERE "userId"=(SELECT "userId" FROM "communication_threads" WHERE "id"=NEW."threadId");
UPDATE "communication_global_counters" SET "unreadByAdmin"="unreadByAdmin"+CASE WHEN NEW."authorType"='user' AND OLD."isReadByAdmin"=1 AND NEW."isReadByAdmin"=0 THEN 1 WHEN NEW."authorType"='user' AND OLD."isReadByAdmin"=0 AND NEW."isReadByAdmin"=1 THEN -1 ELSE 0 END WHERE "id"=1;
END;
CREATE TRIGGER IF NOT EXISTS "communication_message_counter_delete" AFTER DELETE ON "communication_messages" BEGIN
UPDATE "communication_thread_counters" SET "messageCount"="messageCount"-1,"unreadByUser"="unreadByUser"-CASE WHEN OLD."authorType"='admin' AND OLD."isReadByUser"=0 THEN 1 ELSE 0 END,"unreadByAdmin"="unreadByAdmin"-CASE WHEN OLD."authorType"='user' AND OLD."isReadByAdmin"=0 THEN 1 ELSE 0 END WHERE "threadId"=OLD."threadId";
UPDATE "communication_user_counters" SET "unreadCount"="unreadCount"-CASE WHEN OLD."authorType"='admin' AND OLD."isReadByUser"=0 THEN 1 ELSE 0 END WHERE "userId"=(SELECT "userId" FROM "communication_thread_counters" WHERE "threadId"=OLD."threadId");
UPDATE "communication_global_counters" SET "unreadByAdmin"="unreadByAdmin"-CASE WHEN OLD."authorType"='user' AND OLD."isReadByAdmin"=0 THEN 1 ELSE 0 END WHERE "id"=1;
END;
CREATE TRIGGER IF NOT EXISTS "communication_thread_counter_user_change" AFTER UPDATE OF "userId" ON "communication_threads" WHEN OLD."userId" <> NEW."userId" BEGIN
UPDATE "communication_user_counters" SET "unreadCount"="unreadCount"-COALESCE((SELECT "unreadByUser" FROM "communication_thread_counters" WHERE "threadId"=NEW."id"),0) WHERE "userId"=OLD."userId";
INSERT INTO "communication_user_counters" SELECT NEW."userId",COALESCE((SELECT "unreadByUser" FROM "communication_thread_counters" WHERE "threadId"=NEW."id"),0) ON CONFLICT("userId") DO UPDATE SET "unreadCount"="unreadCount"+excluded."unreadCount";
UPDATE "communication_thread_counters" SET "userId"=NEW."userId" WHERE "threadId"=NEW."id";
END;
CREATE TRIGGER IF NOT EXISTS "communication_thread_counter_delete" BEFORE DELETE ON "communication_threads" BEGIN
UPDATE "communication_user_counters" SET "unreadCount"="unreadCount"-COALESCE((SELECT "unreadByUser" FROM "communication_thread_counters" WHERE "threadId"=OLD."id"),0) WHERE "userId"=OLD."userId";
DELETE FROM "communication_thread_counters" WHERE "threadId"=OLD."id";
END;
