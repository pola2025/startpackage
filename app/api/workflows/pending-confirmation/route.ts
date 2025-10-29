import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/workflows/pending-confirmation
 *
 * 사용자의 컨펌 대기 중인 시안 목록 조회
 * - 24시간 숨김 처리된 시안 제외
 * - 디자인이 업로드되었지만 아직 확인하지 않은 시안만
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const now = new Date();

    // 1. 현재 시각 기준 만료되지 않은 숨김 목록 조회
    const dismissedWorkflowIds = await prisma.modalDismissal.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
      select: {
        workflowId: true,
      },
    });

    const dismissedIds = dismissedWorkflowIds.map((d) => d.workflowId);

    // 2. 컨펌 대기 중인 워크플로우 조회
    const pendingWorkflows = await prisma.workflow.findMany({
      where: {
        userId,
        status: "시안중", // 시안 업로드 완료 상태
        시안URL: {
          not: null, // 시안 URL이 존재하는 경우만
        },
        id: {
          notIn: dismissedIds, // 숨김 처리된 시안 제외
        },
      },
      select: {
        id: true,
        type: true,
        시안URL: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "asc", // 오래된 순서대로 (먼저 업로드된 시안부터)
      },
    });

    return NextResponse.json({
      success: true,
      workflows: pendingWorkflows,
      count: pendingWorkflows.length,
    });
  } catch (error) {
    console.error("❌ 컨펌 대기 시안 조회 실패:", error);
    return NextResponse.json(
      { error: "시안 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
