import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { educationData } from "@/lib/education/data";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

function adminId(session: any): string | null {
  if (!session || !["super","designer","operator"].includes(String((session.user as { role?: string })?.role))) return null;
  return String((session.user as { id?: string }).id ?? "") || null;
}

export async function GET(request: Request) {
  try {
    const session = await auth(); const id = adminId(session);
    if (!id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    const params = new URL(request.url).searchParams; const kind = params.get("kind") ?? "dashboard";
    if (kind === "dashboard") {
      const [summary, events, extensions, blocks] = await Promise.all([
        educationData("admin-summary", { adminId: id }), educationData("admin-events", { adminId: id, pageSize: 30 }),
        educationData("admin-extensions", { adminId: id, pageSize: 30 }), educationData("admin-blocks", { adminId: id }),
      ]);
      return NextResponse.json({ summary, events, extensions, blocks });
    }
    if (!new Set(["events","extensions","blocks"]).has(kind)) return NextResponse.json({ error: "잘못된 조회입니다." }, { status: 400 });
    const operation = kind === "events" ? "admin-events" : kind === "extensions" ? "admin-extensions" : "admin-blocks";
    return NextResponse.json(await educationData(operation, { adminId: id, pageSize: params.get("pageSize") ?? "30", cursor: params.get("cursor") ?? undefined }));
  } catch (error) { const serviceError=dataServiceErrorResponse(error); if(serviceError)return serviceError; return NextResponse.json({error:"교육자료 접근 기록을 불러오지 못했습니다."},{status:500}); }
}

export async function POST(request: Request) {
  try {
    const session=await auth();const id=adminId(session);if(!id)return NextResponse.json({error:"권한이 없습니다."},{status:403});
    const body=await request.json();
    if(body.action==="unblock"&&typeof body.ipHash==="string")return NextResponse.json(await educationData("ip-unblock",{adminId:id,ipHash:body.ipHash}));
    if(body.action==="approve"||body.action==="reject"){
      if(typeof body.requestId!=="string")return NextResponse.json({error:"신청 정보가 없습니다."},{status:400});
      const approvedUntil=body.action==="approve"?new Date(String(body.approvedUntil)).getTime():undefined;
      if(body.action==="approve"&&!Number.isFinite(approvedUntil))return NextResponse.json({error:"연장 종료일을 확인해주세요."},{status:400});
      return NextResponse.json(await educationData("extension-review",{adminId:id,requestId:body.requestId,action:body.action,approvedUntil,adminNote:typeof body.adminNote==="string"?body.adminNote:""}));
    }
    return NextResponse.json({error:"잘못된 작업입니다."},{status:400});
  } catch(error){const serviceError=dataServiceErrorResponse(error);if(serviceError)return serviceError;return NextResponse.json({error:"요청을 처리하지 못했습니다."},{status:500});}
}
