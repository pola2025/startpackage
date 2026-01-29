import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const reset2faSchema = z.object({
  adminId: z.string(),
});

/**
 * POST /api/admin/admins/reset-2fa
 * 관리자 2FA 재설정 (super 전용)
 * - twoFactorEnabled = false
 * - twoFactorSecret = null
 * - 새로운 twoFactorSetupToken 생성
 * - 셋업 URL 반환
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "super") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = reset2faSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "입력값이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    const { adminId } = validationResult.data;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "관리자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 새 셋업 토큰 생성
    const setupToken = randomBytes(32).toString("hex");

    // 2FA 초기화
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorSetupToken: setupToken,
      },
    });

    // 셋업 URL 생성
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
    const setupUrl = `${baseUrl}/admin/setup-2fa?token=${setupToken}&email=${encodeURIComponent(admin.email)}`;

    return NextResponse.json({
      success: true,
      message: "2FA가 초기화되었습니다. 셋업 URL을 관리자에게 전달하세요.",
      setupUrl,
    });
  } catch (error: any) {
    console.error("2FA 재설정 에러:", error);
    return NextResponse.json(
      { error: "2FA 재설정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
