import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// GET: 관리자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // super 권한만 접근 가능
    if (!session || userRole !== "super") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    if (isD1RuntimeEnabled()) {
      const params = new URL(request.url).searchParams;
      const result = await callDataService<{ items: Array<Record<string, unknown>>; nextCursor?: string }>("admin-domain/admins-list", {
        adminId: (session.user as { id: string }).id,
        pageSize: params.get("pageSize") ?? undefined,
        cursor: params.get("cursor") ?? undefined,
      });
      return NextResponse.json(result.items, result.nextCursor ? { headers: { "X-Next-Cursor": result.nextCursor } } : undefined);
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(admins);
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("관리자 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "관리자 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
