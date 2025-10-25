import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: "userId와 type이 필요합니다" },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 중복 워크플로우 확인
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        userId,
        type,
      },
    });

    if (existingWorkflow) {
      return NextResponse.json(
        { error: "해당 사용자의 동일한 제작물 워크플로우가 이미 존재합니다" },
        { status: 400 }
      );
    }

    // 워크플로우 생성
    const workflow = await prisma.workflow.create({
      data: {
        userId,
        type,
        status: "대기",
      },
      include: {
        user: {
          select: {
            이름: true,
            cohort: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("POST /api/admin/workflows/create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
