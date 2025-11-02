import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const dismissSchema = z.object({
  alertId: z.string().cuid(),
});

/**
 * POST /api/alerts/dismiss
 *
 * 알림 24시간 숨김 처리
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validation = dismissSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const { alertId } = validation.data;

    // 알림 존재 확인
    const alert = await prisma.systemAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: "알림을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 24시간 숨김 기록 생성 (이미 있으면 업데이트)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간 후

    await prisma.alertDismissal.upsert({
      where: {
        userId_alertId: {
          userId,
          alertId,
        },
      },
      create: {
        userId,
        alertId,
        dismissedAt: now,
        expiresAt,
      },
      update: {
        dismissedAt: now,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: "24시간 동안 이 알림이 표시되지 않습니다.",
    });
  } catch (error) {
    console.error("알림 숨김 처리 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 숨김 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
