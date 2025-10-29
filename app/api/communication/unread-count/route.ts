import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/communication/unread-count
 *
 * 사용자의 미확인 관리자 메시지 개수 조회
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // 사용자의 스레드 ID 목록
    const userThreads = await prisma.communicationThread.findMany({
      where: { userId },
      select: { id: true },
    });

    const threadIds = userThreads.map((t) => t.id);

    // 관리자가 작성한 미확인 메시지 개수
    const unreadCount = await prisma.communicationMessage.count({
      where: {
        threadId: { in: threadIds },
        authorType: "admin", // 관리자 메시지만
        isReadByUser: false, // 읽지 않은 메시지
      },
    });

    // 미확인 메시지가 있는 스레드 목록
    const threadsWithUnread = await prisma.communicationMessage.groupBy({
      by: ["threadId"],
      where: {
        threadId: { in: threadIds },
        authorType: "admin",
        isReadByUser: false,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      unreadCount,
      threadsWithUnread: threadsWithUnread.map((t) => ({
        threadId: t.threadId,
        count: t._count.id,
      })),
    });
  } catch (error) {
    console.error("❌ 미확인 메시지 조회 실패:", error);
    return NextResponse.json(
      { error: "미확인 메시지 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
