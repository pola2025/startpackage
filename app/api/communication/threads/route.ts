import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 사용자의 스레드 목록 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 최신 답글 순으로 정렬
    const threads = await prisma.communicationThread.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastReplyAt: "desc" }, // 최신 답글 순
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error("GET /api/communication/threads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 새 스레드 생성
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name;
    const body = await request.json();
    const { title, category, content, attachments } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요" },
        { status: 400 }
      );
    }

    // 시스템 안내 메시지 내용
    const systemMessage = `문의가 접수되었습니다.

관리자 확인 후 답변드리겠습니다. 문자/통화 따로 하지 않아도 실시간 전달되고 있습니다.

답변 및 업무 진행은 영업일 기준 1~2일 이내 처리되며, 기간이 더 소요되는 경우 개별 안내드립니다.`;

    // 스레드 생성 + 첫 메시지 + 시스템 메시지 생성
    const thread = await prisma.communicationThread.create({
      data: {
        userId,
        title,
        category: category || "일반",
        messages: {
          create: [
            {
              authorId: userId,
              authorType: "user",
              authorName: userName,
              content,
              attachments: attachments || [],
            },
            {
              authorId: "system",
              authorType: "system",
              authorName: "시스템",
              content: systemMessage,
              attachments: [],
            },
          ],
        },
      },
      include: {
        messages: true,
      },
    });

    // 관리자에게 텔레그램 알림 (문의하기 전용 봇 - 웹훅 답장 지원)
    try {
      const { sendInquiryTelegramMessage } = await import("@/lib/notification/telegramClient");
      // HTML 특수문자 이스케이프
      const escapeHtml = (text: string) =>
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      await sendInquiryTelegramMessage(
        `🔔 <b>새 문의</b> [ID: ${thread.id}]\n\n<b>사용자:</b> ${escapeHtml(userName || "")}\n<b>제목:</b> ${escapeHtml(title)}\n<b>카테고리:</b> ${escapeHtml(category || "일반")}\n\n<b>내용:</b>\n${escapeHtml(content)}\n\n💡 이 메시지에 답장하면 자동으로 답변이 등록됩니다.`
      );
    } catch (error) {
      console.error("텔레그램 알림 실패:", error);
    }

    // 슬랙 채널에 문의 내용 전체 기록
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackChannelId: true },
      });

      if (user?.slackChannelId) {
        const { postMessage } = await import("@/lib/notification/slackClient");
        await postMessage({
          channelId: user.slackChannelId,
          text: `💬 새 문의: ${title}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "💬 새 문의",
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*제목:*\n${title}`,
                },
                {
                  type: "mrkdwn",
                  text: `*카테고리:*\n${category || "일반"}`,
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
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error("슬랙 문의 기록 실패:", error);
    }

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error("POST /api/communication/threads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
