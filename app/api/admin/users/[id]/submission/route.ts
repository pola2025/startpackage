import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { maskSubmissionSecretsDeep } from "@/lib/security/submission-secrets";

function noStoreJson(body: unknown) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id: userId } = await params;

    if (isD1RuntimeEnabled()) {
      const submission = await callDataService<Record<string, unknown> | null>("admin-domain/submission-admin-get", { adminId: (session.user as { id: string }).id, userId });
      return noStoreJson(maskSubmissionSecretsDeep(submission));
    }

    // 사용자의 submission 정보 조회
    const submission = await prisma.submission.findUnique({
      where: { userId },
    });

    if (!submission) {
      return noStoreJson(null);
    }

    return noStoreJson(maskSubmissionSecretsDeep(submission));
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("제출 정보 조회 에러:", error);
    return NextResponse.json(
      { error: "제출 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
