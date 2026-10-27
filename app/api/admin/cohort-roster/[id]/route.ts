import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

/** 명단에서 한 명을 뺀다. 이미 가입한 회원 계정에는 영향이 없다. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (!isD1RuntimeEnabled()) {
      return NextResponse.json(
        { error: "명단 기능은 운영 데이터 서비스에서만 동작합니다." },
        { status: 503 },
      );
    }
    const { id } = await params;
    const cohortId = request.nextUrl.searchParams.get("cohortId") ?? "";
    if (!id || id.length > 128 || !cohortId || cohortId.length > 128) {
      return NextResponse.json({ error: "대상을 확인해주세요." }, { status: 400 });
    }
    await callDataService("roster-domain/delete", {
      adminId: (session.user as { id: string }).id,
      cohortId,
      id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("[startpackage/cohort-roster] 삭제 실패:", error);
    return NextResponse.json(
      { error: "명단에서 빼지 못했습니다." },
      { status: 500 },
    );
  }
}
