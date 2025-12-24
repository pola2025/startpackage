import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications/notification-manager";

// POST: 관리자 답글 작성
export async function POST(request: Request) {
  console.log("[REPLY API] 요청 받음");

  try {
    const session = await auth();
    console.log("[REPLY API] Session:", session?.user);

    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      console.log("[REPLY API] 권한 없음:", userRole);
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const adminName = (session.user as any).name || (session.user as any).이름;

    const body = await request.json();
    console.log("[REPLY API] Body:", body);

    const { threadId, content, attachments, expectedCompletionDate } = body;

    if (!threadId || !content) {
      console.log("[REPLY API] threadId 또는 content 없음");
      return NextResponse.json(
        { error: "스레드 ID와 내용을 입력해주세요" },
        { status: 400 }
      );
    }

    // 스레드 확인
    console.log("[REPLY API] 스레드 조회:", threadId);
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
      include: {
        user: {
          select: {
            이름: true,
            email: true,
            연락처: true,
          },
        },
      },
    });

    if (!thread) {
      console.log("[REPLY API] 스레드 찾을 수 없음");
      return NextResponse.json({ error: "스레드를 찾을 수 없습니다" }, { status: 404 });
    }

    console.log("[REPLY API] 메시지 생성 중...");
    // 관리자 메시지 생성
    const message = await prisma.communicationMessage.create({
      data: {
        threadId,
        authorId: adminId,
        authorType: "admin",
        authorName: adminName,
        content,
        attachments: attachments || [],
        ...(expectedCompletionDate && {
          expectedCompletionDate: new Date(expectedCompletionDate),
        }),
      },
    });

    console.log("[REPLY API] 스레드 업데이트 중...");
    // 스레드 lastReplyAt 업데이트
    await prisma.communicationThread.update({
      where: { id: threadId },
      data: {
        lastReplyAt: new Date(),
        status: "in_progress",
      },
    });

    // ✅ 실시간 알림 전송 (SSE)
    console.log("[REPLY API] SSE 알림 전송 중...", thread.userId);
    notificationManager.notifyUser(thread.userId, {
      type: "new_message",
      data: {
        threadId,
        count: 1,
        timestamp: new Date().toISOString(),
      },
    });

    // 사용자에게 텔레그램 알림
    try {
      const userForTelegram = await prisma.user.findUnique({
        where: { id: thread.userId },
        select: { telegramChatId: true, 이름: true },
      });

      if (userForTelegram?.telegramChatId) {
        const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
        const escapeHtml = (text: string) =>
          text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        await sendTelegramMessage(
          `💬 <b>관리자 답변</b>\n\n<b>제목:</b> ${escapeHtml(thread.title)}\n\n<b>내용:</b>\n${escapeHtml(content)}`,
          userForTelegram.telegramChatId
        );
      }
    } catch (error) {
      console.error("텔레그램 사용자 알림 실패:", error);
    }

    // 관리자에게도 텔레그램 알림 (기록용)
    try {
      const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
      const escapeHtml = (text: string) =>
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      await sendTelegramMessage(
        `📤 <b>관리자 답변 발송</b>\n\n<b>사용자:</b> ${escapeHtml(thread.user?.이름 || "")}\n<b>제목:</b> ${escapeHtml(thread.title)}\n\n<b>내용:</b>\n${escapeHtml(content)}`
      );
    } catch (error) {
      console.error("텔레그램 관리자 알림 실패:", error);
    }

    // 슬랙 채널에 관리자 답글 기록
    try {
      const user = await prisma.user.findUnique({
        where: { id: thread.userId },
        select: { slackChannelId: true },
      });

      if (user?.slackChannelId) {
        const { postMessage } = await import("@/lib/notification/slackClient");
        await postMessage({
          channelId: user.slackChannelId,
          text: `💬 관리자 답글: ${thread.title}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `💬 *관리자 답글* (${thread.title})`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: content,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `👤 ${adminName} · 📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error("슬랙 관리자 답글 기록 실패:", error);
    }

    console.log("[REPLY API] 성공");
    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("[REPLY API] 에러:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
