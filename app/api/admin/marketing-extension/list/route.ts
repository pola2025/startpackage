import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// GET: 마케팅 지원 연장 신청 목록 조회 (관리자용)
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (isD1RuntimeEnabled()) {
      const result = await callDataService<{ items: unknown[]; nextCursor?: string }>("admin-domain/extension-list", { adminId: (session.user as { id: string }).id, pageSize: new URL(request.url).searchParams.get("pageSize") ?? undefined, cursor: new URL(request.url).searchParams.get("cursor") ?? undefined });
      return NextResponse.json(result.items, result.nextCursor ? { headers: { "X-Next-Cursor": result.nextCursor } } : undefined);
    }

    const requests = await prisma.marketingExtensionRequest.findMany({
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
      },
      orderBy: {
        requestDate: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("GET /api/admin/marketing-extension/list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
