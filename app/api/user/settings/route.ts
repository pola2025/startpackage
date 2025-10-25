import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH: 사용자 설정 업데이트
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { 공지사항이메일수신, SMS수신동의, 이메일수신동의 } = body;

    // 사용자 설정 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(공지사항이메일수신 !== undefined && { 공지사항이메일수신 }),
        ...(SMS수신동의 !== undefined && { SMS수신동의 }),
        ...(이메일수신동의 !== undefined && { 이메일수신동의 }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        공지사항이메일수신: user.공지사항이메일수신,
        SMS수신동의: user.SMS수신동의,
        이메일수신동의: user.이메일수신동의,
      },
    });
  } catch (error) {
    console.error("PATCH /api/user/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
