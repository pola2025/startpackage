import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { userId, isGraduated } = body;

    if (!userId || typeof isGraduated !== "boolean") {
      return NextResponse.json(
        { error: "userId와 isGraduated가 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자 수료생 상태 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isGraduated },
    });

    console.log(`[Toggle Graduate] 사용자 ${updatedUser.이름}(${updatedUser.id})을 ${isGraduated ? "수료생" : "재학생"}으로 전환`);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        이름: updatedUser.이름,
        isGraduated: updatedUser.isGraduated,
      },
    });
  } catch (error) {
    console.error("Toggle graduate error:", error);
    return NextResponse.json(
      { error: "수료생 전환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
