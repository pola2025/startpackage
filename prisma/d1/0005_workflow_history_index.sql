CREATE INDEX IF NOT EXISTS "design_history_workflow_version_id" ON "design_history" ("workflowId", "version" DESC, "id" DESC);
