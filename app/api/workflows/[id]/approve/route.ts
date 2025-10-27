import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const userId = session.user.id;

    // 워크플로우 조회
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "워크플로우를 찾을 수 없습니다." }, { status: 404 });
    }

    // 본인의 워크플로우인지 확인
    if (workflow.userId !== userId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 로고와 홈페이지만 승인 가능
    if (workflow.type !== "로고" && workflow.type !== "홈페이지") {
      return NextResponse.json({ error: "로고와 홈페이지만 확정할 수 있습니다." }, { status: 400 });
    }

    // 상태 확인
    if (workflow.type === "로고" && workflow.status !== "시안컨펌요청") {
      return NextResponse.json({ error: "시안컨펌요청 상태에서만 확정할 수 있습니다." }, { status: 400 });
    }

    if (workflow.type === "홈페이지" && workflow.status !== "제작 완료") {
      return NextResponse.json({ error: "제작 완료 상태에서만 확정할 수 있습니다." }, { status: 400 });
    }

    const previousStatus = workflow.status;

    // 워크플로우 상태를 최종확정으로 변경
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        status: "최종확정",
      },
    });

    // 로그 기록
    await prisma.workflowLog.create({
      data: {
        workflowId,
        performedBy: userId,
        performedByName: session.user.name || "사용자",
        action: `${workflow.type} 확정`,
        previousStatus,
        newStatus: "최종확정",
      },
    });

    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow,
    });
  } catch (error: any) {
    console.error("로고 승인 에러:", error);
    return NextResponse.json(
      { error: "로고 승인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
