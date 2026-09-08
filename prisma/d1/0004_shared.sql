CREATE INDEX IF NOT EXISTS "users_content_tip_consent_id_keyset"
  ON "users" ("콘텐츠팁이메일수신", "id");

CREATE INDEX IF NOT EXISTS "notifications_user_type_created_id_keyset"
  ON "notifications" ("userId", "type", "createdAt", "id");

CREATE TABLE IF NOT EXISTS "notification_fanouts" (
  "fanoutKey" TEXT PRIMARY KEY NOT NULL,
  "cursor" TEXT,
  "completed" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_fanout_deliveries" (
  "fanoutKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "updatedAt" INTEGER NOT NULL,
  PRIMARY KEY ("fanoutKey", "userId"),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "notification_fanout_deliveries_status_keyset"
  ON "notification_fanout_deliveries" ("fanoutKey", "status", "userId");
