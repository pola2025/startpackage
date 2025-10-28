import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateAdminSchema = z.object({
  adminId: z.string(),
  name: z.string().min(2).optional(),
  role: z.enum(["super", "designer", "operator"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const currentAdminId = (session?.user as any)?.id;

    // super 권한만 접근 가능
    if (!session || userRole !== "super") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateAdminSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { adminId, name, role } = validationResult.data;

    // 자기 자신의 권한은 수정할 수 없음
    if (adminId === currentAdminId && role) {
      return NextResponse.json(
        { error: "자기 자신의 권한은 수정할 수 없습니다." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;

    const admin = await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "관리자 정보가 수정되었습니다.",
      admin,
    });
  } catch (error: any) {
    console.error("관리자 수정 에러:", error);
    return NextResponse.json(
      { error: "관리자 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
