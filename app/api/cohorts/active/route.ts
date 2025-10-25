import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    return NextResponse.json(activeCohorts);
  } catch (error) {
    console.error("활성 기수 조회 에러:", error);
    return NextResponse.json(
      { error: "기수 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
