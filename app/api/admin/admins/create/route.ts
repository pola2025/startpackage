import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const createAdminSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  password: z.string().min(4, "비밀번호는 최소 4자 이상이어야 합니다."),
  role: z.enum(["super", "designer", "operator"]),
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
    const validationResult = createAdminSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, name, password, role } = validationResult.data;

    // 이메일 중복 확인
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 400 }
      );
    }

    // 비밀번호 해시 (레거시 호환용, 2FA 사용 시 미사용)
    const hashedPassword = await hash(password, 10);

    // 2FA 셋업 토큰 생성
    const setupToken = randomBytes(32).toString("hex");

    // 관리자 생성
    const admin = await prisma.admin.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        twoFactorSetupToken: setupToken,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // 2FA 셋업 URL 생성
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
    const setupUrl = `${baseUrl}/admin/setup-2fa?token=${setupToken}&email=${encodeURIComponent(email)}`;

    return NextResponse.json({
      success: true,
      message: "관리자가 생성되었습니다. 2FA 셋업 URL을 전달하세요.",
      admin,
      setupUrl,
    });
  } catch (error: any) {
    console.error("관리자 생성 에러:", error);
    return NextResponse.json(
      { error: "관리자 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
