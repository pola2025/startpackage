import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { maskSubmissionSecretsDeep } from "@/lib/security/submission-secrets";

// GET: 홈페이지 관리용 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (
      !session ||
      !["super", "designer", "operator"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isD1RuntimeEnabled()) {
      const params = new URL(request.url).searchParams;
      const result = await callDataService<{ items: Array<Record<string, unknown>>; nextCursor?: string }>("admin-domain/homepage-users-list", { adminId: session.user.id, pageSize: params.get("pageSize") ?? undefined, cursor: params.get("cursor") ?? undefined });
      return NextResponse.json(maskSubmissionSecretsDeep(result.items), result.nextCursor ? { headers: { "X-Next-Cursor": result.nextCursor } } : undefined);
    }

    const users = await prisma.user.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        이름: true,
        email: true,
        연락처: true,
        homepageCompleted: true,
        cohort: {
          select: {
            id: true,
            name: true,
          },
        },
        submission: {
          select: {
            브랜드명: true,
            홈페이지제작방식: true,
            홈페이지스타일: true,
            홈페이지컬러컨셉: true,
            도메인주소: true,
            도메인관리사이트: true,
            도메인관리ID: true,
            도메인관리PW: true,
            GmailID: true,
            GmailPW: true,
          },
        },
        workflows: {
          where: {
            type: "홈페이지",
          },
          select: {
            id: true,
            status: true,
            시안URL: true,
            자료제출일: true,
            예상도착일: true,
            createdAt: true,
          },
          take: 1,
        },
      },
      orderBy: [{ cohort: { name: "desc" } }, { 이름: "asc" }],
    });

    // workflows 배열을 단일 객체로 변환
    const usersWithWorkflow = users.map((user) => ({
      ...user,
      homepageWorkflow: user.workflows[0] || null,
      workflows: undefined,
    }));

    return NextResponse.json(maskSubmissionSecretsDeep(usersWithWorkflow));
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("Failed to fetch homepage users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
