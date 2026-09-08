import { DataServiceError, type Database } from "../database";

export type CreateDesignThreadInput = {
  adminId: string;
  adminName: string;
  userId: string;
  workflowType: string;
  designUrl?: string;
  message: string;
  communicationThreadId?: string;
  now?: number;
  createId?: () => string;
};

function required(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2000) throw new DataServiceError(400, `${name} is required`);
  return value.trim();
}

export async function createDesignThread(db: Database, input: CreateDesignThreadInput): Promise<Record<string, unknown>> {
  const userId = required(input.userId, "userId");
  const workflowType = required(input.workflowType, "workflowType");
  const message = required(input.message, "message");
  const adminId = required(input.adminId, "adminId");
  const adminName = required(input.adminName, "adminName");
  const user = await db.prepare('SELECT "id", "이름" FROM "users" WHERE "id" = ? LIMIT 1').bind(userId).first();
  if (!user) throw new DataServiceError(404, "User not found");
  if (input.designUrl !== undefined && (typeof input.designUrl !== "string" || !/^https?:\/\//.test(input.designUrl))) throw new DataServiceError(400, "Invalid design URL");
  const timestamp = input.now ?? Date.now();
  const makeId = input.createId ?? (() => crypto.randomUUID());
  const workflowId = makeId();
  const designThreadId = makeId();
  const designMessageId = makeId();
  const communicationMessageId = makeId();
  const hasDesignFile = Boolean(input.designUrl?.trim());
  const existingWorkflow = await db.prepare('SELECT * FROM "workflows" WHERE "userId" = ? AND "type" = ? LIMIT 1').bind(userId, workflowType).first<Record<string, unknown>>();
  let workflow = existingWorkflow;
  let designThread = existingWorkflow ? await db.prepare('SELECT * FROM "design_threads" WHERE "workflowId" = ? LIMIT 1').bind(String(existingWorkflow.id)).first<Record<string, unknown>>() : null;
  const needsDesignThread = !designThread;
  if (needsDesignThread) designThread = { id: designThreadId, workflowId: existingWorkflow?.id ?? workflowId, currentVersion: 0 };
  const actualWorkflowId = String(workflow?.id ?? workflowId);
  const actualThreadId = String(designThread?.id ?? designThreadId);
  const currentVersion = Number(designThread?.currentVersion ?? 0);
  const version = hasDesignFile ? currentVersion + 1 : currentVersion;
  if (input.communicationThreadId) {
    const communicationThread = await db.prepare('SELECT "id", "userId" FROM "communication_threads" WHERE "id" = ? LIMIT 1').bind(input.communicationThreadId).first<Record<string, unknown>>();
    if (!communicationThread || communicationThread.userId !== userId) throw new DataServiceError(404, "Communication thread not found");
  }
  const statements = [];
  if (!existingWorkflow) statements.push(db.prepare('INSERT INTO "workflows" ("id", "userId", "type", "status", "자료제출일", "시안업로드일", "isDraft", "createdAt", "updatedAt") VALUES (?, ?, ?, \'시안중\', ?, ?, 0, ?, ?)').bind(workflowId, userId, workflowType, timestamp, hasDesignFile ? timestamp : null, timestamp, timestamp));
  if (needsDesignThread) statements.push(db.prepare('INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').bind(actualThreadId, actualWorkflowId, hasDesignFile ? "uploaded" : "pending", version, timestamp, timestamp));
  statements.push(db.prepare('INSERT INTO "design_thread_messages" ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "designVersion", "designUrl", "isReadByAdmin", "isReadByUser", "createdAt") VALUES (?, ?, ?, \'admin\', ?, ?, ?, \'[]\', ?, ?, 1, 0, ?)').bind(designMessageId, actualThreadId, adminId, adminName, hasDesignFile ? "design_upload" : "message", message, hasDesignFile ? version : null, hasDesignFile ? (input.designUrl ?? null) : null, timestamp));
  if (!needsDesignThread) statements.push(db.prepare('UPDATE "design_threads" SET "status" = ?, "currentVersion" = ?, "updatedAt" = ? WHERE "id" = ?').bind(hasDesignFile ? "uploaded" : "pending", version, timestamp, actualThreadId));
  statements.push(db.prepare('UPDATE "workflows" SET "status" = \'시안중\', "시안URL" = COALESCE(?, "시안URL"), "시안업로드일" = COALESCE(?, "시안업로드일"), "updatedAt" = ? WHERE "id" = ?').bind(hasDesignFile ? (input.designUrl ?? null) : null, hasDesignFile ? timestamp : null, timestamp, actualWorkflowId));
  if (input.communicationThreadId) {
    statements.push(db.prepare('INSERT INTO "communication_messages" ("id", "threadId", "authorId", "authorType", "authorName", "content", "attachments", "isReadByUser", "createdAt") SELECT ?, "id", ?, \'admin\', ?, ?, \'[]\', 0, ? FROM "communication_threads" WHERE "id" = ?').bind(communicationMessageId, adminId, adminName, `[시안 등록 완료]\n${workflowType} 시안이 등록되었습니다.\n\n시안 확인 페이지에서 확인해주세요.\n👉 대시보드 > 시안 확인`, timestamp, input.communicationThreadId));
    statements.push(db.prepare('UPDATE "communication_threads" SET "lastReplyAt" = ?, "status" = \'in_progress\', "updatedAt" = ? WHERE "id" = ?').bind(timestamp, timestamp, input.communicationThreadId));
  }
  try { await db.batch(statements); } catch { throw new DataServiceError(409, "Design thread is stale or could not be committed"); }
  workflow = await db.prepare('SELECT * FROM "workflows" WHERE "id" = ?').bind(actualWorkflowId).first();
  designThread = await db.prepare('SELECT * FROM "design_threads" WHERE "id" = ?').bind(actualThreadId).first();
  const savedMessage = await db.prepare('SELECT * FROM "design_thread_messages" WHERE "id" = ?').bind(designMessageId).first();
  return { success: true, isNewWorkflow: !existingWorkflow, workflow, designThread, message: savedMessage };
}
