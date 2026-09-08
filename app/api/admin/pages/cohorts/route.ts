import { auth } from "@/auth";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { NextResponse } from "next/server";

const ADMIN_ROLES = new Set(["super", "designer", "operator"]);

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user?.id || !role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const result = await callDataService("admin-pages/cohorts-page", {
    adminId: session.user.id,
    pageSize: params.get("pageSize") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
