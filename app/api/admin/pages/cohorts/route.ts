import { auth } from "@/auth";
import { callDataService } from "@/lib/d1/service-client";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { parsePageSize, ReadPolicyError, signCursor, verifyCursor } from "@/lib/d1/read-policy";
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
    if (!isD1RuntimeEnabled()) {
      const size = parsePageSize(params.get("pageSize") ?? undefined);
      const cursor = params.get("cursor");
      const secret = process.env.D1_CURSOR_SECRET || process.env.NEXTAUTH_SECRET;
      if (!secret || secret.length < 16) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
      const where = cursor
        ? (() => {
            const decoded = verifyCursor(secret, cursor, "admin-pages-cohorts-start-desc", ["교육시작일", "id"]);
            return {
              OR: [
                { 교육시작일: { lt: new Date(Number(decoded.sort[0]?.value)) } },
                {
                  교육시작일: new Date(Number(decoded.sort[0]?.value)),
                  id: { lt: String(decoded.sort[1]?.value ?? "") },
                },
              ],
            };
          })()
        : undefined;
      const rows = await prisma.cohort.findMany({
        take: size + 1,
        where,
        include: { _count: { select: { users: true } } },
        orderBy: [{ 교육시작일: "desc" }, { id: "desc" }],
      });
      const items = rows.slice(0, size);
      const last = items[items.length - 1];
      return NextResponse.json({
        items,
        ...(rows.length > size && last
          ? {
              nextCursor: signCursor(secret, {
                version: 1,
                scope: "admin-pages-cohorts-start-desc",
                sort: [
                  { field: "교육시작일", value: String(last.교육시작일.getTime()) },
                  { field: "id", value: last.id },
                ],
              }),
            }
          : {}),
      });
    }
    const result = await callDataService("admin-pages/cohorts-page", {
    adminId: session.user.id,
    pageSize: params.get("pageSize") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReadPolicyError) {
      return NextResponse.json({ error: "Invalid pagination cursor" }, { status: 400 });
    }
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
