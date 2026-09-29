import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { loadLoginBlocks, releaseLoginBlocks } from "@/lib/auth/login-blocks";

const ADMIN_ROLES = new Set(["super", "designer", "operator"]);

const releaseSchema = z.object({
  keyHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(50),
}).strict();

async function adminId(): Promise<string | null> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role || !ADMIN_ROLES.has(user.role)) return null;
  return user.id;
}

const noStore = { headers: { "Cache-Control": "private, no-store" } };

/** GET /api/admin/login-blocks — 현재 로그인 차단 목록(회원 대조 포함) */
export async function GET() {
  try {
    const id = await adminId();
    if (!id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    // D1 분산 제한기가 없으면(로컬 개발) 차단은 서버 메모리에만 있고 15분 뒤 사라진다.
    if (!isD1RuntimeEnabled()) return NextResponse.json({ enabled: false, windowMinutes: 15, users: [], others: [] }, noStore);
    return NextResponse.json({ enabled: true, ...(await loadLoginBlocks(id)) }, noStore);
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("GET /api/admin/login-blocks error:", error);
    return NextResponse.json({ error: "로그인 차단 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

/** POST /api/admin/login-blocks { keyHashes } — 선택한 차단 기록을 지워 즉시 다시 로그인할 수 있게 한다 */
export async function POST(request: Request) {
  try {
    const id = await adminId();
    if (!id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    if (!isD1RuntimeEnabled()) return NextResponse.json({ error: "이 환경에서는 차단 해제를 사용할 수 없습니다." }, { status: 409 });
    const parsed = releaseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "해제할 차단을 선택해주세요." }, { status: 400 });
    const result = await releaseLoginBlocks(id, parsed.data.keyHashes);
    console.info("[login-blocks] released", { adminId: id, requested: parsed.data.keyHashes.length, cleared: result.cleared });
    return NextResponse.json(result, noStore);
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("POST /api/admin/login-blocks error:", error);
    return NextResponse.json({ error: "로그인 차단을 해제하지 못했습니다." }, { status: 500 });
  }
}
