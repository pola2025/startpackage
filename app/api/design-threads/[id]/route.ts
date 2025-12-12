import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: 시안 쓰레드 상세 + 메시지 목록
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = session.user as any;
    const isAdmin = ["super", "designer", "operator"].includes(user.role);

    const thread = await prisma.designThread.findUnique({
      where: { id },
      include: {
        workflow: {
          include: {
            user: {
              select: {
                id: true,
                이름: true,
                email: true,
                연락처: true,
                submission: {
                  select: {
                    브랜드명: true,
                  },
                },
                cohort: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // 권한 확인: 본인 워크플로우이거나 관리자
    if (!isAdmin && thread.workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 읽음 처리 (조회 시 자동)
    const updateField = isAdmin ? "isReadByAdmin" : "isReadByUser";
    const unreadMessageIds = thread.messages
      .filter((msg) =>
        isAdmin
          ? !msg.isReadByAdmin && msg.authorType === "user"
          : !msg.isReadByUser && msg.authorType === "admin"
      )
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      await prisma.designThreadMessage.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { [updateField]: true },
      });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("GET /api/design-threads/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
