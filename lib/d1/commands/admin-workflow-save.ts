import { z } from "zod";
import { DataServiceError, type Database, type SqlValue } from "../database";
import { decodeRow } from "../row-codec";

const dateValue = z.union([z.number().int(), z.string().datetime()]).transform(value => typeof value === "number" ? value : Date.parse(value));
const expectedArrivalValue = z.string().max(128);
const inputSchema = z.object({
  adminId: z.string().min(1).max(128),
  workflowId: z.string().min(1).max(128),
  expectedUpdatedAt: dateValue,
  homepageComplete: z.boolean(),
  changes: z.object({
    status: z.string().min(1).max(64),
    택배회사: z.string().max(128).nullable().optional(),
    운송장번호: z.string().max(128).nullable().optional(),
    시안URL: z.string().max(4096).nullable().optional(),
    feedbackRead: z.boolean().optional(),
    시안업로드일: dateValue.optional(),
    발주승인일: dateValue.optional(),
    예상도착일: expectedArrivalValue.optional(),
    제작완료일: dateValue.optional(),
    발송일: dateValue.optional(),
  }).strict(),
}).strict();

export async function saveAdminWorkflow(db: Database, input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new DataServiceError(400, "Invalid workflow update");
  const data = parsed.data;
  const admin = await db.prepare('SELECT "id", "name", "role" FROM "admins" WHERE "id" = ? LIMIT 1')
    .bind(data.adminId).first<{ id: string; name: string; role: string }>();
  if (!admin || !["super", "designer", "operator"].includes(admin.role)) throw new DataServiceError(403, "Forbidden");
  const workflow = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ? LIMIT 1')
    .bind(data.workflowId).first<Record<string, unknown>>();
  if (!workflow) throw new DataServiceError(404, "Workflow not found");
  if (Number(workflow.updatedAt) !== data.expectedUpdatedAt) throw new DataServiceError(409, "Workflow changed; reload before saving");
  if (data.homepageComplete && workflow.type !== "홈페이지") throw new DataServiceError(400, "Invalid homepage completion");
  const timestamp = Math.max(Date.now(), data.expectedUpdatedAt + 1);
  const logId = crypto.randomUUID();
  const historyId = crypto.randomUUID();
  const newDesign = Boolean(data.changes.시안URL && data.changes.시안URL !== workflow.시안URL);
  const entries = Object.entries(data.changes).filter(([, value]) => value !== undefined);
  const values: SqlValue[] = entries.map(([, value]) => typeof value === "boolean" ? Number(value) : value ?? null);
  const winner = 'EXISTS (SELECT 1 FROM "workflow_logs" WHERE "id" = ?)';
  const statements = [
    db.prepare(`INSERT INTO "workflow_logs" ("id", "workflowId", "action", "performedBy", "performedByName", "previousStatus", "newStatus", "metadata", "createdAt")
      SELECT ?, "id", '상태변경', ?, ?, "status", ?, ?, ? FROM "workflows" WHERE "id" = ? AND "updatedAt" = ?`)
      .bind(logId, admin.id, admin.name, data.changes.status, JSON.stringify({ 택배회사: data.changes.택배회사, 운송장번호: data.changes.운송장번호, 시안URL: data.changes.시안URL }), timestamp, data.workflowId, data.expectedUpdatedAt),
    db.prepare(`UPDATE "workflows" SET ${entries.map(([key]) => `"${key}" = ?`).join(", ")}, "updatedAt" = ? WHERE "id" = ? AND ${winner}`)
      .bind(...values, timestamp, data.workflowId, logId),
  ];
  if (data.homepageComplete) statements.push(db.prepare(`UPDATE "users" SET "homepageCompleted" = 1, "homepageCompletedAt" = ?, "updatedAt" = ? WHERE "id" = ? AND ${winner}`)
    .bind(timestamp, timestamp, String(workflow.userId), logId));
  if (newDesign) statements.push(db.prepare(`INSERT INTO "design_history" ("id", "workflowId", "version", "fileUrl", "uploadedBy", "uploadedByName", "createdAt")
    SELECT ?, ?, COALESCE((SELECT "version" FROM "design_history" WHERE "workflowId" = ? ORDER BY "version" DESC LIMIT 1), 0) + 1, ?, ?, ?, ? WHERE ${winner}`)
    .bind(historyId, data.workflowId, data.workflowId, data.changes.시안URL ?? null, admin.id, admin.name, timestamp, logId));
  const results = await db.batch(statements);
  if (results.some(result => !result.success)) throw new DataServiceError(503, "Workflow update failed");
  if (results[0].meta.changes !== 1) throw new DataServiceError(409, "Workflow changed; reload before saving");
  const updated = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ?').bind(data.workflowId).first<Record<string, unknown>>();
  const user = await db.prepare('SELECT "이름", "연락처", "email", "slackChannelId" FROM "users" WHERE "id" = ?').bind(String(workflow.userId)).first();
  const history = newDesign ? await db.prepare('SELECT "version" FROM "design_history" WHERE "id" = ?').bind(historyId).first() : null;
  const savedWorkflow: Record<string, unknown> = { ...decodeRow("workflows", updated ?? {}), user };
  return { workflow: savedWorkflow, history };
}
