import {
  buildConfirmSnapshot,
  validateConfirmPayload,
  type ShippingSnapshot,
} from "@/lib/design-confirm";
import { isShippingPolicyCohort } from "@/lib/shipping-policy";
import { DataServiceError, type Database, type SqlValue } from "@/lib/d1/database";

export type ConfirmInput = {
  userId: string;
  threadId: string;
  message?: string | null;
  shipping: ShippingSnapshot | null;
  agreements: string[];
};

type ThreadRead = {
  id: string;
  workflowId: string;
  status: string;
  currentVersion: number;
  workflowType: string;
  workflowStatus: string;
  authorName: string | null;
  cohortStart: number | string | null;
};

type DesignRead = { id: string; designUrl: string | null };

export type ConfirmDesignResult = {
  threadId: string;
  workflowId: string;
  status: "confirmed";
  workflowStatus: "발주요청";
  confirmedAt: number;
  confirmedByName: string;
  messageId: string;
};

function valueOrNull(value: string | null | undefined): SqlValue {
  return value ?? null;
}

function toEpoch(value: Date | string | number): number {
  if (typeof value === "number") return value;
  const epoch = new Date(value).getTime();
  if (!Number.isFinite(epoch)) throw new DataServiceError(400, "Invalid confirmation timestamp");
  return epoch;
}

function assertInput(input: ConfirmInput): void {
  if (!input.userId || !input.threadId) throw new DataServiceError(400, "Invalid confirmation request");
  if (!Array.isArray(input.agreements) || input.agreements.some((agreement) => typeof agreement !== "string")) {
    throw new DataServiceError(400, "Invalid confirmation agreements");
  }
}

export async function confirmDesign(
  db: Database,
  input: ConfirmInput,
): Promise<ConfirmDesignResult> {
  assertInput(input);

  const thread = await db
    .prepare(
      `SELECT
         t."id" AS "id",
         t."workflowId" AS "workflowId",
         t."status" AS "status",
         t."currentVersion" AS "currentVersion",
         w."type" AS "workflowType",
         w."status" AS "workflowStatus",
         u."이름" AS "authorName",
         c."교육시작일" AS "cohortStart"
       FROM "design_threads" t
       INNER JOIN "workflows" w ON w."id" = t."workflowId"
       INNER JOIN "users" u ON u."id" = w."userId"
       LEFT JOIN "cohorts" c ON c."id" = u."cohortId"
       WHERE t."id" = ? AND w."userId" = ?
       LIMIT 1`,
    )
    .bind(input.threadId, input.userId)
    .first<ThreadRead>();

  if (!thread) throw new DataServiceError(404, "Thread not found");
  if (thread.status === "confirmed") throw new DataServiceError(400, "Already confirmed");

  const latestDesign = await db
    .prepare(
      `SELECT "id", "designUrl"
       FROM "design_thread_messages"
       WHERE "threadId" = ? AND "messageType" = 'design_upload'
       ORDER BY "createdAt" DESC, "id" DESC
       LIMIT 1`,
    )
    .bind(input.threadId)
    .first<DesignRead>();

  if (thread.currentVersion === 0 || !latestDesign) {
    throw new DataServiceError(400, "No design to confirm");
  }

  const shippingRequired = isShippingPolicyCohort(
    thread.cohortStart === null ? null : new Date(thread.cohortStart),
  );
  const validationError = validateConfirmPayload({
    workflowType: thread.workflowType,
    shipping: input.shipping,
    agreements: input.agreements,
    shippingRequired,
  });
  if (validationError) throw new DataServiceError(400, validationError);

  const confirmedAt = Date.now();
  const confirmedByName = thread.authorName?.trim() || "사용자";
  const confirmationMessage = input.message?.trim() || `${thread.currentVersion}차 시안으로 최종 확정합니다.`;
  const snapshot = buildConfirmSnapshot({
    workflowType: thread.workflowType,
    shipping: input.shipping,
    agreements: input.agreements,
    shippingRequired,
  });
  const snapshotAt = toEpoch(snapshot.확정일시);
  const messageId = crypto.randomUUID();
  const logId = crypto.randomUUID();
  const updatedAt = confirmedAt;
  const metadata = JSON.stringify({
    confirmedVersion: thread.currentVersion,
    designUrl: latestDesign.designUrl,
    threadId: thread.id,
    확정배송지: snapshot.확정배송지,
    확정수령인: snapshot.확정수령인,
    동의항목: input.agreements,
  });

  const statements = [
    db
      .prepare(
        `INSERT INTO "design_threads" ("id", "workflowId", "status", "currentVersion", "updatedAt")
         SELECT t."id", t."workflowId", t."status", t."currentVersion", t."updatedAt"
         FROM "design_threads" t
         INNER JOIN "workflows" w ON w."id" = t."workflowId"
         WHERE t."id" = ?
           AND NOT (
             t."status" <> 'confirmed'
             AND t."workflowId" = ?
             AND t."currentVersion" = ?
             AND w."userId" = ?
             AND w."type" = ?
             AND w."status" = ?
             AND EXISTS (
               SELECT 1
               FROM "design_thread_messages" latest
               WHERE latest."id" = ?
                 AND latest."threadId" = t."id"
                 AND latest."messageType" = 'design_upload'
                 AND latest."id" = (
                   SELECT candidate."id"
                   FROM "design_thread_messages" candidate
                   WHERE candidate."threadId" = t."id" AND candidate."messageType" = 'design_upload'
                   ORDER BY candidate."createdAt" DESC, candidate."id" DESC
                   LIMIT 1
                 )
                 AND latest."designUrl" IS ?
             )
           )`,
      )
      .bind(
        thread.id,
        thread.workflowId,
        thread.currentVersion,
        input.userId,
        thread.workflowType,
        thread.workflowStatus,
        latestDesign.id,
        latestDesign.designUrl,
      ),
    db
      .prepare(
        `INSERT INTO "design_thread_messages"
          ("id", "threadId", "authorId", "authorType", "authorName", "messageType", "content", "attachments", "isReadByAdmin", "isReadByUser", "createdAt")
         VALUES (?, ?, ?, 'user', ?, 'confirmation', ?, ?, 0, 1, ?)`,
      )
      .bind(messageId, thread.id, input.userId, confirmedByName, confirmationMessage, "[]", confirmedAt),
    db
      .prepare(
        `UPDATE "design_threads"
         SET "status" = 'confirmed', "confirmedAt" = ?, "confirmedByName" = ?, "updatedAt" = ?
         WHERE "id" = ? AND "status" <> 'confirmed' AND "currentVersion" = ?`,
      )
      .bind(confirmedAt, confirmedByName, updatedAt, thread.id, thread.currentVersion),
    db
      .prepare(
        `UPDATE "workflows"
         SET "status" = '발주요청', "시안URL" = ?, "시안업로드일" = ?, "수정횟수" = ?,
             "발주요청일" = ?, "확정배송지" = ?, "확정수령인" = ?, "확정수령연락처" = ?,
             "확정동의항목" = ?, "확정일시" = ?, "updatedAt" = ?
         WHERE "id" = ? AND "status" = ?`,
      )
      .bind(
        valueOrNull(latestDesign.designUrl),
        confirmedAt,
        thread.currentVersion - 1,
        confirmedAt,
        valueOrNull(snapshot.확정배송지),
        valueOrNull(snapshot.확정수령인),
        valueOrNull(snapshot.확정수령연락처),
        JSON.stringify(snapshot.확정동의항목),
        snapshotAt,
        updatedAt,
        thread.workflowId,
        thread.workflowStatus,
      ),
    db
      .prepare(
        `INSERT INTO "workflow_logs"
          ("id", "workflowId", "action", "performedBy", "performedByName", "previousStatus", "newStatus", "metadata", "createdAt")
         VALUES (?, ?, '시안확정', ?, ?, ?, '발주요청', ?, ?)`,
      )
      .bind(logId, thread.workflowId, input.userId, confirmedByName, thread.workflowStatus, metadata, confirmedAt),
  ];

  try {
    await db.batch(statements);
  } catch (error) {
    if (error instanceof DataServiceError) throw error;
    throw new DataServiceError(409, "Confirmation is stale or could not be committed");
  }

  return {
    threadId: thread.id,
    workflowId: thread.workflowId,
    status: "confirmed",
    workflowStatus: "발주요청",
    confirmedAt,
    confirmedByName,
    messageId,
  };
}
