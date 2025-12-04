import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await params;

    const history = await prisma.designHistory.findMany({
      where: { workflowId },
      orderBy: { version: "asc" },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/admin/workflows/[workflowId]/design-history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 삭제는 super, designer만 가능
    if (!session || !["super", "designer"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get("historyId");

    if (!historyId) {
      return NextResponse.json({ error: "historyId is required" }, { status: 400 });
    }

    // 해당 시안 이력이 존재하는지 확인
    const designHistory = await prisma.designHistory.findFirst({
      where: {
        id: historyId,
        workflowId,
      },
    });

    if (!designHistory) {
      return NextResponse.json({ error: "Design history not found" }, { status: 404 });
    }

    // 삭제 실행
    await prisma.designHistory.delete({
      where: { id: historyId },
    });

    // 삭제 후 남은 시안들의 버전 재정렬
    const remainingHistory = await prisma.designHistory.findMany({
      where: { workflowId },
      orderBy: { createdAt: "asc" },
    });

    // 버전 번호 재설정
    for (let i = 0; i < remainingHistory.length; i++) {
      await prisma.designHistory.update({
        where: { id: remainingHistory[i].id },
        data: { version: i + 1 },
      });
    }

    // 워크플로우의 시안URL 업데이트 (마지막 시안으로 또는 null로)
    const latestHistory = await prisma.designHistory.findFirst({
      where: { workflowId },
      orderBy: { version: "desc" },
    });

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        시안URL: latestHistory?.fileUrl || null,
        수정횟수: remainingHistory.length > 0 ? remainingHistory.length - 1 : 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "시안이 삭제되었습니다.",
      remainingCount: remainingHistory.length,
    });
  } catch (error) {
    console.error("DELETE /api/admin/workflows/[workflowId]/design-history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
