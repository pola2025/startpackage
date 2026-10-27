-- 기수 대상자 명단: 관리자가 미리 등록한 이름·연락처. 가입 연락처 확인과 2주차 안내 대상 판정에 쓴다
CREATE TABLE IF NOT EXISTS "cohort_roster" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "cohortId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cohort_roster_cohortId_phone_key_unique" ON "cohort_roster" ("cohortId", "phone");

-- 기수 자동 안내 발송 기록: 같은 기수·종류·연락처에는 한 번만 보낸다
CREATE TABLE IF NOT EXISTS "cohort_reminders" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "cohortId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "userId" TEXT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT '발송중',
  "channel" TEXT,
  "note" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cohort_reminders_cohortId_kind_phone_key_unique" ON "cohort_reminders" ("cohortId", "kind", "phone");
