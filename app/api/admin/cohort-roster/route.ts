import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import {
  buildRosterView,
  parseRosterText,
  week2ReminderAt,
  type RosterReminder,
  type RosterRow,
  type RosterUser,
} from "@/lib/cohort-roster";

const ADMIN_ROLES = ["super", "designer", "operator"];

function adminIdOf(session: unknown): string | null {
  const user = (session as { user?: { id?: string; role?: string } } | null)
    ?.user;
  if (!user || !ADMIN_ROLES.includes(String(user.role))) return null;
  return user.id ? String(user.id) : null;
}

type Detail = {
  cohort: { id: string; name: string; startAt: number; deadlineAt: number };
  roster: RosterRow[];
  users: RosterUser[];
  reminders: RosterReminder[];
};

/** 기수 대상자 명단과 각 대상자의 가입·자료 제출·2주차 안내 상태 */
export async function GET(request: NextRequest) {
  try {
    const adminId = adminIdOf(await auth());
    if (!adminId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (!isD1RuntimeEnabled()) {
      return NextResponse.json(
        { error: "명단 기능은 운영 데이터 서비스에서만 동작합니다." },
        { status: 503 },
      );
    }
    const cohortId = request.nextUrl.searchParams.get("cohortId") ?? "";
    if (!cohortId || cohortId.length > 128) {
      return NextResponse.json(
        { error: "기수를 확인해주세요." },
        { status: 400 },
      );
    }
    const detail = await callDataService<Detail>("roster-domain/detail", {
      adminId,
      cohortId,
    });
    return NextResponse.json({
      cohort: {
        ...detail.cohort,
        week2ReminderAt: week2ReminderAt(detail.cohort.startAt),
      },
      ...buildRosterView(detail),
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("[startpackage/cohort-roster] 조회 실패:", error);
    return NextResponse.json(
      { error: "명단을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

/** "이름 연락처" 줄을 명단에 추가한다. 이미 있는 연락처는 건너뛴다. */
export async function POST(request: NextRequest) {
  try {
    const adminId = adminIdOf(await auth());
    if (!adminId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { error: "application/json 요청만 허용됩니다." },
        { status: 415 },
      );
    }
    if (!isD1RuntimeEnabled()) {
      return NextResponse.json(
        { error: "명단 기능은 운영 데이터 서비스에서만 동작합니다." },
        { status: 503 },
      );
    }
    const body = (await request.json().catch(() => null)) as {
      cohortId?: unknown;
      text?: unknown;
    } | null;
    const cohortId = typeof body?.cohortId === "string" ? body.cohortId : "";
    const text = typeof body?.text === "string" ? body.text : "";
    if (
      !cohortId ||
      cohortId.length > 128 ||
      !text.trim() ||
      text.length > 30_000
    ) {
      return NextResponse.json(
        { error: "기수와 명단을 확인해주세요." },
        { status: 400 },
      );
    }
    const parsed = parseRosterText(text);
    if (parsed.errors.length > 0 || parsed.entries.length === 0) {
      return NextResponse.json(
        { error: "명단 형식을 확인해주세요.", errors: parsed.errors },
        { status: 400 },
      );
    }
    const result = await callDataService<{ added: number; duplicates: number }>(
      "roster-domain/add",
      { adminId, cohortId, entries: parsed.entries },
    );
    return NextResponse.json(result);
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("[startpackage/cohort-roster] 추가 실패:", error);
    return NextResponse.json(
      { error: "명단을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
