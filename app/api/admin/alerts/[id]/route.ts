import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAlertSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(["info", "warning", "urgent"]).optional(),
  priority: z.number().int().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  cohortId: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
});

/**
 * PATCH /api/admin/alerts/[id]
 * 알림 수정 (활성화 토글 포함)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 },
      );
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.cohortId !== undefined) updateData.cohortId = data.cohortId;
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;

    const alert = await prisma.systemAlert.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("알림 수정 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/alerts/[id]
 * 알림 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 },
      );
    }

    const { id } = await params;

    await prisma.systemAlert.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("알림 삭제 실패:", error);
    return NextResponse.json(
      { success: false, error: "알림 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
