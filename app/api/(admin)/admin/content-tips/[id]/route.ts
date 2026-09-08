import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// Validation schema
const contentTipUpdateSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").optional(),
  description: z.string().min(1, "설명을 입력해주세요").optional(),
  linkType: z.enum(["youtube", "blog"]).optional(),
  linkUrl: z.string().url("올바른 URL을 입력해주세요").optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  category: z.enum(["instagram", "meta_ads", "naver_blog", "ai"], {
    errorMap: () => ({ message: "카테고리를 선택해주세요" }),
  }).optional(),
  subCategory: z.string().optional().nullable(),
  published: z.boolean().optional(),
});

// GET: 개별 콘텐츠 팁 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;

    if (isD1RuntimeEnabled()) {
      const tip = await callDataService<Record<string, unknown>>("admin-domain/content-tip-get", { adminId: (session.user as any).id, id });
      return NextResponse.json({ tip });
    }

    const tip = await prisma.contentTip.findUnique({
      where: { id },
    });

    if (!tip) {
      return NextResponse.json({ error: "콘텐츠 팁을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ tip });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("GET /api/admin/content-tips/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: 콘텐츠 팁 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = contentTipUpdateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다",
          details: validated.error.errors,
        },
        { status: 400 }
      );
    }

    if (isD1RuntimeEnabled()) {
      const tip = await callDataService<Record<string, unknown>>("admin-domain/content-tip-update", { adminId: (session.user as any).id, id, ...validated.data });
      return NextResponse.json({ success: true, tip });
    }

    const tip = await prisma.contentTip.update({
      where: { id },
      data: validated.data,
    });

    return NextResponse.json({
      success: true,
      tip,
    });
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("PATCH /api/admin/content-tips/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "콘텐츠 팁을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 콘텐츠 팁 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;

    if (isD1RuntimeEnabled()) {
      return NextResponse.json(await callDataService<{ success: boolean; message: string }>("admin-domain/content-tip-delete", { adminId: (session.user as any).id, id }));
    }

    await prisma.contentTip.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "콘텐츠 팁이 삭제되었습니다",
    });
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("DELETE /api/admin/content-tips/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "콘텐츠 팁을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
