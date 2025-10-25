import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { cohortId } = body;

    if (!cohortId) {
      return NextResponse.json(
        { error: "기수 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Delete cohort (cascade delete will handle related records)
    await prisma.cohort.delete({
      where: { id: cohortId },
    });

    return NextResponse.json({
      success: true,
      message: "기수가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("기수 삭제 에러:", error);
    return NextResponse.json(
      { error: "기수 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
