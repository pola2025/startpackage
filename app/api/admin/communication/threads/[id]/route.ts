import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH: 스레드 상태 업데이트 및 읽음 처리 (관리자)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // 스레드 존재 확인
    const thread = await prisma.communicationThread.findUnique({
      where: { id },
    });

    if (!thread) {
      return NextResponse.json({ error: "스레드를 찾을 수 없습니다" }, { status: 404 });
    }

    // 스레드 상태 업데이트
    const updatedThread = await prisma.communicationThread.update({
      where: { id },
      data: {
        status: body.status,
      },
    });

    // 해당 스레드의 모든 사용자 메시지를 읽음 처리
    await prisma.communicationMessage.updateMany({
      where: {
        threadId: id,
        authorType: "user",
        isReadByAdmin: false,
      },
      data: {
        isReadByAdmin: true,
        readByAdminAt: new Date(),
      },
    });

    return NextResponse.json(updatedThread);
  } catch (error) {
    console.error("PATCH /api/admin/communication/threads/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 스레드 삭제 (관리자)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;

    // 스레드 존재 확인
    const thread = await prisma.communicationThread.findUnique({
      where: { id },
    });

    if (!thread) {
      return NextResponse.json({ error: "스레드를 찾을 수 없습니다" }, { status: 404 });
    }

    // 스레드 삭제 (메시지도 자동으로 삭제됨 - Cascade)
    await prisma.communicationThread.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/communication/threads/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
