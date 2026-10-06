import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { attachmentLinks } from "@/lib/communication/attachments";

// 새 문의를 관리자에게 알린다. 알림이 실패해도 문의 접수는 유지한다.
async function notifyNewInquiry(input: {
  threadId: string;
  userName: string;
  cohortName?: string | null;
  title: string;
  category?: string;
  content: string;
  attachments?: unknown;
}) {
  const { threadId, userName, cohortName, title, category, content } = input;
  // 누가 보낸 문의인지 바로 알 수 있게 기수를 이름 앞에 붙인다.
  const sender = cohortName ? `${cohortName} ${userName}` : userName;
  const files = attachmentLinks(input.attachments);

  // 관리자에게 텔레그램 알림 (문의하기 전용 봇 - 웹훅 답장 지원)
  try {
    const { sendInquiryTelegramMessage } =
      await import("@/lib/notification/telegramClient");
    // HTML 특수문자 이스케이프
    const escapeHtml = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const fileLines = files.length
      ? `\n\n<b>첨부:</b>\n${files.map((file) => `• <a href="${escapeHtml(file.url)}">${escapeHtml(file.name)}</a>`).join("\n")}`
      : "";

    await sendInquiryTelegramMessage(
      `🔔 <b>새 문의</b> [ID: ${threadId}]\n\n<b>사용자:</b> ${escapeHtml(sender || "")}\n<b>제목:</b> ${escapeHtml(title)}\n<b>카테고리:</b> ${escapeHtml(category || "일반")}\n\n<b>내용:</b>\n${escapeHtml(content)}${fileLines}\n\n💡 이 메시지에 답장하면 자동으로 답변이 등록됩니다.`,
    );
  } catch (error) {
    console.error("텔레그램 알림 실패:", error);
  }

  // SP_Q&A 슬랙 채널에 문의 기록
  try {
    const SLACK_QNA_CHANNEL_ID = process.env.SLACK_QNA_CHANNEL_ID;
    if (SLACK_QNA_CHANNEL_ID) {
      const { postMessage } = await import("@/lib/notification/slackClient");
      await postMessage({
        channelId: SLACK_QNA_CHANNEL_ID,
        text: `🔔 [${sender}] 새 문의`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔔 *[${sender}] 새 문의*\n━━━━━━━━━━━━━━━━━━━━`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*제목:* ${title}`,
              },
              {
                type: "mrkdwn",
                text: `*카테고리:* ${category || "일반"}`,
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

// GET: 사용자의 스레드 목록 조회
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (isD1RuntimeEnabled()) {
      const params = new URL(request.url).searchParams;
      return NextResponse.json(
        await callDataService("communication-domain/user-threads", {
          userId,
          pageSize: params.get("pageSize") ?? undefined,
          cursor: params.get("cursor") ?? undefined,
        }),
      );
    }

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
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("GET /api/communication/threads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    const cohortName = (session.user as any).cohortName as
      | string
      | null
      | undefined;
    const body = await request.json();
    const { title, category, content, attachments } = body;
    if (isD1RuntimeEnabled()) {
      const created = await callDataService<{ thread: { id: string } }>(
        "communication-domain/user-create-thread",
        { userId, title, category, content, attachments },
      );
      await notifyNewInquiry({
        threadId: created.thread.id,
        userName,
        cohortName,
        title,
        category,
        content,
        attachments,
      });
      return NextResponse.json(created);
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요" },
        { status: 400 },
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

    await notifyNewInquiry({
      threadId: thread.id,
      userName,
      cohortName,
      title,
      category,
      content,
      attachments,
    });

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("POST /api/communication/threads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
