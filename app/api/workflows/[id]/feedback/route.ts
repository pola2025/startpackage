import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST: 시안 피드백 제출
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: workflowId } = await params;
    const { feedback } = await request.json();

    if (!feedback || feedback.trim() === "") {
      return NextResponse.json(
        { error: "피드백 내용을 입력해주세요" },
        { status: 400 }
      );
    }

    // 워크플로우 확인
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        user: {
          include: {
            cohort: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (workflow.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 피드백 저장
    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        feedback,
        feedbackDate: new Date(),
      },
    });

    // 텔레그램 알림 (관리자에게)
    try {
      const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
      await sendTelegramMessage({
        message: `📝 *시안 피드백 접수*\n\n*사용자:* ${workflow.user.이름} (${workflow.user.cohort?.name || "기수 미정"})\n*제작물:* ${workflow.type}\n*피드백:*\n${feedback}\n\n*시간:* ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
      });
    } catch (err) {
      console.error("텔레그램 알림 실패:", err);
    }

    // 슬랙 알림
    try {
      if (workflow.user.slackChannelId) {
        const { postMessage } = await import("@/lib/notification/slackClient");
        await postMessage({
          channelId: workflow.user.slackChannelId,
          text: `📝 시안 피드백: ${workflow.type}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*📝 ${workflow.type} 시안 피드백*\n\n${feedback}`,
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
    } catch (err) {
      console.error("슬랙 알림 실패:", err);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/workflows/[id]/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
