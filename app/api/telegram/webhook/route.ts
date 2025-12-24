import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications/notification-manager";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""; // 관리자 채널 ID

// 텔레그램 웹훅 처리
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[TELEGRAM WEBHOOK] 수신:", JSON.stringify(body, null, 2));

    // 메시지가 있는지 확인
    const message = body.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id?.toString();
    const text = message.text || "";
    const replyToMessage = message.reply_to_message;

    // 관리자 채널에서 온 메시지만 처리
    if (chatId !== TELEGRAM_CHAT_ID) {
      console.log("[TELEGRAM WEBHOOK] 관리자 채널이 아님:", chatId);
      return NextResponse.json({ ok: true });
    }

    // 답장(reply)인 경우에만 처리
    if (!replyToMessage) {
      console.log("[TELEGRAM WEBHOOK] 답장이 아님");
      return NextResponse.json({ ok: true });
    }

    // 원본 메시지에서 스레드 ID 추출
    // 형식: 🔔 <b>새 문의</b> 또는 💬 <b>문의 답글</b>
    // 스레드 ID를 메시지에 포함시켜야 함
    const originalText = replyToMessage.text || "";

    // 스레드 ID 패턴 찾기: [ID: xxxxx]
    const threadIdMatch = originalText.match(/\[ID: ([a-zA-Z0-9]+)\]/);

    if (!threadIdMatch) {
      // 스레드 ID가 없으면 제목으로 검색 시도
      const titleMatch = originalText.match(/제목: (.+?)(\n|$)/);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const thread = await prisma.communicationThread.findFirst({
          where: { title },
          orderBy: { createdAt: "desc" },
        });

        if (thread) {
          await createAdminReply(thread.id, text, thread);
          return NextResponse.json({ ok: true, message: "답변 등록됨" });
        }
      }

      console.log("[TELEGRAM WEBHOOK] 스레드 ID를 찾을 수 없음");
      return NextResponse.json({ ok: true });
    }

    const threadId = threadIdMatch[1];

    // 스레드 확인
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
      include: {
        user: {
          select: { 이름: true, telegramChatId: true },
        },
      },
    });

    if (!thread) {
      console.log("[TELEGRAM WEBHOOK] 스레드를 찾을 수 없음:", threadId);
      return NextResponse.json({ ok: true });
    }

    await createAdminReply(threadId, text, thread);

    return NextResponse.json({ ok: true, message: "답변 등록됨" });
  } catch (error) {
    console.error("[TELEGRAM WEBHOOK] 에러:", error);
    return NextResponse.json({ ok: true }); // 텔레그램은 항상 200 응답 필요
  }
}

async function createAdminReply(threadId: string, content: string, thread: any) {
  // 관리자 메시지 생성
  const message = await prisma.communicationMessage.create({
    data: {
      threadId,
      authorId: "telegram-admin",
      authorType: "admin",
      authorName: "관리자",
      content,
      attachments: [],
    },
  });

  // 스레드 lastReplyAt 업데이트
  await prisma.communicationThread.update({
    where: { id: threadId },
    data: {
      lastReplyAt: new Date(),
      status: "in_progress",
    },
  });

  // SSE 알림 전송
  notificationManager.notifyUser(thread.userId, {
    type: "new_message",
    data: {
      threadId,
      count: 1,
      timestamp: new Date().toISOString(),
    },
  });

  // 사용자에게 텔레그램 알림 (telegramChatId가 있는 경우)
  if (thread.user?.telegramChatId) {
    try {
      const escapeHtml = (text: string) =>
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: thread.user.telegramChatId,
            text: `💬 <b>관리자 답변</b>\n\n<b>제목:</b> ${escapeHtml(thread.title)}\n\n<b>내용:</b>\n${escapeHtml(content)}`,
            parse_mode: "HTML",
          }),
        }
      );
    } catch (error) {
      console.error("사용자 텔레그램 알림 실패:", error);
    }
  }

  // 슬랙 채널에도 기록
  try {
    const user = await prisma.user.findUnique({
      where: { id: thread.userId },
      select: { slackChannelId: true },
    });

    if (user?.slackChannelId) {
      const { postMessage } = await import("@/lib/notification/slackClient");
      await postMessage({
        channelId: user.slackChannelId,
        text: `💬 관리자 답글 (텔레그램): ${thread.title}`,
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
                text: `📱 텔레그램에서 답변 · 📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
              },
            ],
          },
        ],
      });
    }
  } catch (error) {
    console.error("슬랙 기록 실패:", error);
  }

  console.log("[TELEGRAM WEBHOOK] 답변 등록 완료:", threadId);
}

// 웹훅 설정 확인용 GET
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Telegram webhook endpoint"
  });
}
