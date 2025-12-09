import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications/notification-manager";
import { z } from "zod";

/**
 * POST /api/admin/communication/create-design-thread
 *
 * 관리자가 수료생(또는 일반 사용자)의 문의에 대해
 * 시안 워크플로우 + 시안 쓰레드를 생성하고 시안을 업로드
 */

const createDesignThreadSchema = z.object({
  userId: z.string().cuid("유효하지 않은 사용자 ID입니다."),
  workflowType: z.enum(["로고", "명함", "리플렛", "현수막", "배너", "기타"], {
    errorMap: () => ({ message: "유효한 워크플로우 타입을 선택해주세요." }),
  }),
  designUrl: z.string().url("유효한 시안 URL을 입력해주세요."),
  message: z.string().min(1, "시안 설명을 입력해주세요."),
  communicationThreadId: z.string().cuid().optional(), // 연결할 문의하기 스레드 ID (선택)
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const adminName = (session.user as any).name || (session.user as any).이름;

    const body = await request.json();
    const validation = createDesignThreadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { userId, workflowType, designUrl, message, communicationThreadId } =
      validation.data;

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 기존 워크플로우 확인 (동일 타입이 있는지)
    const existingWorkflow = await prisma.workflow.findUnique({
      where: {
        userId_type: {
          userId,
          type: workflowType,
        },
      },
      include: {
        designThread: true,
      },
    });

    let workflow;
    let designThread;
    let isNewWorkflow = false;

    if (existingWorkflow) {
      // 기존 워크플로우가 있으면 사용
      workflow = existingWorkflow;

      if (existingWorkflow.designThread) {
        // 기존 시안 쓰레드가 있으면 사용
        designThread = existingWorkflow.designThread;
      } else {
        // 시안 쓰레드가 없으면 생성
        designThread = await prisma.designThread.create({
          data: {
            workflowId: workflow.id,
            status: "uploaded",
            currentVersion: 1,
          },
        });
      }
    } else {
      // 새 워크플로우 + 시안 쓰레드 생성
      isNewWorkflow = true;

      const result = await prisma.$transaction(async (tx) => {
        // 1. 워크플로우 생성
        const newWorkflow = await tx.workflow.create({
          data: {
            userId,
            type: workflowType,
            status: "시안중",
            자료제출일: new Date(),
            시안업로드일: new Date(),
            isDraft: false,
          },
        });

        // 2. 시안 쓰레드 생성
        const newDesignThread = await tx.designThread.create({
          data: {
            workflowId: newWorkflow.id,
            status: "uploaded",
            currentVersion: 1,
          },
        });

        return { workflow: newWorkflow, designThread: newDesignThread };
      });

      workflow = result.workflow;
      designThread = result.designThread;
    }

    // 시안 메시지 생성 (디자인 업로드)
    const newVersion = designThread.currentVersion || 1;

    const designMessage = await prisma.designThreadMessage.create({
      data: {
        threadId: designThread.id,
        authorId: adminId,
        authorType: "admin",
        authorName: adminName,
        messageType: "design_upload",
        content: message,
        attachments: [],
        designVersion: newVersion,
        designUrl: designUrl,
        isReadByAdmin: true,
        isReadByUser: false,
      },
    });

    // 시안 쓰레드 상태 업데이트
    await prisma.designThread.update({
      where: { id: designThread.id },
      data: {
        status: "uploaded",
        currentVersion: newVersion,
        updatedAt: new Date(),
      },
    });

    // 워크플로우 상태 업데이트
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        status: "시안중",
        시안URL: designUrl,
        시안업로드일: new Date(),
      },
    });

    // 문의하기 스레드가 연결되어 있으면 답글 추가
    if (communicationThreadId) {
      await prisma.communicationMessage.create({
        data: {
          threadId: communicationThreadId,
          authorId: adminId,
          authorType: "admin",
          authorName: adminName,
          content: `[시안 등록 완료]\n${workflowType} 시안이 등록되었습니다.\n\n시안 확인 페이지에서 확인해주세요.\n👉 대시보드 > 시안 확인`,
          attachments: [],
          isReadByUser: false,
        },
      });

      // 문의하기 스레드 업데이트
      await prisma.communicationThread.update({
        where: { id: communicationThreadId },
        data: {
          lastReplyAt: new Date(),
          status: "in_progress",
        },
      });
    }

    // ✅ 실시간 알림 전송 (SSE) - "new_message" 타입으로 클라이언트 새로고침 트리거
    console.log("[CREATE DESIGN THREAD] SSE 알림 전송 중...", userId);
    notificationManager.notifyUser(userId, {
      type: "new_message",
      data: {
        threadId: designThread.id,
        count: 1,
        timestamp: new Date().toISOString(),
      },
    });

    console.log("[CREATE DESIGN THREAD] 시안 쓰레드 생성 성공:", designThread.id);

    return NextResponse.json({
      success: true,
      isNewWorkflow,
      workflow: {
        id: workflow.id,
        type: workflow.type,
        status: workflow.status,
      },
      designThread: {
        id: designThread.id,
        status: designThread.status,
        currentVersion: newVersion,
      },
      message: designMessage,
    });
  } catch (error) {
    console.error("[CREATE DESIGN THREAD] 에러:", error);
    return NextResponse.json(
      {
        error: "시안 쓰레드 생성 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
