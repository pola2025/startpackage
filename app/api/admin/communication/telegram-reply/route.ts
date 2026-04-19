import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications/notification-manager";
import { timingSafeEqual } from "crypto";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

// 텔레그램에서 답변 등록 (Cloudflare Worker에서 호출)
export async function POST(request: Request) {
  try {
    // 서버 misconfiguration 방어 — SECRET 미설정 시 강제 500 (인증 우회 차단)
    if (!WEBHOOK_SECRET) {
      console.error(
        "[TELEGRAM-REPLY] 서버 misconfiguration: TELEGRAM_WEBHOOK_SECRET 미설정",
      );
      return NextResponse.json(
        { success: false, error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    // 시크릿 키 검증 (Cloudflare Worker에서 호출 시) — timing-safe 비교
    const apiSecret = request.headers.get("X-API-Secret") || "";
    const expected = Buffer.from(WEBHOOK_SECRET);
    const received = Buffer.from(apiSecret);
    const authOk =
      expected.length === received.length &&
      timingSafeEqual(expected, received);
    if (!authOk) {
      console.log("[TELEGRAM-REPLY] 인증 실패: 잘못된 API Secret");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { threadId, content } = body;

    if (!threadId || !content) {
      return NextResponse.json(
        { success: false, error: "threadId와 content 필요" },
        { status: 400 },
      );
    }

    // 스레드 확인
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
      include: {
        user: {
          select: {
            id: true,
            이름: true,
            telegramChatId: true,
            slackChannelId: true,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { success: false, error: "스레드를 찾을 수 없음" },
        { status: 404 },
      );
    }

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

    // 사용자에게 텔레그램 알림 (telegramChatId가 있는 경우) - 문의하기 전용 봇 사용
    if (thread.user?.telegramChatId) {
      try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_INQUIRY_BOT_TOKEN || "";
        const escapeHtml = (text: string) =>
          text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

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
          },
        );
      } catch (error) {
        console.error("사용자 텔레그램 알림 실패:", error);
      }
    }

    // SP_Q&A 슬랙 채널에 텔레그램 답변 기록
    try {
      const SLACK_QNA_CHANNEL_ID = process.env.SLACK_QNA_CHANNEL_ID;
      if (SLACK_QNA_CHANNEL_ID) {
        const { postMessage } = await import("@/lib/notification/slackClient");
        await postMessage({
          channelId: SLACK_QNA_CHANNEL_ID,
          text: `📤 [관리자] → [${thread.user?.이름}] 답변 (텔레그램)`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `📤 *[관리자] → [${thread.user?.이름 || "사용자"}] 답변*\n━━━━━━━━━━━━━━━━━━━━`,
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*담당자:* 텔레그램 관리자`,
                },
                {
                  type: "mrkdwn",
                  text: `*제목:* ${thread.title}`,
                },
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*내용:*\n${content}`,
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
      console.error("슬랙 SP_Q&A 기록 실패:", error);
    }

    console.log("[TELEGRAM-REPLY] 답변 등록 완료:", threadId);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("[TELEGRAM-REPLY] 에러:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
