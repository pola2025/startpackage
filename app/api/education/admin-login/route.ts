import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { educationData, recordEducationSecurityHit } from "@/lib/education/data";
import { educationRequestMeta, isAutomatedAgent } from "@/lib/education/request-meta";
import { createEducationSession, EDUCATION_COOKIE, educationCookieOptions } from "@/lib/education/session";

function sameSecret(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function POST(request: Request) {
  let meta;
  try { meta = educationRequestMeta(request); } catch { return NextResponse.json({ error: "접속 정보를 확인할 수 없습니다." }, { status: 400 }); }
  if (process.env.NODE_ENV === "production" && isAutomatedAgent(meta.userAgent)) {
    await recordEducationSecurityHit(meta, "automated-admin-login");
    return NextResponse.json({ error: "접근이 차단되었습니다." }, { status: 403 });
  }
  let password = "";
  try { const body = await request.json(); password = typeof body?.password === "string" ? body.password : ""; } catch { /* handled below */ }
  const expected = process.env.EDUCATION_ADMIN_PASSWORD;
  if (!expected || expected.length < 12) return NextResponse.json({ error: "관리자 환경변수 설정이 필요합니다." }, { status: 503 });
  const ok = password.length <= 256 && sameSecret(password, expected);
  try { await educationData("admin-login-event", { ...meta, outcome: ok ? "success" : "denied" }); }
  catch { return NextResponse.json({ error: "관리자 로그인이 잠시 제한되었습니다." }, { status: 429 }); }
  if (!ok) return NextResponse.json({ error: "관리자 비밀번호가 일치하지 않습니다." }, { status: 401 });
  const session = createEducationSession({ mode: "admin", name: "관리자", ipHash: meta.ipHash });
  const response = NextResponse.json({ ok: true, course: "/education/course/meta-training-chapters.html" });
  response.cookies.set(EDUCATION_COOKIE, session.token, educationCookieOptions(session.expiresAt));
  return response;
}
