import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 모든 스레드 조회 (관리자)
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 🗑️ 자동 삭제: 완료 상태 + 7일 경과한 스레드 삭제
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const deletedResult = await prisma.communicationThread.deleteMany({
        where: {
          status: "resolved",
          lastReplyAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      if (deletedResult.count > 0) {
        console.log(`[AUTO CLEANUP] ${deletedResult.count}개의 오래된 스레드 자동 삭제됨`);
      }
    } catch (cleanupError) {
      console.error("[AUTO CLEANUP] 자동 삭제 중 에러:", cleanupError);
      // 에러가 나도 스레드 조회는 계속 진행
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (category && category !== "all") {
      where.category = category;
    }

    // 최신 답글 순으로 정렬
    const threads = await prisma.communicationThread.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            이름: true,
            email: true,
            연락처: true,
            cohort: {
              select: {
                name: true,
              },
            },
          },
        },
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
    console.error("GET /api/admin/communication/threads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
