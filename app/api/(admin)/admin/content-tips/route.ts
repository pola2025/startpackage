import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema
const contentTipSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().min(1, "설명을 입력해주세요"),
  linkType: z.enum(["youtube", "blog"], {
    errorMap: () => ({ message: "링크 타입은 youtube 또는 blog여야 합니다" }),
  }),
  linkUrl: z.string().url("올바른 URL을 입력해주세요"),
  thumbnailUrl: z.string().url().optional().nullable(),
  category: z.enum(["instagram", "meta_ads", "naver_blog"], {
    errorMap: () => ({ message: "카테고리를 선택해주세요" }),
  }),
  subCategory: z.string().optional().nullable(),
  published: z.boolean().default(true),
});

// GET: 모든 콘텐츠 팁 목록 조회 (관리자용, 발행/미발행 포함)
export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const tips = await prisma.contentTip.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tips });
  } catch (error) {
    console.error("GET /api/admin/content-tips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 새 콘텐츠 팁 생성
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const adminName = (session.user as any).name;

    const body = await request.json();
    const validated = contentTipSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다",
          details: validated.error.errors,
        },
        { status: 400 }
      );
    }

    const tip = await prisma.contentTip.create({
      data: {
        ...validated.data,
        authorId: adminId,
        authorName: adminName,
      },
    });

    // 이메일 알림 발송 (published가 true인 경우)
    if (validated.data.published) {
      try {
        const { sendContentTipNotifications } = await import("@/lib/notification/contentTipEmail");
        await sendContentTipNotifications(tip);
      } catch (error) {
        console.error("콘텐츠 팁 이메일 알림 실패:", error);
        // 알림 실패해도 생성은 성공으로 처리
      }
    }

    return NextResponse.json({
      success: true,
      tip,
    });
  } catch (error) {
    console.error("POST /api/admin/content-tips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
