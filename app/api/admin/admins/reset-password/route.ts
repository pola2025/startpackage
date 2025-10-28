import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const resetPasswordSchema = z.object({
  adminId: z.string(),
  newPassword: z.string().min(4, "비밀번호는 최소 4자 이상이어야 합니다."),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // super 권한만 접근 가능
    if (!session || userRole !== "super") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { adminId, newPassword } = validationResult.data;

    // 비밀번호 해시
    const hashedPassword = await hash(newPassword, 10);

    // 비밀번호 업데이트
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 초기화되었습니다.",
    });
  } catch (error: any) {
    console.error("비밀번호 초기화 에러:", error);
    return NextResponse.json(
      { error: "비밀번호 초기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
