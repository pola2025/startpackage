import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 의도된 공개 (회원가입 페이지에서 비회원이 활성 기수 선택)
// 60초 캐시로 봇 호출 부하 감소
export const revalidate = 60;

export async function GET() {
  try {
    const activeCohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        교육시작일: true,
        자료제출마감일: true,
      },
    });

    return NextResponse.json(activeCohorts, {
      headers: {
        // CDN/브라우저 캐시 60초 + 백그라운드 재검증 120초
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("활성 기수 조회 에러:", error);
    return NextResponse.json(
      { error: "기수 정보를 불러올 수 없습니다." },
      { status: 500 },
    );
  }
}
