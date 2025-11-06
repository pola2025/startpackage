import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH: 공지사항 수정 (관리자)
export async function PATCH(
  request: NextRequest,
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
    const { title, content, imageUrls, youtubeUrl, published } = body;

    // 공지사항 존재 여부 확인
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 공지사항 수정
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(imageUrls !== undefined && { imageUrls: Array.isArray(imageUrls) ? imageUrls : [] }),
        ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
        ...(published !== undefined && { published }),
      },
    });

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error) {
    console.error("PATCH /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: 공지사항 삭제 (관리자)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;

    // 공지사항 존재 여부 확인
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 공지사항 삭제
    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "공지사항이 삭제되었습니다",
    });
  } catch (error) {
    console.error("DELETE /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
