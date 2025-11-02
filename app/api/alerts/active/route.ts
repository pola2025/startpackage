import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/alerts/active
 *
 * 현재 활성화된 알림 조회
 * - 표시 기간 내에 있는 알림
 * - 사용자가 24시간 숨김하지 않은 알림
 * - 우선순위 높은 순서대로 정렬
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = new Date();

    // 1. 사용자가 24시간 내에 숨긴 알림 ID 조회
    const dismissedAlerts = await prisma.alertDismissal.findMany({
      where: {
        userId,
        expiresAt: {
          gte: now, // 아직 만료되지 않은 숨김 기록
        },
      },
      select: {
        alertId: true,
      },
    });

    const dismissedAlertIds = dismissedAlerts.map((d) => d.alertId);

    // 2. 활성화된 알림 조회 (숨긴 알림 제외)
    const alerts = await prisma.systemAlert.findMany({
      where: {
        isActive: true,
        startDate: {
          lte: now, // 시작일이 현재보다 이전
        },
        endDate: {
          gte: now, // 종료일이 현재보다 이후
        },
        id: {
          notIn: dismissedAlertIds, // 숨긴 알림 제외
        },
      },
      orderBy: {
        priority: "desc", // 우선순위 높은 순
      },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        priority: true,
      },
    });

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error("활성 알림 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
