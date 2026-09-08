CREATE INDEX IF NOT EXISTS "content_tips_published_created_id" ON "content_tips" ("published", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "content_tips_published_category_created_id" ON "content_tips" ("published", "category", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "content_tips_published_category_subcategory_created_id" ON "content_tips" ("published", "category", "subCategory", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "announcements_published_created_id" ON "announcements" ("published", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "cohorts_active_created_id" ON "cohorts" ("isActive", "createdAt" DESC, "id" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "marketing_extension_requests_pending_user_unique" ON "marketing_extension_requests" ("userId") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "alert_dismissals_user_alert_expires" ON "alert_dismissals" ("userId", "alertId", "expiresAt");
