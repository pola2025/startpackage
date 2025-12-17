import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST: 메시지 작성 (답글)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name;
    const body = await request.json();
    const { threadId, content, attachments } = body;

    if (!threadId || !content) {
      return NextResponse.json(
        { error: "스레드 ID와 내용을 입력해주세요" },
        { status: 400 }
      );
    }

    // 스레드 확인 및 권한 체크
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "스레드를 찾을 수 없습니다" }, { status: 404 });
    }

    if (thread.userId !== userId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 메시지 생성 + 스레드의 lastReplyAt 업데이트
    const message = await prisma.communicationMessage.create({
      data: {
        threadId,
        authorId: userId,
        authorType: "user",
        authorName: userName,
        content,
        attachments: attachments || [],
      },
    });

    // 스레드의 lastReplyAt 업데이트
    await prisma.communicationThread.update({
      where: { id: threadId },
      data: { lastReplyAt: new Date() },
    });

    // 슬랙 채널에 답글 기록
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackChannelId: true },
      });

      if (user?.slackChannelId) {
        const { postMessage } = await import("@/lib/notification/slackClient");
        await postMessage({
          channelId: user.slackChannelId,
          text: `💬 문의 답글: ${thread.title}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `💬 *문의 답글* (${thread.title})`,
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
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error("슬랙 답글 기록 실패:", error);
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("POST /api/communication/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
