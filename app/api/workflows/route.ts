import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";

// GET: 사용자 워크플로우 목록 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (isD1RuntimeEnabled()) {
      const result = await callCore<{ items: unknown[] }>("workflows-list", userId, { userId, pageSize: 50 });
      return NextResponse.json(result.items);
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("GET /api/workflows error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
