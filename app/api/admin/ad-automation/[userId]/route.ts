import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ad-automation/[userId]
 *
 * 사용자의 광고자동화 상태 조회 (관리자용)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    // 인증 확인
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 },
      );
    }

    const { userId } = await params;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        adAutomationEnabled: true,
        adAutomationStartDate: true,
        adAutomationEndDate: true,
        marketingSupportEndDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 이력 조회
    const history = await prisma.adAutomationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // 결제 이력 조회
    const payments = await prisma.adAutomationPayment.findMany({
      where: { userId },
      orderBy: { paymentDate: "desc" },
    });

    // 남은 기간 계산
    let daysRemaining = 0;
    let paymentStatus: "free" | "paid" | "expired" = "expired";

    if (user.adAutomationEnabled && user.adAutomationEndDate) {
      const now = new Date();
      const endDate = new Date(user.adAutomationEndDate);
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 결제 상태 확인
      const hasActivePayment = payments.some((p) => {
        const serviceEnd = new Date(p.serviceEndDate);
        return serviceEnd >= now && p.status === "completed";
      });

      if (hasActivePayment) {
        paymentStatus = "paid";
      } else if (daysRemaining > 0) {
        paymentStatus = "free";
      } else {
        paymentStatus = "expired";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        daysRemaining,
        paymentStatus,
        history,
        payments,
      },
    });
  } catch (error) {
    console.error("광고자동화 상태 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "광고자동화 상태 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
