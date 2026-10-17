-- 관리자 Meta 설정요청 목록: 처리 대기(요청이 오래된 사람부터)와 완료(최근 완료부터)를 인덱스만으로 읽는다
CREATE INDEX IF NOT EXISTS "submissions_meta_setup_pending_requested_id" ON "submissions" ("MetaSetupRequestedAt", "id") WHERE "MetaSetupRequestedAt" IS NOT NULL AND "MetaSetupDoneAt" IS NULL;
CREATE INDEX IF NOT EXISTS "submissions_meta_setup_done_done_id" ON "submissions" ("MetaSetupDoneAt", "id") WHERE "MetaSetupDoneAt" IS NOT NULL;
