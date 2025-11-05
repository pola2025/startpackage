import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const toggleSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * POST /api/admin/ad-automation/[userId]/toggle
 *
 * 광고자동화 상태 토글 (관리자용)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 인증 확인
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session?.user || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        marketingSupportEndDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validation = toggleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "잘못된 요청입니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { enabled, reason, startDate, endDate } = validation.data;

    // 종료일 자동 설정 (마케팅 지원 종료일 사용)
    const autoEndDate =
      enabled && !endDate
        ? user.marketingSupportEndDate
        : endDate
        ? new Date(endDate)
        : null;

    const autoStartDate =
      enabled && !startDate ? new Date() : startDate ? new Date(startDate) : null;

    // 사용자 상태 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        adAutomationEnabled: enabled,
        adAutomationStartDate: autoStartDate,
        adAutomationEndDate: autoEndDate,
      },
    });

    // 이력 기록
    await prisma.adAutomationHistory.create({
      data: {
        userId,
        action: enabled ? "enabled" : "disabled",
        actionBy: session.user.id,
        actionByName: session.user.name || "관리자",
        reason: reason || (enabled ? "광고자동화 활성화" : "광고자동화 비활성화"),
        startDate: autoStartDate,
        endDate: autoEndDate,
      },
    });

    return NextResponse.json({
      success: true,
      message: enabled
        ? "광고자동화가 활성화되었습니다."
        : "광고자동화가 비활성화되었습니다.",
      data: {
        enabled: updatedUser.adAutomationEnabled,
        startDate: updatedUser.adAutomationStartDate,
        endDate: updatedUser.adAutomationEndDate,
      },
    });
  } catch (error) {
    console.error("광고자동화 토글 실패:", error);
    return NextResponse.json(
      { success: false, error: "광고자동화 상태 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
