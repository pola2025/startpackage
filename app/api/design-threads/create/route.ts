import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST: 워크플로우에 대한 시안 쓰레드 생성
// - 관리자만 가능
// - 워크플로우가 "시안중" 상태일 때만 생성 가능
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admin can create design thread" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 }
      );
    }

    // 워크플로우 확인
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        designThread: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // 이미 쓰레드가 있는 경우
    if (workflow.designThread) {
      return NextResponse.json({
        success: true,
        thread: workflow.designThread,
        message: "Thread already exists",
      });
    }

    // 시안 쓰레드 생성
    const thread = await prisma.designThread.create({
      data: {
        workflowId,
        status: "pending",
        currentVersion: 0,
      },
    });

    return NextResponse.json({
      success: true,
      thread,
      message: "Thread created successfully",
    });
  } catch (error) {
    console.error("POST /api/design-threads/create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
