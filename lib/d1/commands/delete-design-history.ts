import { z } from "zod";
import { DataServiceError, type Database } from "../database";

const inputSchema = z.object({
  adminId: z.string().min(1).max(128),
  workflowId: z.string().min(1).max(128),
  historyId: z.string().min(1).max(128),
}).strict();

export async function deleteDesignHistory(db: Database, input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new DataServiceError(400, "Invalid design history delete request");
  const data = parsed.data;
  const admin = await db.prepare('SELECT "id", "name", "role" FROM "admins" WHERE "id" = ? LIMIT 1').bind(data.adminId).first<{ id: string; name: string; role: string }>();
  if (!admin || !["super", "designer"].includes(admin.role)) throw new DataServiceError(403, "Forbidden");
  const workflow = await db.prepare('SELECT "id", "type", "status", "updatedAt" FROM "workflows" WHERE "id" = ? LIMIT 1').bind(data.workflowId).first<{ id: string; type: string; status: string; updatedAt: number }>();
  if (!workflow) throw new DataServiceError(404, "Workflow not found");
  const history = await db.prepare('SELECT "id" FROM "design_history" WHERE "id" = ? AND "workflowId" = ? LIMIT 1').bind(data.historyId, data.workflowId).first<{ id: string }>();
  if (!history) throw new DataServiceError(404, "Design history not found");
  const remaining = await db.prepare('SELECT "id", "fileUrl" FROM "design_history" WHERE "workflowId" = ? AND "id" <> ? ORDER BY "createdAt" ASC, "id" ASC LIMIT 101').bind(data.workflowId, data.historyId).all<{ id: string; fileUrl: string }>();
  if (remaining.results.length > 100) throw new DataServiceError(400, "시안 이력은 최대 100개까지 관리할 수 있습니다.");
  const newStatus = remaining.results.length === 0 ? workflow.type === "로고" ? "시안제작중" : workflow.type === "홈페이지" ? "제작 진행 중" : "시안중" : workflow.status;
  const claimId = crypto.randomUUID();
  const claimAt = Math.max(Date.now(), Number(workflow.updatedAt) + 1);
  const claimExists = 'EXISTS (SELECT 1 FROM "workflow_logs" WHERE "id" = ?)';
  const statements = [
    db.prepare(`INSERT INTO "workflow_logs" ("id", "workflowId", "action", "performedBy", "performedByName", "previousStatus", "newStatus", "metadata", "createdAt")
      SELECT ?, "id", '시안이력삭제', ?, ?, "status", "status", ?, ? FROM "workflows"
      WHERE "id" = ? AND "updatedAt" = ?
        AND EXISTS (SELECT 1 FROM "admins" WHERE "id" = ? AND "role" IN ('super', 'designer'))
        AND EXISTS (SELECT 1 FROM "design_history" WHERE "id" = ? AND "workflowId" = ?)`)
      .bind(claimId, admin.id, admin.name, JSON.stringify({ historyId: data.historyId }), claimAt, data.workflowId, workflow.updatedAt, data.adminId, data.historyId, data.workflowId),
    db.prepare(`DELETE FROM "design_history" WHERE "id" = ? AND "workflowId" = ? AND ${claimExists}`)
      .bind(data.historyId, data.workflowId, claimId),
    ...remaining.results.map((row, index) => db.prepare(`UPDATE "design_history" SET "version" = ? WHERE "id" = ? AND "workflowId" = ? AND ${claimExists}`)
      .bind(index + 1, row.id, data.workflowId, claimId)),
    db.prepare(`UPDATE "workflows" SET "시안URL" = ?, "수정횟수" = ?, "status" = ?, "updatedAt" = ? WHERE "id" = ? AND ${claimExists}`)
      .bind(remaining.results.at(-1)?.fileUrl ?? null, Math.max(remaining.results.length - 1, 0), newStatus, claimAt, data.workflowId, claimId),
  ];
  const result = await db.batch(statements);
  if (result.some((item) => !item.success) || result[0]?.meta.changes !== 1 || result[1]?.meta.changes !== 1 || result.at(-1)?.meta.changes !== 1) throw new DataServiceError(409, "Design history changed; reload before deleting");
  return { success: true, message: "시안이 삭제되었습니다.", remainingCount: remaining.results.length };
}
