import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: 홈페이지 관리용 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !["super", "designer", "operator"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        이름: true,
        email: true,
        연락처: true,
        homepageCompleted: true,
        cohort: {
          select: {
            id: true,
            name: true,
          },
        },
        submission: {
          select: {
            홈페이지제작방식: true,
            홈페이지스타일: true,
            홈페이지컬러컨셉: true,
            아임웹ID: true,
            아임웹PW: true,
            아임웹관리자PW: true,
            도메인관리사이트: true,
            도메인관리ID: true,
            도메인관리PW: true,
            해외결제카드앞면URL: true,
            해외결제카드뒷면URL: true,
            해외결제카드유효기간: true,
          },
        },
      },
      orderBy: [
        { cohort: { name: "desc" } },
        { 이름: "asc" },
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch homepage users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
