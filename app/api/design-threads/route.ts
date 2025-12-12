import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: 시안 쓰레드 목록 조회
// - 관리자: 모든 쓰레드 (필터링 가능)
// - 사용자: 본인 쓰레드만
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isAdmin = ["super", "designer", "operator"].includes(user.role);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // 상태 필터
    const workflowType = searchParams.get("type"); // 워크플로우 타입 필터
    const userId = searchParams.get("userId"); // 특정 사용자 필터 (관리자용)

    // 기본 where 조건
    const where: any = {};

    // 상태 필터
    if (status && status !== "all") {
      where.status = status;
    }

    // 워크플로우 타입 필터
    if (workflowType && workflowType !== "all") {
      where.workflow = {
        ...where.workflow,
        type: workflowType,
      };
    }

    // 사용자 필터
    if (!isAdmin) {
      // 일반 사용자: 본인 워크플로우의 쓰레드만
      where.workflow = {
        ...where.workflow,
        userId: user.id,
      };
    } else if (userId) {
      // 관리자: 특정 사용자 필터
      where.workflow = {
        ...where.workflow,
        userId,
      };
    }

    const threads = await prisma.designThread.findMany({
      where,
      include: {
        workflow: {
          include: {
            user: {
              select: {
                id: true,
                이름: true,
                email: true,
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
          orderBy: { createdAt: "desc" },
          take: 1, // 마지막 메시지만
        },
        _count: {
          select: {
            messages: {
              where: isAdmin
                ? { isReadByAdmin: false, authorType: "user" }
                : { isReadByUser: false, authorType: "admin" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 응답 형식 변환
    const formattedThreads = threads.map((thread) => ({
      id: thread.id,
      status: thread.status,
      currentVersion: thread.currentVersion,
      confirmedAt: thread.confirmedAt,
      confirmedByName: thread.confirmedByName,
      workflow: {
        id: thread.workflow.id,
        type: thread.workflow.type,
        status: thread.workflow.status,
        user: thread.workflow.user,
      },
      lastMessage: thread.messages[0] || null,
      unreadCount: thread._count.messages,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    }));

    return NextResponse.json({ threads: formattedThreads });
  } catch (error) {
    console.error("GET /api/design-threads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
