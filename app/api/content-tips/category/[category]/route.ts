import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isValidCategory } from "@/lib/constants/contentTipCategories";

// GET: 특정 카테고리의 모든 콘텐츠 조회 (서브카테고리 필터 지원)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { category } = await params;

    // 카테고리 유효성 검증
    if (!isValidCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // URL에서 서브카테고리 필터 가져오기
    const { searchParams } = new URL(request.url);
    const subCategory = searchParams.get("subCategory");

    // 쿼리 조건 구성
    const where: any = {
      published: true,
      category,
    };

    // 서브카테고리 필터가 있으면 추가
    if (subCategory) {
      where.subCategory = subCategory;
    }

    // 콘텐츠 조회
    const tips = await prisma.contentTip.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 해당 카테고리의 모든 서브카테고리 조회
    const allTipsInCategory = await prisma.contentTip.findMany({
      where: {
        published: true,
        category,
        subCategory: { not: null },
      },
      select: { subCategory: true },
      distinct: ["subCategory"],
    });

    const availableSubCategories = allTipsInCategory
      .map((tip) => tip.subCategory)
      .filter((sub): sub is string => sub !== null);

    return NextResponse.json({
      tips,
      total: tips.length,
      availableSubCategories,
    });
  } catch (error) {
    console.error("GET /api/content-tips/category/[category] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
