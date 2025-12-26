import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications/notification-manager";
import { z } from "zod";
import { sendEmail, getAdminMessageEmailHTML } from "@/lib/email/resendClient";

/**
 * POST /api/admin/communication/create-thread
 *
 * 관리자가 특정 사용자에게 먼저 스레드를 생성하고 메시지 전송
 */

const createThreadSchema = z.object({
  userId: z.string().cuid("유효하지 않은 사용자 ID입니다."),
  title: z.string().min(1, "제목을 입력해주세요.").max(100, "제목은 100자 이내로 입력해주세요."),
  category: z.enum(["일반", "제작", "배송", "기타"], {
    errorMap: () => ({ message: "유효한 카테고리를 선택해주세요." }),
  }),
  content: z.string().min(1, "메시지 내용을 입력해주세요."),
  attachments: z.array(z.string().url()).optional(),
  expectedCompletionDate: z.string().optional(),
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
    const validation = createThreadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { userId, title, category, content, attachments, expectedCompletionDate } =
      validation.data;

    // 사용자 존재 확인 (이메일 수신 동의 여부 포함)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        email: true,
        이메일수신동의: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션으로 스레드 + 메시지 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. 스레드 생성
      const thread = await tx.communicationThread.create({
        data: {
          userId,
          title,
          category,
          status: "in_progress", // 관리자가 먼저 보낸 경우 진행 중 상태
          lastReplyAt: new Date(),
        },
      });

      // 2. 관리자 메시지 생성
      const message = await tx.communicationMessage.create({
        data: {
          threadId: thread.id,
          authorId: adminId,
          authorType: "admin",
          authorName: adminName,
          content,
          attachments: attachments || [],
          isReadByUser: false, // 사용자가 아직 읽지 않음
          ...(expectedCompletionDate && {
            expectedCompletionDate: new Date(expectedCompletionDate),
          }),
        },
      });

      return { thread, message };
    });

    // ✅ 실시간 알림 전송 (SSE)
    console.log("[CREATE THREAD] SSE 알림 전송 중...", userId);
    notificationManager.notifyUser(userId, {
      type: "new_message",
      data: {
        threadId: result.thread.id,
        count: 1,
        timestamp: new Date().toISOString(),
      },
    });

    // ✅ 이메일 알림 발송 (새 스레드 생성 시에만, 서비스 알림이므로 수신동의 무관)
    if (user.email) {
      try {
        console.log("[CREATE THREAD] 이메일 발송 시작:", user.email);

        const emailHtml = getAdminMessageEmailHTML({
          userName: user.이름,
          title,
          message: content,
          category,
        });

        const emailResult = await sendEmail({
          to: user.email,
          subject: `[스타트패키지] 새로운 메시지: ${title}`,
          html: emailHtml,
        });

        if (emailResult) {
          console.log("[CREATE THREAD] 이메일 알림 발송 성공:", user.email);
        } else {
          console.error("[CREATE THREAD] 이메일 알림 발송 실패 (false 반환):", user.email);
        }
      } catch (emailError) {
        // 이메일 발송 실패해도 스레드 생성은 성공으로 처리
        console.error("[CREATE THREAD] 이메일 알림 발송 에러:", emailError);
      }
    } else {
      console.log("[CREATE THREAD] 사용자 이메일 없음");
    }

    console.log("[CREATE THREAD] 스레드 생성 성공:", result.thread.id);

    return NextResponse.json({
      success: true,
      thread: result.thread,
      message: result.message,
    });
  } catch (error) {
    console.error("[CREATE THREAD] 에러:", error);
    return NextResponse.json(
      {
        error: "스레드 생성 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
