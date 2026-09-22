import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { loginEducationStudent, recordEducationSecurityHit } from "@/lib/education/data";
import { educationRequestMeta, isAutomatedAgent } from "@/lib/education/request-meta";
import { createEducationSession, EDUCATION_COOKIE, educationCookieOptions } from "@/lib/education/session";
import { DataServiceRequestError } from "@/lib/d1/service-client";

export async function POST(request: Request) {
  let meta;
  try { meta = educationRequestMeta(request); } catch { return NextResponse.json({ error: "접속 정보를 확인할 수 없습니다." }, { status: 400 }); }
  if (process.env.NODE_ENV === "production" && isAutomatedAgent(meta.userAgent)) {
    await recordEducationSecurityHit(meta, "automated-login");
    return NextResponse.json({ error: "접근이 차단되었습니다." }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "전화번호를 확인해주세요." }, { status: 400 }); }
  const phone = typeof (body as { phone?: unknown })?.phone === "string" ? (body as { phone: string }).phone.replace(/\D/g, "") : "";
  if (!/^01\d{8,9}$/.test(phone)) return NextResponse.json({ error: "등록한 전화번호를 입력해주세요." }, { status: 400 });
  const hashSecret = process.env.EDUCATION_IP_HASH_SECRET;
  if (!hashSecret) return NextResponse.json({ error: "교육 포털 설정을 확인해주세요." }, { status: 503 });
  const accountHash = createHmac("sha256", hashSecret).update(phone).digest("hex");
  try {
    const user = await loginEducationStudent(phone, accountHash, meta);
    if (user.outcome === "not_started") return NextResponse.json({ error: "교육 시작일부터 열람할 수 있습니다.", startAt: user.startAt }, { status: 403 });
    if (user.outcome === "expired") return NextResponse.json({ error: "8주 열람기간이 종료되었습니다.", expired: true }, { status: 403 });
    const session = createEducationSession({ mode: "student", userId: user.id, cohortId: user.cohortId, name: user.name, cohortName: user.cohortName, ipHash: meta.ipHash, accessEndAt: user.endAt });
    const response = NextResponse.json({ ok: true, course: "/education/course/meta-training-chapters.html" });
    response.cookies.set(EDUCATION_COOKIE, session.token, educationCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    if (error instanceof DataServiceRequestError) {
      const status = error.status === 429 ? 429 : error.status === 401 ? 401 : 503;
      return NextResponse.json({ error: status === 429 ? "잠시 후 다시 시도해주세요." : status === 401 ? "등록된 교육생 정보를 찾을 수 없습니다." : "교육 포털에 잠시 연결할 수 없습니다." }, { status });
    }
    return NextResponse.json({ error: "교육 포털에 잠시 연결할 수 없습니다." }, { status: 500 });
  }
}
