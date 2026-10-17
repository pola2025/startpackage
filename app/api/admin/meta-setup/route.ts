import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

const NO_STORE = { "Cache-Control": "no-store" };
const PAGE_SIZE = 30;
const MAX_CURSOR_LENGTH = 2048;

/**
 * GET /api/admin/meta-setup?stage=pending|done&cursor=...
 * Meta 설정요청 목록 (처리 대기: 요청이 오래된 사람부터, 완료: 최근 완료부터, 30명씩)
 * GET /api/admin/meta-setup?count=1 → 사이드바 숫자용 처리 대기·완료 인원
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (
    !session?.user?.id ||
    !userRole ||
    !["super", "designer", "operator"].includes(userRole)
  ) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (!isD1RuntimeEnabled())
    return NextResponse.json(
      { error: "지금은 사용할 수 없습니다." },
      { status: 503 },
    );

  const params = request.nextUrl.searchParams;
  try {
    if (params.get("count") === "1") {
      const counts = await callDataService<{ pending: number; done: number }>(
        "content-domain/meta-setup-admin-count",
        { adminId: session.user.id },
      );
      return NextResponse.json(counts, { headers: NO_STORE });
    }

    const stage = params.get("stage") ?? "pending";
    if (stage !== "pending" && stage !== "done") {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 },
      );
    }
    const cursor = params.get("cursor") || undefined;
    if (cursor && cursor.length > MAX_CURSOR_LENGTH) {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 },
      );
    }

    const result = await callDataService(
      "content-domain/meta-setup-admin-list",
      {
        adminId: session.user.id,
        stage,
        pageSize: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      },
    );
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("[admin/meta-setup] 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Meta 설정요청 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
