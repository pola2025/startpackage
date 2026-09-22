import { NextResponse } from "next/server";
import { requestEducationExtension, recordEducationSecurityHit } from "@/lib/education/data";
import { educationRequestMeta, isAutomatedAgent } from "@/lib/education/request-meta";
import { DataServiceRequestError } from "@/lib/d1/service-client";

export async function POST(request: Request) {
  let meta;
  try { meta = educationRequestMeta(request); } catch { return NextResponse.json({ error: "접속 정보를 확인할 수 없습니다." }, { status: 400 }); }
  if (process.env.NODE_ENV === "production" && isAutomatedAgent(meta.userAgent)) {
    await recordEducationSecurityHit(meta, "automated-extension");
    return NextResponse.json({ error: "접근이 차단되었습니다." }, { status: 403 });
  }
  let phone = "";
  try { const body = await request.json(); phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : ""; } catch { /* handled below */ }
  if (!/^01\d{8,9}$/.test(phone)) return NextResponse.json({ error: "등록한 전화번호를 입력해주세요." }, { status: 400 });
  try {
    const result = await requestEducationExtension(phone, meta);
    return NextResponse.json({ ok: true, request: result });
  } catch (error) {
    if (error instanceof DataServiceRequestError) {
      const status = [404, 429].includes(error.status) ? error.status : 503;
      return NextResponse.json({ error: status === 404 ? "등록된 교육생 정보를 찾을 수 없습니다." : status === 429 ? "요청이 많습니다. 잠시 후 다시 시도해주세요." : "연장신청을 접수할 수 없습니다." }, { status });
    }
    return NextResponse.json({ error: "연장신청을 접수할 수 없습니다." }, { status: 500 });
  }
}
