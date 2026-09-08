import { deleteDesignHistory } from "../../lib/d1/commands/delete-design-history";
import { pruneAuthAttempts } from "../../lib/d1/commands/prune-auth-attempts";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { DataServiceError, type Database } from "../../lib/d1/database";
import { consumeLoginAttempt } from "../../lib/d1/commands/auth-attempts";
import { saveAdminWorkflow } from "../../lib/d1/commands/admin-workflow-save";
import { createReadCache, parsePageSize, ReadPolicyError } from "../../lib/d1/read-policy";
import {
  buildCommunicationMessageListQuery,
  buildCommunicationThreadListQuery,
  pageCommunicationMessages,
  pageCommunicationThreads,
} from "../../lib/d1/queries";
import { communicationOperation } from "../../lib/d1/domains/communication";
import { adminPagesOperation } from "../../lib/d1/domains/admin-pages";
import { adminOperation } from "../../lib/d1/domains/admin";
import { coreOperation } from "../../lib/d1/domains/core";
import { contentOperation } from "../../lib/d1/domains/content";
import { sharedOperation } from "../../lib/d1/domains/shared";
import { authOperation } from "../../lib/d1/domains/auth";
import { adminNotificationOperation } from "../../lib/d1/domains/admin-notifications";

export interface DataEnvironment {
  DB: Database;
  DATA_SERVICE_TOKEN: string;
  CURSOR_SECRET: string;
  SUBMISSION_ENCRYPTION_KEY?: string;
  READ_LIMITER: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

const identifier = z.string().min(1).max(128);
const pageInput = z.object({
  userId: identifier,
  pageSize: z.union([z.number(), z.string()]).optional(),
  cursor: z.string().max(2048).optional(),
}).strict();
const messageInput = pageInput.extend({ threadId: identifier });
const loginAttemptInput = z.object({ keyHash: z.string().regex(/^[a-f0-9]{64}$/), kind: z.enum(["account", "ip"]) }).strict();
const domainInput = z.record(z.string(), z.unknown());

function response(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });
}

function authorized(request: Request, secret: string): boolean {
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("Authorization") ?? "";
  if (header.length > 256) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

async function readBody(request: Request, maxBytes = 8192): Promise<unknown> {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new DataServiceError(415, "JSON required");
  }
  if (!request.body) throw new DataServiceError(400, "Body required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new DataServiceError(413, "Request too large");
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new DataServiceError(400, "Invalid JSON");
  }
}

export function createDataService() {
  const cache = createReadCache({ ttlMs: 15_000, maxEntries: 100, maxInflight: 32 });
  let active = 0;
  return {
    async fetch(request: Request, env: DataEnvironment): Promise<Response> {
      if (!authorized(request, env.DATA_SERVICE_TOKEN)) return response({ error: "Unauthorized" }, 401);
      if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
      const path = new URL(request.url).pathname;
      const domainMatch = /^\/v1\/(auth|core|content-domain|admin-domain|communication-domain|shared-domain|admin-notifications|admin-pages)\/([a-z][a-z0-9-]{0,63})$/.exec(path);
      if (!["/v1/communication/threads", "/v1/communication/messages"].includes(path) && !domainMatch) {
        return response({ error: "Unknown operation" }, 404);
      }
      if (active >= 32) return response({ error: "Too many requests" }, 429);
      active += 1;
      try {
        if (!(await env.READ_LIMITER.limit({ key: "data-service" })).success) {
          return response({ error: "Too many requests" }, 429);
        }
        const body = await readBody(request, domainMatch && domainMatch[1] !== "auth" ? 262144 : 8192);
        if (path === "/v1/auth/consume-attempts") {
          const parsedAttempt = loginAttemptInput.safeParse(body);
          if (!parsedAttempt.success) throw new DataServiceError(400, "Invalid login limit input");
          return response(await consumeLoginAttempt(env.DB, { keyHash: parsedAttempt.data.keyHash, maxFailures: parsedAttempt.data.kind === "ip" ? 50 : 5 }));
        }
        const parsed = (domainMatch ? domainInput : path.endsWith("/messages") ? messageInput : pageInput).safeParse(body);
        if (!parsed.success) throw new DataServiceError(400, "Invalid input");
        const input = parsed.data;
        if (domainMatch) {
          const domainPayload = input as Record<string, unknown>;
          const principal = typeof domainPayload.userId === "string" ? domainPayload.userId : typeof domainPayload.adminId === "string" ? domainPayload.adminId : "service";
          if (!(await env.READ_LIMITER.limit({ key: `domain:${principal}` })).success) return response({ error: "Too many requests" }, 429);
          const [, domain, operation] = domainMatch;
          if (domain === "auth") {
            if (operation === "admin-state") {
              const admin = z.object({ adminId: identifier }).safeParse(domainPayload);
              if (!admin.success) throw new DataServiceError(400, "Invalid admin input");
              return response(await authOperation(env.DB, "admin-state", admin.data));
            }
            if (["user-by-email", "user-by-phone", "admin-by-email"].includes(operation)) {
              const login = z.object({ identifier: z.string().min(1).max(320) }).safeParse(domainPayload);
              if (!login.success) throw new DataServiceError(400, "Invalid login input");
              if (operation === "user-by-email") return response(await authOperation(env.DB, "user-by-email", login.data));
              if (operation === "user-by-phone") return response(await authOperation(env.DB, "user-by-phone", login.data));
              return response(await authOperation(env.DB, "admin-by-email", login.data));
            }
            throw new DataServiceError(404, "Unknown auth operation");
          }
          if (!env.CURSOR_SECRET || env.CURSOR_SECRET.length < 32) throw new DataServiceError(503, "Service unavailable");
          if (domain === "core") return response(await coreOperation(env.DB, operation, domainPayload, { cursorSecret: env.CURSOR_SECRET, encryptionKey: env.SUBMISSION_ENCRYPTION_KEY }));
          if (domain === "content-domain") return response(await contentOperation(env.DB, operation, domainPayload, env.CURSOR_SECRET, env.SUBMISSION_ENCRYPTION_KEY));
          if (domain === "admin-domain" && operation === "design-history-delete") return response(await deleteDesignHistory(env.DB, domainPayload));
          if (domain === "admin-domain" && operation === "workflow-save") return response(await saveAdminWorkflow(env.DB, domainPayload));
          const cursorPayload = { ...domainPayload, cursorSecret: env.CURSOR_SECRET };
          if (domain === "admin-pages") return response(await adminPagesOperation(env.DB, operation, cursorPayload));
          if (domain === "admin-notifications") return response(await adminNotificationOperation(env.DB, operation, domainPayload));
          if (domain === "shared-domain") return response(await sharedOperation(env.DB, operation, cursorPayload));
          if (domain === "communication-domain") return response(await communicationOperation(env.DB, operation, cursorPayload));
          return response(await adminOperation(env.DB, operation, cursorPayload));
        }
        const legacyInput = input as z.infer<typeof pageInput> | z.infer<typeof messageInput>;
        const pageSize = parsePageSize(legacyInput.pageSize);
        if (!(await env.READ_LIMITER.limit({ key: `user:${legacyInput.userId}` })).success) {
          return response({ error: "Too many requests" }, 429);
        }
        const cursorSecret = env.CURSOR_SECRET;
        if (!cursorSecret || cursorSecret.length < 32) throw new DataServiceError(503, "Service unavailable");
        const queryInput = { ...legacyInput, pageSize, cursorSecret };
        const messageThreadId = "threadId" in legacyInput && typeof legacyInput.threadId === "string" ? legacyInput.threadId : undefined;
        const query = messageThreadId
          ? buildCommunicationMessageListQuery({ ...queryInput, threadId: messageThreadId })
          : buildCommunicationThreadListQuery(queryInput);
        const user = await env.DB.prepare('SELECT "id" FROM "users" WHERE "id" = ? LIMIT 1')
          .bind(legacyInput.userId).first();
        if (!user) throw new DataServiceError(403, "Forbidden");
        if (messageThreadId) {
          const thread = await env.DB.prepare('SELECT "id" FROM "communication_threads" WHERE "id" = ? AND "userId" = ? LIMIT 1')
            .bind(messageThreadId, legacyInput.userId).first();
          if (!thread) throw new DataServiceError(404, "Thread not found");
        }
        const rows = await cache.getOrSet({
          name: path,
          scope: legacyInput.userId,
          key: JSON.stringify([messageThreadId, pageSize, legacyInput.cursor ?? ""]),
          cacheable: true,
        }, async () => {
          const result = await env.DB.prepare(query.sql).bind(...query.params)
            .all<{ id: string; createdAt: number; lastReplyAt: number }>();
          if (!result.success) throw new DataServiceError(503, "Service unavailable");
          return result.results;
        });
        return response(messageThreadId
          ? pageCommunicationMessages(rows, pageSize, cursorSecret, messageThreadId)
          : pageCommunicationThreads(rows, pageSize, cursorSecret, legacyInput.userId));
      } catch (error) {
        if (error instanceof DataServiceError) return response({ error: error.message }, error.status);
        if (error instanceof ReadPolicyError) return response({ error: "Invalid pagination or read capacity exceeded" }, 400);
        return response({ error: "Service unavailable" }, 503);
      } finally {
        active -= 1;
      }
    },
  };
}

const dataWorker = {
  ...createDataService(),
  async scheduled(_event: unknown, env: DataEnvironment): Promise<void> {
    await pruneAuthAttempts(env.DB);
  },
};

export default dataWorker;
