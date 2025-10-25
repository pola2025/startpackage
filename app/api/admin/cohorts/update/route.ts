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
    const { cohortId, name, 교육요일, 교육시작일, 자료제출마감일 } = body;

    if (!cohortId) {
      return NextResponse.json(
        { error: "기수 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "기수명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!교육요일) {
      return NextResponse.json(
        { error: "교육 요일을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!교육시작일 || !자료제출마감일) {
      return NextResponse.json(
        { error: "교육 시작일과 자료 제출 마감일을 입력해주세요." },
        { status: 400 }
      );
    }

    // Update cohort
    const cohort = await prisma.cohort.update({
      where: { id: cohortId },
      data: {
        name,
        교육요일,
        교육시작일: new Date(교육시작일),
        자료제출마감일: new Date(자료제출마감일),
      },
    });

    return NextResponse.json({
      success: true,
      cohort,
    });
  } catch (error: any) {
    console.error("기수 수정 에러:", error);
    return NextResponse.json(
      { error: "기수 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
