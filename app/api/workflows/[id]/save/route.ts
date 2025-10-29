import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * POST /api/workflows/[id]/save
 *
 * 워크플로우 저장 (임시저장 또는 최종저장)
 */

const saveSchema = z.object({
  workflowData: z.record(z.unknown()).optional(), // 워크플로우 데이터
  isDraft: z.boolean().default(true), // true: 임시저장, false: 최종저장
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { id: workflowId } = await params;
    const userId = (session.user as any).id;

    // 워크플로우 권한 확인
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = saveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { workflowData, isDraft } = validation.data;

    // 최종저장일 경우 필수 필드 검증
    if (!isDraft) {
      const requiredFields = await prisma.requiredFieldConfig.findMany({
        where: {
          workflowType: workflow.type,
          isActive: true,
        },
      });

      const missingFields: string[] = [];
      const data = workflowData || (workflow.workflowData as Record<string, unknown>) || {};

      for (const field of requiredFields) {
        const value = data[field.fieldName];

        if (field.validationType === "notEmpty") {
          if (!value || (typeof value === "string" && value.trim() === "")) {
            missingFields.push(field.fieldLabel);
          }
        }

        if (field.minLength && typeof value === "string" && value.length < field.minLength) {
          missingFields.push(field.fieldLabel);
        }

        if (field.maxLength && typeof value === "string" && value.length > field.maxLength) {
          missingFields.push(field.fieldLabel);
        }

        if (field.validationType === "email" && typeof value === "string") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            missingFields.push(field.fieldLabel);
          }
        }

        if (field.validationType === "phone" && typeof value === "string") {
          const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
          if (!phoneRegex.test(value)) {
            missingFields.push(field.fieldLabel);
          }
        }
      }

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "필수 정보를 모두 입력해주세요.",
            missingFields,
            message: `다음 필드를 확인해주세요: ${missingFields.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // 워크플로우 업데이트
    const now = new Date();
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(workflowData && { workflowData }),
        isDraft,
        draftSavedAt: isDraft ? now : workflow.draftSavedAt,
        updatedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: isDraft
        ? "임시저장되었습니다. 필수 정보를 모두 입력 후 최종 저장해주세요."
        : "저장되었습니다.",
      workflow: {
        id: updatedWorkflow.id,
        isDraft: updatedWorkflow.isDraft,
        draftSavedAt: updatedWorkflow.draftSavedAt,
        updatedAt: updatedWorkflow.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ 워크플로우 저장 실패:", error);
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
