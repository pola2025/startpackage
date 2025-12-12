import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH: 메시지 읽음 처리
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const user = session.user as any;
    const isAdmin = ["super", "designer", "operator"].includes(user.role);

    // 쓰레드 존재 확인
    const thread = await prisma.designThread.findUnique({
      where: { id: threadId },
      include: { workflow: true },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // 권한 확인
    if (!isAdmin && thread.workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 읽음 처리
    // - 관리자: 사용자가 작성한 메시지를 읽음 처리
    // - 사용자: 관리자가 작성한 메시지를 읽음 처리
    const updateField = isAdmin ? "isReadByAdmin" : "isReadByUser";
    const authorTypeToMark = isAdmin ? "user" : "admin";

    const result = await prisma.designThreadMessage.updateMany({
      where: {
        threadId,
        authorType: authorTypeToMark,
        [updateField]: false,
      },
      data: {
        [updateField]: true,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("PATCH /api/design-threads/[id]/read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
