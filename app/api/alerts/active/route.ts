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
 * - cohortId가 있는 알림은 해당 기수 사용자에게만 노출
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const now = new Date();

    // 1. 사용자의 기수(cohortId) 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true },
    });
    const userCohortId = user?.cohortId ?? null;

    // 2. 사용자가 24시간 내에 숨긴 알림 ID 조회
    const dismissedAlerts = await prisma.alertDismissal.findMany({
      where: {
        userId,
        expiresAt: { gte: now },
      },
      select: { alertId: true },
    });
    const dismissedAlertIds = dismissedAlerts.map((d) => d.alertId);

    // 3. 활성화된 알림 조회
    //    - cohortId가 null인 알림 → 전체 공개
    //    - cohortId가 있는 알림 → 해당 기수 사용자에게만 노출
    const alerts = await prisma.systemAlert.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        id: { notIn: dismissedAlertIds },
        OR: [{ cohortId: null }, { cohortId: userCohortId ?? "" }],
      },
      orderBy: { priority: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        priority: true,
        cohortId: true,
        phoneNumber: true,
        endDate: true,
      },
    });

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error("활성 알림 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
