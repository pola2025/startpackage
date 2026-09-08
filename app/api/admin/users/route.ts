import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isD1RuntimeEnabled()) {
      const params = new URL(request.url).searchParams;
      const result = await callDataService<{ items: Array<Record<string, unknown>>; nextCursor?: string }>("admin-domain/users-list", {
        adminId: (session.user as { id: string }).id,
        pageSize: params.get("pageSize") ?? undefined,
        cursor: params.get("cursor") ?? undefined,
      });
      return NextResponse.json(result.items, result.nextCursor ? { headers: { "X-Next-Cursor": result.nextCursor } } : undefined);
    }

    const users = await prisma.user.findMany({
      where: {
        role: "user", // 일반 사용자만 조회
      },
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
        // 광고 자동화 관련
        adAutomationEnabled: true,
        adAutomationStartDate: true,
        adAutomationEndDate: true,
        // SMS 설정
        smsSettingEnabled: true,
        smsSettingStartDate: true,
        smsSettingEndDate: true,
        // 네이버 광고 설정
        naverAdSettingEnabled: true,
        naverAdSettingStartDate: true,
        naverAdSettingEndDate: true,
        // 홈페이지 설정
        homepageCompleted: true,
        homepageCompletedAt: true,
        // 마케팅 지원 기간
        marketingSupportEndDate: true,
      },
      orderBy: {
        이름: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
