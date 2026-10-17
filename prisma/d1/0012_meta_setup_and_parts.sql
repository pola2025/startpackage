-- 제출 정보 파트 재구성(로고 제작 방식, 문자발송 사용 여부)과 Meta 설정요청
ALTER TABLE "submissions" ADD COLUMN "로고제작방식" TEXT;
ALTER TABLE "submissions" ADD COLUMN "문자발송사용여부" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaSetupType" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaGoogleID" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaGooglePW" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaSetupMemo" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaSetupRequestedAt" INTEGER;
ALTER TABLE "submissions" ADD COLUMN "MetaSetupDoneAt" INTEGER;
ALTER TABLE "submissions" ADD COLUMN "MetaSystemUserToken" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaThreadsToken" TEXT;
ALTER TABLE "submissions" ADD COLUMN "MetaTokenEmailSentAt" INTEGER;
