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
    const { name, 교육요일, 교육시작일, 자료제출마감일 } = body;

    if (!name) {
      return NextResponse.json(
        { error: "기수명을 입력해주세요." },
        { status: 400 },
      );
    }

    if (!교육요일) {
      return NextResponse.json(
        { error: "교육 요일을 입력해주세요." },
        { status: 400 },
      );
    }

    if (!교육시작일 || !자료제출마감일) {
      return NextResponse.json(
        { error: "교육 시작일과 자료 제출 마감일을 입력해주세요." },
        { status: 400 },
      );
    }

    const adminName = (session.user as any)?.name || "관리자";

    // Create cohort
    const cohort = await prisma.cohort.create({
      data: {
        name,
        교육요일,
        교육시작일: new Date(교육시작일),
        자료제출마감일: new Date(자료제출마감일),
        isActive: true,
      },
    });

    // 마감일 포맷 (예: "2026년 3월 4일(수)")
    const deadline = new Date(자료제출마감일);
    const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
    const deadlineLabel = `${deadline.getFullYear()}년 ${deadline.getMonth() + 1}월 ${deadline.getDate()}일(${DAYS[deadline.getDay()]})`;

    // 기수 자료제출 마감 팝업 자동 생성
    await prisma.systemAlert.create({
      data: {
        title: "자료제출 마감일 안내",
        content: deadlineLabel,
        type: "urgent",
        priority: 100,
        startDate: new Date(교육시작일), // 교육 시작일부터 노출
        endDate: new Date(자료제출마감일), // 마감일까지 노출
        isActive: true,
        cohortId: cohort.id,
        phoneNumber: "010-9897-9834",
        createdBy: session.user?.id || "system",
        createdByName: adminName,
      },
    });

    return NextResponse.json({
      success: true,
      cohort,
    });
  } catch (error: any) {
    console.error("기수 생성 에러:", error);
    return NextResponse.json(
      { error: "기수 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
