import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 마케팅 지원 연장 신청 목록 조회 (관리자용)
export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
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
    console.error("GET /api/admin/marketing-extension/list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
