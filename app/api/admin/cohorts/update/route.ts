import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

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

    if (isD1RuntimeEnabled()) {
      const cohort = await callDataService<Record<string, unknown>>("admin-domain/cohort-update", { adminId: (session.user as { id: string }).id, id: cohortId, name, 교육요일, 교육시작일: new Date(교육시작일).getTime(), 자료제출마감일: new Date(자료제출마감일).getTime() });
      return NextResponse.json({ success: true, cohort });
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
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("기수 수정 에러:", error);
    return NextResponse.json(
      { error: "기수 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
