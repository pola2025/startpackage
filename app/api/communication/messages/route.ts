import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { attachmentLinks } from "@/lib/communication/attachments";

// 사용자가 남긴 답글을 관리자에게 알린다. 알림이 실패해도 답글 저장은 유지한다.
async function notifyInquiryReply(input: {
  threadId: string;
  userName: string;
  cohortName?: string | null;
  title: string;
  content: string;
  attachments?: unknown;
}) {
  const { threadId, userName, cohortName, title, content } = input;
  // 누가 보낸 답글인지 바로 알 수 있게 기수를 이름 앞에 붙인다.
  const sender = cohortName ? `${cohortName} ${userName}` : userName;
  const files = attachmentLinks(input.attachments);

  // 관리자에게 텔레그램 알림 (문의하기 전용 봇 - 웹훅 답장 지원)
  try {
    const { sendInquiryTelegramMessage } =
      await import("@/lib/notification/telegramClient");
    const escapeHtml = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const fileLines = files.length
      ? `\n\n<b>첨부:</b>\n${files.map((file) => `• <a href="${escapeHtml(file.url)}">${escapeHtml(file.name)}</a>`).join("\n")}`
      : "";

    await sendInquiryTelegramMessage(
      `💬 <b>문의 답글</b> [ID: ${threadId}]\n\n<b>사용자:</b> ${escapeHtml(sender || "")}\n<b>제목:</b> ${escapeHtml(title)}\n\n<b>내용:</b>\n${escapeHtml(content)}${fileLines}\n\n💡 이 메시지에 답장하면 자동으로 답변이 등록됩니다.`,
    );
  } catch (error) {
    console.error("텔레그램 알림 실패:", error);
  }

  // SP_Q&A 슬랙 채널에 사용자 메시지 기록
  try {
    const SLACK_QNA_CHANNEL_ID = process.env.SLACK_QNA_CHANNEL_ID;
    if (SLACK_QNA_CHANNEL_ID) {
      const { postMessage } = await import("@/lib/notification/slackClient");
      await postMessage({
        channelId: SLACK_QNA_CHANNEL_ID,
        text: `💬 [${sender}] 추가 메시지`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `💬 *[${sender}] 추가 메시지*\n━━━━━━━━━━━━━━━━━━━━`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*제목:* ${title}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*내용:*\n${content}`,
            },
          },
          ...(files.length
            ? [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*첨부:*\n${files.map((file) => `• <${file.url}|${file.name}>`).join("\n")}`,
                  },
                },
              ]
            : []),
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
    console.error("슬랙 SP_Q&A 기록 실패:", error);
  }
}

// POST: 메시지 작성 (답글)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name;
    const cohortName = (session.user as any).cohortName as
      | string
      | null
      | undefined;
    const body = await request.json();
    const { threadId, content, attachments } = body;
    if (isD1RuntimeEnabled()) {
      // notify 는 알림에만 쓰고 브라우저 응답에서는 뺀다.
      const { notify, ...saved } = await callDataService<
        { notify?: { title?: string } } & Record<string, unknown>
      >("communication-domain/user-create-message", {
        userId,
        threadId,
        content,
        attachments,
      });
      await notifyInquiryReply({
        threadId,
        userName,
        cohortName,
        title: notify?.title ?? "",
        content,
        attachments,
      });
      return NextResponse.json(saved);
    }

    if (!threadId || !content) {
      return NextResponse.json(
        { error: "스레드 ID와 내용을 입력해주세요" },
        { status: 400 },
      );
    }

    // 스레드 확인 및 권한 체크
    const thread = await prisma.communicationThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "스레드를 찾을 수 없습니다" },
        { status: 404 },
      );
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

    await notifyInquiryReply({
      threadId,
      userName,
      cohortName,
      title: thread.title,
      content,
      attachments,
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("POST /api/communication/messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
