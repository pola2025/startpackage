import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: 스레드 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    const thread = await prisma.communicationThread.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            이름: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" }, // 오래된 순서 (위에서 아래로 시간 흐름)
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "스레드를 찾을 수 없습니다" }, { status: 404 });
    }

    // 본인의 스레드만 조회 가능
    if (thread.userId !== userId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error("GET /api/communication/threads/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
