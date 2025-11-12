import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Public API: 발행된 콘텐츠 팁 조회
 * 외부 서비스(나라똔 등)에서 접근 가능
 * 인증 불필요, CORS 허용
 */
export async function GET() {
  try {
    // 발행된 콘텐츠만 가져오기 (카테고리별 정렬)
    const tips = await prisma.contentTip.findMany({
      where: { published: true },
      orderBy: [
        { category: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        linkType: true,
        linkUrl: true,
        thumbnailUrl: true,
        category: true,
        subCategory: true,
        createdAt: true,
        updatedAt: true,
        authorName: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: tips.length,
        tips,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*", // 모든 도메인 허용
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120", // 1분 캐싱
        },
      }
    );
  } catch (error) {
    console.error("GET /api/public/content-tips error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch content tips",
      },
      { status: 500 }
    );
  }
}

// OPTIONS 메서드 처리 (CORS preflight)
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
