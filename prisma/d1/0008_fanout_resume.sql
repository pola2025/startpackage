ALTER TABLE "notification_fanouts" ADD COLUMN "leaseToken" TEXT;
ALTER TABLE "notification_fanouts" ADD COLUMN "leaseUntil" INTEGER;

CREATE INDEX IF NOT EXISTS "notification_fanouts_resume_keyset"
  ON "notification_fanouts" ("completed", "leaseUntil", "updatedAt", "fanoutKey");
