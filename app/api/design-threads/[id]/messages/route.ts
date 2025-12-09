import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST: 메시지 추가
// - 관리자: 시안 업로드 (design_upload), 일반 메시지 (message)
// - 사용자: 수정 요청 (revision_request), 일반 메시지 (message)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const user = session.user as any;
    const isAdmin = user.role === "admin";

    const body = await req.json();
    const { messageType, content, attachments = [], designUrl, designVersion } = body;

    // 쓰레드 존재 확인
    const thread = await prisma.designThread.findUnique({
      where: { id: threadId },
      include: {
        workflow: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // 권한 확인
    if (!isAdmin && thread.workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 메시지 타입 유효성 검사
    const validAdminTypes = ["design_upload", "message"];
    const validUserTypes = ["revision_request", "message"];

    if (isAdmin && !validAdminTypes.includes(messageType)) {
      return NextResponse.json(
        { error: "Invalid message type for admin" },
        { status: 400 }
      );
    }
    if (!isAdmin && !validUserTypes.includes(messageType)) {
      return NextResponse.json(
        { error: "Invalid message type for user" },
        { status: 400 }
      );
    }

    // 작성자 정보 조회
    let authorName = user.name || user.이름;
    if (isAdmin) {
      const admin = await prisma.admin.findUnique({
        where: { id: user.id },
      });
      authorName = admin?.name || "관리자";
    }

    // 시안 업로드인 경우 버전 계산
    let newVersion = designVersion;
    if (messageType === "design_upload" && !designVersion) {
      newVersion = thread.currentVersion + 1;
    }

    // 트랜잭션으로 메시지 생성 및 쓰레드 상태 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 메시지 생성
      const message = await tx.designThreadMessage.create({
        data: {
          threadId,
          authorId: user.id,
          authorType: isAdmin ? "admin" : "user",
          authorName,
          messageType,
          content,
          attachments,
          designVersion: messageType === "design_upload" ? newVersion : null,
          designUrl: messageType === "design_upload" ? designUrl : null,
          isReadByAdmin: isAdmin, // 본인이 작성한 메시지는 읽음 처리
          isReadByUser: !isAdmin,
        },
      });

      // 쓰레드 상태 및 버전 업데이트
      let newStatus = thread.status;
      if (messageType === "design_upload") {
        newStatus = "feedback_waiting";
      } else if (messageType === "revision_request") {
        newStatus = "revision_requested";
      }

      const updatedThread = await tx.designThread.update({
        where: { id: threadId },
        data: {
          status: newStatus,
          currentVersion:
            messageType === "design_upload" ? newVersion : thread.currentVersion,
        },
      });

      // 시안 업로드인 경우 워크플로우에도 기록
      if (messageType === "design_upload" && designUrl) {
        // 워크플로우 시안URL 업데이트
        await tx.workflow.update({
          where: { id: thread.workflowId },
          data: {
            시안URL: designUrl,
            시안업로드일: new Date(),
            수정횟수: newVersion - 1,
          },
        });

        // DesignHistory에도 기록
        await tx.designHistory.create({
          data: {
            workflowId: thread.workflowId,
            version: newVersion,
            fileUrl: designUrl,
            uploadedBy: user.id,
            uploadedByName: authorName,
          },
        });
      }

      return { message, thread: updatedThread };
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      thread: result.thread,
    });
  } catch (error) {
    console.error("POST /api/design-threads/[id]/messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
