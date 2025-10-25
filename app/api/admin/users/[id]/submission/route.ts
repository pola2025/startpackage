import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id: userId } = await params;

    // 사용자의 submission 정보 조회
    const submission = await prisma.submission.findUnique({
      where: { userId },
    });

    if (!submission) {
      return NextResponse.json(null);
    }

    return NextResponse.json(submission);
  } catch (error: any) {
    console.error("제출 정보 조회 에러:", error);
    return NextResponse.json(
      { error: "제출 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
