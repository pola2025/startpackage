import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * GET /api/workflows/required-fields?workflowType={type}
 *
 * 특정 워크플로우 타입의 필수 필드 목록 조회
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workflowType = searchParams.get("workflowType");

    if (!workflowType) {
      return NextResponse.json(
        { error: "workflowType 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const requiredFields = await prisma.requiredFieldConfig.findMany({
      where: {
        workflowType,
        isActive: true,
      },
      orderBy: {
        fieldOrder: "asc",
      },
      select: {
        id: true,
        fieldName: true,
        fieldLabel: true,
        fieldReason: true,
        validationType: true,
        minLength: true,
        maxLength: true,
      },
    });

    return NextResponse.json({
      success: true,
      workflowType,
      requiredFields,
      count: requiredFields.length,
    });
  } catch (error) {
    console.error("❌ 필수 필드 조회 실패:", error);
    return NextResponse.json(
      { error: "필수 필드 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/required-fields/validate
 *
 * 워크플로우 데이터의 필수 필드 검증
 */
const validateSchema = z.object({
  workflowId: z.string().cuid("유효하지 않은 워크플로우 ID입니다."),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { workflowId } = validation.data;
    const userId = (session.user as any).id;

    // 워크플로우 조회
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

    // 사용자의 Submission 데이터 조회
    const submission = await prisma.submission.findUnique({
      where: {
        userId,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "제출 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 필수 필드 설정 조회
    const requiredFields = await prisma.requiredFieldConfig.findMany({
      where: {
        workflowType: workflow.type,
        isActive: true,
      },
    });

    // 검증 실행
    const missingFields: Array<{
      fieldName: string;
      fieldLabel: string;
      fieldReason: string;
    }> = [];

    // Submission 데이터를 Record로 변환
    const submissionData = submission as unknown as Record<string, unknown>;

    for (const field of requiredFields) {
      const value = submissionData[field.fieldName];

      // notEmpty 검증
      if (field.validationType === "notEmpty") {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          missingFields.push({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldReason: field.fieldReason,
          });
          continue;
        }
      }

      // minLength 검증
      if (field.minLength && typeof value === "string") {
        if (value.length < field.minLength) {
          missingFields.push({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldReason: `최소 ${field.minLength}자 이상 입력해주세요.`,
          });
          continue;
        }
      }

      // maxLength 검증
      if (field.maxLength && typeof value === "string") {
        if (value.length > field.maxLength) {
          missingFields.push({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldReason: `최대 ${field.maxLength}자까지 입력 가능합니다.`,
          });
          continue;
        }
      }

      // email 검증
      if (field.validationType === "email" && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          missingFields.push({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldReason: "올바른 이메일 형식이 아닙니다.",
          });
          continue;
        }
      }

      // phone 검증
      if (field.validationType === "phone" && typeof value === "string") {
        const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
        if (!phoneRegex.test(value)) {
          missingFields.push({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldReason: "올바른 전화번호 형식이 아닙니다.",
          });
          continue;
        }
      }
    }

    const isValid = missingFields.length === 0;
    const completionRate = Math.round(
      ((requiredFields.length - missingFields.length) /
        requiredFields.length) *
        100
    );

    return NextResponse.json({
      success: true,
      isValid,
      completionRate,
      totalFields: requiredFields.length,
      filledFields: requiredFields.length - missingFields.length,
      missingFields,
    });
  } catch (error) {
    console.error("❌ 필수 필드 검증 실패:", error);
    return NextResponse.json(
      { error: "필수 필드 검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
