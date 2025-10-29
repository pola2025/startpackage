import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * POST /api/workflows/dismiss-modal
 *
 * 시안 확인 모달 24시간 숨김 처리
 */

const dismissSchema = z.object({
  workflowId: z.string().cuid("유효하지 않은 워크플로우 ID입니다."),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = dismissSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { workflowId } = validation.data;
    const userId = (session.user as any).id;

    // 워크플로우 권한 확인
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간 후

    // 숨김 기록 생성 (기존 기록 있으면 업데이트)
    await prisma.modalDismissal.upsert({
      where: {
        userId_workflowId: {
          userId,
          workflowId,
        },
      },
      create: {
        userId,
        workflowId,
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
      message: "24시간 동안 모달이 표시되지 않습니다.",
      expiresAt,
    });
  } catch (error) {
    console.error("❌ 모달 숨김 처리 실패:", error);
    return NextResponse.json(
      { error: "모달 숨김 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
