import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { decryptSubmissionSecrets } from "@/lib/security/submission-secrets";

function noStoreJson(body: unknown, status?: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const SECRET_FIELDS = new Set([
  "도메인관리PW", "네이버검색광고PW", "네이버클라우드PW", "InstagramPW",
  "아임웹PW", "아임웹관리자PW", "GmailPW", "해외결제카드CVC",
  "해외결제카드유효기간", "해외결제카드앞면URL", "해외결제카드뒷면URL", "신용카드앞면URL",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super") {
      return noStoreJson({ error: "권한이 없습니다." }, 403);
    }
    const { id: userId } = await params;
    const body = await request.json().catch(() => ({}));
    const field = typeof body.field === "string" ? body.field : "";
    if (!SECRET_FIELDS.has(field)) {
      return noStoreJson({ error: "확인할 민감정보 항목이 올바르지 않습니다." }, 400);
    }
    const submission = isD1RuntimeEnabled()
      ? await callDataService<Record<string, unknown> | null>("admin-domain/submission-admin-get", { adminId: session.user.id, userId })
      : await prisma.submission.findUnique({ where: { userId } });
    if (!submission) return noStoreJson({ error: "제출 정보를 찾을 수 없습니다." }, 404);
    const rawValue = (submission as Record<string, unknown>)[field];
    if (typeof rawValue !== "string" || rawValue.length === 0 || rawValue === "SLACK_ONLY") {
      return noStoreJson({ field, value: rawValue ?? null });
    }
    const value = rawValue.startsWith("spenc:v1:")
      ? decryptSubmissionSecrets({ [field]: rawValue }, userId)[field]
      : rawValue;
    console.info("[admin-sensitive-view]", { event: "admin_sensitive_view", adminId: session.user.id, userId, field, at: new Date().toISOString() });
    return noStoreJson({ field, value });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("민감정보 확인 중 오류:", error);
    return noStoreJson({ error: "민감정보 확인 중 오류가 발생했습니다." }, 500);
  }
}
