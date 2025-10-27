import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 });
    }

    const userId = session.user.id;

    // 사용자의 cohort 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cohort: {
          select: {
            자료제출마감일: true,
          },
        },
      },
    });

    if (!user || !user.cohort) {
      return NextResponse.json({ error: "기수 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      deadline: user.cohort.자료제출마감일,
    });
  } catch (error) {
    console.error("Deadline fetch error:", error);
    return NextResponse.json(
      { error: "마감일 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
