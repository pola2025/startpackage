import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { cohortId, isActive } = body;

    if (!cohortId) {
      return NextResponse.json(
        { error: "기수 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Update cohort activation status
    const cohort = await prisma.cohort.update({
      where: { id: cohortId },
      data: { isActive },
    });

    return NextResponse.json({
      success: true,
      cohort,
    });
  } catch (error: any) {
    console.error("기수 활성화 토글 에러:", error);
    return NextResponse.json(
      { error: "기수 활성화 상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
