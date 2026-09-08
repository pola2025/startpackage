import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

/**
 * POST /api/admin/communication/mark-read
 *
 * 특정 스레드의 모든 사용자 메시지를 읽음 처리 (관리자)
 */

const markReadSchema = z.object({
  threadId: z.string().cuid("유효하지 않은 스레드 ID입니다."),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = markReadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { threadId } = validation.data;
    if (isD1RuntimeEnabled()) return NextResponse.json(await callDataService("communication-domain/admin-mark-read", { adminId: (session.user as any).id, threadId }));

    // 스레드 존재 확인
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "스레드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 해당 스레드의 모든 사용자 메시지를 읽음 처리
    const result = await prisma.communicationMessage.updateMany({
      where: {
        threadId,
        authorType: "user",
        isReadByAdmin: false,
      },
      data: {
        isReadByAdmin: true,
        readByAdminAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedCount: result.count,
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("❌ 관리자 메시지 읽음 처리 실패:", error);
    return NextResponse.json(
      { error: "메시지 읽음 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
