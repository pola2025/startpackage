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

    if (isD1RuntimeEnabled()) {
      await callDataService("admin-domain/cohort-delete", { adminId: (session.user as { id: string }).id, id: cohortId });
      return NextResponse.json({ success: true, message: "기수가 삭제되었습니다." });
    }

    const userCount = await prisma.user.count({
      where: { cohortId },
    });

    if (userCount > 0) {
      return NextResponse.json(
        {
          error: `해당 기수에 ${userCount}명의 회원이 등록되어 있습니다. 회원을 먼저 삭제하거나 다른 기수로 이동시켜주세요.`,
          userCount
        },
        { status: 400 }
      );
    }

    await prisma.cohort.delete({
      where: { id: cohortId },
    });

    return NextResponse.json({
      success: true,
      message: "기수가 삭제되었습니다.",
    });
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("기수 삭제 에러:", error);
    return NextResponse.json(
      { error: "기수 삭제 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
