-- GENERATED FILE: python scripts/d1/generate_schema.py
-- Source: prisma/schema.prisma
-- SQLite/D1; regenerate instead of editing this file by hand.
PRAGMA foreign_keys = ON;

CREATE TABLE "cohorts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "englishName" TEXT,
  "교육시작일" INTEGER NOT NULL,
  "교육요일" TEXT NOT NULL,
  "자료제출마감일" INTEGER NOT NULL,
  "isActive" INTEGER NOT NULL DEFAULT 1 CHECK ("isActive" IN (0, 1)),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX "cohorts_isActive_idx" ON "cohorts" ("isActive");
CREATE INDEX "cohorts_자료제출마감일_idx" ON "cohorts" ("자료제출마감일");

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "이름" TEXT NOT NULL,
  "englishName" TEXT,
  "연락처" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "SMS수신동의" INTEGER NOT NULL DEFAULT 0 CHECK ("SMS수신동의" IN (0, 1)),
  "이메일수신동의" INTEGER NOT NULL DEFAULT 0 CHECK ("이메일수신동의" IN (0, 1)),
  "공지사항이메일수신" INTEGER NOT NULL DEFAULT 1 CHECK ("공지사항이메일수신" IN (0, 1)),
  "콘텐츠팁이메일수신" INTEGER NOT NULL DEFAULT 0 CHECK ("콘텐츠팁이메일수신" IN (0, 1)),
  "role" TEXT NOT NULL DEFAULT 'user',
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'graduated', 'inactive')),
  "graduatedAt" INTEGER,
  "slackChannelId" TEXT,
  "telegramChatId" TEXT,
  "marketingSupportEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("marketingSupportEnabled" IN (0, 1)),
  "marketingSupportStartDate" INTEGER,
  "marketingSupportEndDate" INTEGER,
  "adAutomationEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("adAutomationEnabled" IN (0, 1)),
  "adAutomationStartDate" INTEGER,
  "adAutomationEndDate" INTEGER,
  "smsSettingEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("smsSettingEnabled" IN (0, 1)),
  "smsSettingStartDate" INTEGER,
  "smsSettingEndDate" INTEGER,
  "naverAdSettingEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("naverAdSettingEnabled" IN (0, 1)),
  "naverAdSettingStartDate" INTEGER,
  "naverAdSettingEndDate" INTEGER,
  "homepageCompleted" INTEGER NOT NULL DEFAULT 0 CHECK ("homepageCompleted" IN (0, 1)),
  "homepageCompletedAt" INTEGER,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "users_cohortId_idx" ON "users" ("cohortId");
CREATE INDEX "users_email_idx" ON "users" ("email");
CREATE INDEX "users_status_idx" ON "users" ("status");

CREATE TABLE "submissions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT UNIQUE NOT NULL,
  "사업자등록증URL" TEXT,
  "프로필사진URL" TEXT,
  "브랜드명" TEXT,
  "brandNameEnglish" TEXT,
  "업종" TEXT,
  "주소" TEXT,
  "메타광고관리자값" TEXT,
  "네이버검색광고ID" TEXT,
  "네이버검색광고PW" TEXT,
  "네이버클라우드ID" TEXT,
  "네이버클라우드PW" TEXT,
  "InstagramID" TEXT,
  "InstagramPW" TEXT,
  "GmailID" TEXT,
  "GmailPW" TEXT,
  "홈페이지스타일" TEXT,
  "홈페이지컬러컨셉" TEXT,
  "홈페이지제작방식" TEXT,
  "아임웹ID" TEXT,
  "아임웹PW" TEXT,
  "아임웹관리자PW" TEXT,
  "도메인주소" TEXT,
  "도메인관리사이트" TEXT,
  "도메인관리ID" TEXT,
  "도메인관리PW" TEXT,
  "해외결제카드앞면URL" TEXT,
  "해외결제카드뒷면URL" TEXT,
  "해외결제카드유효기간" TEXT,
  "해외결제카드CVC" TEXT,
  "대표번호" TEXT,
  "이메일" TEXT,
  "로고URL" TEXT,
  "로고선호스타일" TEXT,
  "로고선호색상" TEXT,
  "로고선호폰트" TEXT,
  "로고제작요청사항" TEXT,
  "명함색상" TEXT,
  "명함시안" TEXT,
  "계약서시안" TEXT,
  "은행명" TEXT,
  "계좌번호" TEXT,
  "계좌명의자명" TEXT,
  "대표자생년월일" TEXT,
  "대표자신분증URL" TEXT,
  "통신서비스이용증명원URL" TEXT,
  "신용카드앞면URL" TEXT,
  "로고예시디자인URL" TEXT,
  "로고예시디자인2URL" TEXT,
  "인쇄물받을주소" TEXT,
  "받는분이름" TEXT,
  "수령연락처" TEXT,
  "우편번호" TEXT,
  "isComplete" INTEGER NOT NULL DEFAULT 0 CHECK ("isComplete" IN (0, 1)),
  "completedAt" INTEGER,
  "시안예정일" INTEGER,
  "submissionStatus" TEXT NOT NULL DEFAULT '작성중',
  "progressPercentage" INTEGER NOT NULL DEFAULT '0',
  "lastAutoSaveAt" INTEGER,
  "autoSaveData" TEXT CHECK ("autoSaveData" IS NULL OR json_valid("autoSaveData")),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE "workflows" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT '대기',
  "자료제출일" INTEGER,
  "시안업로드일" INTEGER,
  "발주요청일" INTEGER,
  "발주승인일" INTEGER,
  "예상발주일" INTEGER,
  "예상도착일" TEXT,
  "제작완료일" INTEGER,
  "발송일" INTEGER,
  "시안URL" TEXT,
  "택배회사" TEXT,
  "운송장번호" TEXT,
  "수정횟수" INTEGER NOT NULL DEFAULT '0',
  "다운로드횟수" INTEGER NOT NULL DEFAULT '0',
  "시안이력" TEXT CHECK ("시안이력" IS NULL OR json_valid("시안이력")),
  "feedback" TEXT,
  "feedbackDate" INTEGER,
  "feedbackRead" INTEGER NOT NULL DEFAULT 0 CHECK ("feedbackRead" IN (0, 1)),
  "isDraft" INTEGER NOT NULL DEFAULT 1 CHECK ("isDraft" IN (0, 1)),
  "draftSavedAt" INTEGER,
  "확정배송지" TEXT,
  "확정수령인" TEXT,
  "확정수령연락처" TEXT,
  "확정동의항목" TEXT CHECK ("확정동의항목" IS NULL OR json_valid("확정동의항목")),
  "확정일시" INTEGER,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "workflows_userId_type_key_unique" ON "workflows" ("userId", "type");
CREATE INDEX "workflows_userId_idx" ON "workflows" ("userId");
CREATE INDEX "workflows_type_idx" ON "workflows" ("type");
CREATE INDEX "workflows_status_idx" ON "workflows" ("status");

CREATE TABLE "design_threads" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "workflowId" TEXT UNIQUE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "currentVersion" INTEGER NOT NULL DEFAULT '0',
  "confirmedAt" INTEGER,
  "confirmedByName" TEXT,
  "finalFileUrl" TEXT,
  "finalFileName" TEXT,
  "finalFileUploadedAt" INTEGER,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("workflowId") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "design_threads_status_idx" ON "design_threads" ("status");

CREATE TABLE "design_final_files" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "threadId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER,
  "fileUrl" TEXT NOT NULL,
  "uploadedBy" TEXT,
  "uploadedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("threadId") REFERENCES "design_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "design_final_files_threadId_idx" ON "design_final_files" ("threadId");

CREATE TABLE "design_thread_messages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "threadId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorType" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" TEXT CHECK ("attachments" IS NULL OR (json_valid("attachments") AND json_type("attachments") = 'array')),
  "designVersion" INTEGER,
  "designUrl" TEXT,
  "isReadByAdmin" INTEGER NOT NULL DEFAULT 0 CHECK ("isReadByAdmin" IN (0, 1)),
  "isReadByUser" INTEGER NOT NULL DEFAULT 0 CHECK ("isReadByUser" IN (0, 1)),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("threadId") REFERENCES "design_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "design_thread_messages_threadId_idx" ON "design_thread_messages" ("threadId");
CREATE INDEX "design_thread_messages_createdAt_idx" ON "design_thread_messages" ("createdAt");

CREATE TABLE "workflow_logs" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "workflowId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedBy" TEXT,
  "performedByName" TEXT,
  "previousStatus" TEXT,
  "newStatus" TEXT NOT NULL,
  "metadata" TEXT CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("workflowId") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "workflow_logs_workflowId_idx" ON "workflow_logs" ("workflowId");
CREATE INDEX "workflow_logs_createdAt_idx" ON "workflow_logs" ("createdAt");

CREATE TABLE "design_history" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "workflowId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "uploadedByName" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("workflowId") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "design_history_workflowId_idx" ON "design_history" ("workflowId");
CREATE INDEX "design_history_createdAt_idx" ON "design_history" ("createdAt");

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT '전송중',
  "errorMessage" TEXT,
  "sentBy" TEXT,
  "sentByName" TEXT,
  "metadata" TEXT CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "sentAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_userId_idx" ON "notifications" ("userId");
CREATE INDEX "notifications_type_idx" ON "notifications" ("type");
CREATE INDEX "notifications_channel_idx" ON "notifications" ("channel");
CREATE INDEX "notifications_status_idx" ON "notifications" ("status");
CREATE INDEX "notifications_sentAt_idx" ON "notifications" ("sentAt");

CREATE TABLE "admins" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'operator',
  "twoFactorSecret" TEXT,
  "twoFactorEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("twoFactorEnabled" IN (0, 1)),
  "twoFactorSetupToken" TEXT UNIQUE,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);


CREATE TABLE "admin_requests" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedBy" TEXT,
  "reviewedAt" INTEGER,
  "rejectReason" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX "admin_requests_status_idx" ON "admin_requests" ("status");
CREATE INDEX "admin_requests_email_idx" ON "admin_requests" ("email");

CREATE TABLE "settings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updatedAt" INTEGER NOT NULL
);


CREATE TABLE "marketing_extension_requests" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "requestDate" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "currentEndDate" INTEGER NOT NULL,
  "newEndDate" INTEGER NOT NULL,
  "requestMessage" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedBy" TEXT,
  "reviewedAt" INTEGER,
  "adminResponse" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "marketing_extension_requests_userId_idx" ON "marketing_extension_requests" ("userId");
CREATE INDEX "marketing_extension_requests_status_idx" ON "marketing_extension_requests" ("status");
CREATE INDEX "marketing_extension_requests_requestDate_idx" ON "marketing_extension_requests" ("requestDate");

CREATE TABLE "communication_threads" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT '일반',
  "status" TEXT NOT NULL DEFAULT 'open',
  "expectedCompletionDate" INTEGER,
  "lastReplyAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "communication_threads_userId_idx" ON "communication_threads" ("userId");
CREATE INDEX "communication_threads_status_idx" ON "communication_threads" ("status");
CREATE INDEX "communication_threads_lastReplyAt_idx" ON "communication_threads" ("lastReplyAt");

CREATE TABLE "communication_messages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "threadId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorType" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" TEXT CHECK ("attachments" IS NULL OR (json_valid("attachments") AND json_type("attachments") = 'array')),
  "expectedCompletionDate" INTEGER,
  "isReadByUser" INTEGER NOT NULL DEFAULT 0 CHECK ("isReadByUser" IN (0, 1)),
  "readByUserAt" INTEGER,
  "isReadByAdmin" INTEGER NOT NULL DEFAULT 0 CHECK ("isReadByAdmin" IN (0, 1)),
  "readByAdminAt" INTEGER,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("threadId") REFERENCES "communication_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "communication_messages_threadId_idx" ON "communication_messages" ("threadId");
CREATE INDEX "communication_messages_createdAt_idx" ON "communication_messages" ("createdAt");

CREATE TABLE "announcements" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrls" TEXT DEFAULT '[]' CHECK ("imageUrls" IS NULL OR (json_valid("imageUrls") AND json_type("imageUrls") = 'array')),
  "youtubeUrl" TEXT,
  "published" INTEGER NOT NULL DEFAULT 1 CHECK ("published" IN (0, 1)),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX "announcements_published_idx" ON "announcements" ("published");
CREATE INDEX "announcements_createdAt_idx" ON "announcements" ("createdAt");

CREATE TABLE "content_tips" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "linkType" TEXT NOT NULL,
  "linkUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "category" TEXT NOT NULL,
  "subCategory" TEXT,
  "published" INTEGER NOT NULL DEFAULT 1 CHECK ("published" IN (0, 1)),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX "content_tips_published_idx" ON "content_tips" ("published");
CREATE INDEX "content_tips_category_idx" ON "content_tips" ("category");
CREATE INDEX "content_tips_createdAt_idx" ON "content_tips" ("createdAt");

CREATE TABLE "modal_dismissals" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "dismissedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("workflowId") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "modal_dismissals_userId_workflowId_key_unique" ON "modal_dismissals" ("userId", "workflowId");
CREATE INDEX "modal_dismissals_userId_expiresAt_idx" ON "modal_dismissals" ("userId", "expiresAt");

CREATE TABLE "required_field_configs" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "workflowType" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "fieldLabel" TEXT NOT NULL,
  "fieldReason" TEXT NOT NULL,
  "fieldOrder" INTEGER NOT NULL,
  "validationType" TEXT NOT NULL DEFAULT 'notEmpty',
  "minLength" INTEGER,
  "maxLength" INTEGER,
  "isActive" INTEGER NOT NULL DEFAULT 1 CHECK ("isActive" IN (0, 1)),
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "required_field_configs_workflowType_fieldName_key_unique" ON "required_field_configs" ("workflowType", "fieldName");
CREATE INDEX "required_field_configs_workflowType_isActive_idx" ON "required_field_configs" ("workflowType", "isActive");

CREATE TABLE "system_alerts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "startDate" INTEGER NOT NULL,
  "endDate" INTEGER NOT NULL,
  "isActive" INTEGER NOT NULL DEFAULT 1 CHECK ("isActive" IN (0, 1)),
  "cohortId" TEXT,
  "phoneNumber" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX "system_alerts_isActive_startDate_endDate_idx" ON "system_alerts" ("isActive", "startDate", "endDate");
CREATE INDEX "system_alerts_priority_idx" ON "system_alerts" ("priority");

CREATE TABLE "alert_dismissals" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "dismissedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("alertId") REFERENCES "system_alerts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "alert_dismissals_userId_alertId_key_unique" ON "alert_dismissals" ("userId", "alertId");
CREATE INDEX "alert_dismissals_userId_expiresAt_idx" ON "alert_dismissals" ("userId", "expiresAt");

CREATE TABLE "ad_automation_history" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actionBy" TEXT NOT NULL,
  "actionByName" TEXT NOT NULL,
  "reason" TEXT,
  "startDate" INTEGER,
  "endDate" INTEGER,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ad_automation_history_userId_idx" ON "ad_automation_history" ("userId");
CREATE INDEX "ad_automation_history_createdAt_idx" ON "ad_automation_history" ("createdAt");

CREATE TABLE "ad_automation_payments" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentDate" INTEGER NOT NULL,
  "paymentAmount" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "receiptUrl" TEXT,
  "serviceStartDate" INTEGER NOT NULL,
  "serviceEndDate" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "memo" TEXT,
  "registeredBy" TEXT NOT NULL,
  "registeredByName" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ad_automation_payments_userId_idx" ON "ad_automation_payments" ("userId");
CREATE INDEX "ad_automation_payments_paymentDate_idx" ON "ad_automation_payments" ("paymentDate");
CREATE INDEX "ad_automation_payments_status_idx" ON "ad_automation_payments" ("status");

CREATE INDEX "users_cohort_status_created_id_keyset" ON "users" ("cohortId", "status", "createdAt", "id");
CREATE INDEX "workflows_user_status_created_id_keyset" ON "workflows" ("userId", "status", "createdAt", "id");
CREATE INDEX "workflow_logs_workflow_created_id_keyset" ON "workflow_logs" ("workflowId", "createdAt", "id");
CREATE INDEX "design_history_workflow_created_id_keyset" ON "design_history" ("workflowId", "createdAt", "id");
CREATE INDEX "design_thread_messages_thread_created_id_keyset" ON "design_thread_messages" ("threadId", "createdAt", "id");
CREATE INDEX "communication_threads_user_last_reply_id_keyset" ON "communication_threads" ("userId", "lastReplyAt", "id");
CREATE INDEX "communication_threads_status_last_reply_id_keyset" ON "communication_threads" ("status", "lastReplyAt", "id");
CREATE INDEX "communication_messages_thread_created_id_keyset" ON "communication_messages" ("threadId", "createdAt", "id");
CREATE INDEX "notifications_user_created_id_keyset" ON "notifications" ("userId", "createdAt", "id");
CREATE INDEX "users_phone_idx" ON "users" ("연락처");
CREATE INDEX "design_thread_messages_thread_type_created_id_keyset" ON "design_thread_messages" ("threadId", "messageType", "createdAt", "id");
