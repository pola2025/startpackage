import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// GET: 공지사항 목록 조회 (사용자)
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    if (isD1RuntimeEnabled()) {
      const searchParams = new URL(request.url).searchParams;
      const pageSize = Math.min(Number(searchParams.get("pageSize")) || 50, 50);
      const cursor = searchParams.get("cursor") || undefined;
      const page = await callDataService<{ items: unknown[]; total: number; nextCursor: string | null }>("content-domain/announcements", {
        userId: session.user.id,
        pageSize,
        ...(cursor ? { cursor } : {}),
      });
      return NextResponse.json({ announcements: page.items, total: page.total, nextCursor: page.nextCursor });
    }

    // 발행된 공지사항만 조회
    const announcements = await prisma.announcement.findMany({
      where: {
        published: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("GET /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
