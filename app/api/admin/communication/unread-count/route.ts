import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

/**
 * GET /api/admin/communication/unread-count
 *
 * 관리자가 읽지 않은 사용자 메시지 개수 조회
 */
export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }
    if (isD1RuntimeEnabled()) return NextResponse.json(await callDataService("communication-domain/admin-unread-count", { adminId: (session.user as any).id }));

    // 관리자가 읽지 않은 사용자 메시지 개수
    const unreadCount = await prisma.communicationMessage.count({
      where: {
        authorType: "user",
        isReadByAdmin: false,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("❌ 미확인 메시지 개수 조회 실패:", error);
    return NextResponse.json(
      { error: "미확인 메시지 개수 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
