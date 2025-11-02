import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAlertSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  content: z.string().min(1, "내용을 입력해주세요"),
  type: z.enum(["info", "warning", "urgent"]),
  priority: z.number().int().min(0),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * GET /api/admin/alerts
 * 모든 알림 조회 (관리자용)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const alerts = await prisma.systemAlert.findMany({
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error("알림 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/alerts
 * 알림 생성 (관리자용)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, content, type, priority, startDate, endDate } = validation.data;

    const alert = await prisma.systemAlert.create({
      data: {
        title,
        content,
        type,
        priority,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        createdBy: session.user.id,
        createdByName: session.user.name || "관리자",
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("알림 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
