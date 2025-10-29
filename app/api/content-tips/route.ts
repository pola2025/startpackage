import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 발행된 콘텐츠 팁 목록 조회 (카테고리별 그룹화)
// 인스타그램: 12개, 나머지: 8개
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 각 카테고리별로 가져오기 (인스타그램 12개, 나머지 8개)
    const [instagram, meta_ads, naver_blog, ai] = await Promise.all([
      prisma.contentTip.findMany({
        where: { published: true, category: "instagram" },
        orderBy: { createdAt: "desc" },
        take: 12, // 인스타그램 12개
      }),
      prisma.contentTip.findMany({
        where: { published: true, category: "meta_ads" },
        orderBy: { createdAt: "desc" },
        take: 8, // 메타 광고 8개
      }),
      prisma.contentTip.findMany({
        where: { published: true, category: "naver_blog" },
        orderBy: { createdAt: "desc" },
        take: 8, // 네이버 블로그 8개
      }),
      prisma.contentTip.findMany({
        where: { published: true, category: "ai" },
        orderBy: { createdAt: "desc" },
        take: 8, // AI 8개
      }),
    ]);

    // 각 카테고리별 전체 개수
    const [instagramTotal, metaAdsTotal, naverBlogTotal, aiTotal] = await Promise.all([
      prisma.contentTip.count({
        where: { published: true, category: "instagram" },
      }),
      prisma.contentTip.count({
        where: { published: true, category: "meta_ads" },
      }),
      prisma.contentTip.count({
        where: { published: true, category: "naver_blog" },
      }),
      prisma.contentTip.count({
        where: { published: true, category: "ai" },
      }),
    ]);

    return NextResponse.json({
      instagram,
      meta_ads,
      naver_blog,
      ai,
      instagramTotal,
      metaAdsTotal,
      naverBlogTotal,
      aiTotal,
    });
  } catch (error) {
    console.error("GET /api/content-tips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
