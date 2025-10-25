import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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
