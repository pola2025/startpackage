import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const currentAdminId = (session?.user as any)?.id;

    // super 권한만 접근 가능
    if (!session || userRole !== "super") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: "관리자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 자기 자신을 삭제할 수 없음
    if (adminId === currentAdminId) {
      return NextResponse.json(
        { error: "자기 자신을 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    if (isD1RuntimeEnabled()) {
      await callDataService("admin-domain/admin-delete", { adminId: currentAdminId, targetAdminId: adminId });
      return NextResponse.json({ success: true, message: "관리자가 삭제되었습니다." });
    }

    // 관리자 삭제
    await prisma.admin.delete({
      where: { id: adminId },
    });

    return NextResponse.json({
      success: true,
      message: "관리자가 삭제되었습니다.",
    });
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("관리자 삭제 에러:", error);
    return NextResponse.json(
      { error: "관리자 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
