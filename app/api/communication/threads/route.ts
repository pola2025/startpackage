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

    // 스레드 생성 + 첫 메시지 생성
    const thread = await prisma.communicationThread.create({
      data: {
        userId,
        title,
        category: category || "일반",
        messages: {
          create: {
            authorId: userId,
            authorType: "user",
            authorName: userName,
            content,
            attachments: attachments || [],
          },
        },
      },
      include: {
        messages: true,
      },
    });

    // 관리자에게 텔레그램 알림
    try {
      const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
      await sendTelegramMessage(
        `🔔 *새 문의*\\n\\n*사용자:* ${userName}\\n*제목:* ${title}\\n*카테고리:* ${category || "일반"}\\n*내용:* ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`
      );
    } catch (error) {
      console.error("텔레그램 알림 실패:", error);
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
