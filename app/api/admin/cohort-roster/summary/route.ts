import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import {
  buildRosterView,
  type RosterRow,
  type RosterUser,
} from "@/lib/cohort-roster";

const MAX_IDS = 50;

/** 기수 목록 화면의 "대상자" 칸: 기수별 명단·가입·자료 제출 완료 수 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (!isD1RuntimeEnabled()) return NextResponse.json({ counts: {} });
    const ids = [
      ...new Set(
        (request.nextUrl.searchParams.get("ids") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id.length <= 128),
      ),
    ];
    if (ids.length === 0 || ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: "기수를 확인해주세요." },
        { status: 400 },
      );
    }
    const data = await callDataService<{
      roster: Array<RosterRow & { cohortId: string }>;
      users: Array<RosterUser & { cohortId: string }>;
    }>("roster-domain/summary", {
      adminId: (session.user as { id: string }).id,
      cohortIds: ids,
    });
    const counts: Record<
      string,
      { roster: number; joined: number; complete: number }
    > = {};
    for (const id of ids) {
      counts[id] = buildRosterView({
        roster: data.roster.filter((row) => row.cohortId === id),
        users: data.users.filter((row) => row.cohortId === id),
        reminders: [],
      }).counts;
    }
    return NextResponse.json({ counts });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("[startpackage/cohort-roster] 요약 실패:", error);
    return NextResponse.json(
      { error: "명단 요약을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
