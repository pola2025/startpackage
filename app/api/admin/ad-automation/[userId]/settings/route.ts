import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  // 광고 자동화
  adAutomationEnabled: z.boolean(),
  adAutomationStartDate: z.string().datetime().optional().nullable(),
  adAutomationEndDate: z.string().datetime().optional().nullable(),

  // SMS 설정
  smsSettingEnabled: z.boolean(),
  smsSettingStartDate: z.string().datetime().optional().nullable(),
  smsSettingEndDate: z.string().datetime().optional().nullable(),

  // 네이버 광고 설정
  naverAdSettingEnabled: z.boolean(),
  naverAdSettingStartDate: z.string().datetime().optional().nullable(),
  naverAdSettingEndDate: z.string().datetime().optional().nullable(),

  // 홈페이지 설정
  homepageCompleted: z.boolean(),
  homepageCompletedAt: z.string().datetime().optional().nullable(),

  reason: z.string().optional(),
});

/**
 * POST /api/admin/ad-automation/[userId]/settings
 *
 * 광고 자동화 전체 설정 업데이트 (관리자용)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 인증 확인
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session?.user || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        marketingSupportEndDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "잘못된 요청입니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      adAutomationEnabled,
      adAutomationStartDate,
      adAutomationEndDate,
      smsSettingEnabled,
      smsSettingStartDate,
      smsSettingEndDate,
      naverAdSettingEnabled,
      naverAdSettingStartDate,
      naverAdSettingEndDate,
      homepageCompleted,
      homepageCompletedAt,
      reason,
    } = validation.data;

    // 사용자 상태 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        // 광고 자동화
        adAutomationEnabled,
        adAutomationStartDate: adAutomationStartDate ? new Date(adAutomationStartDate) : null,
        adAutomationEndDate: adAutomationEndDate ? new Date(adAutomationEndDate) : null,

        // SMS 설정
        smsSettingEnabled,
        smsSettingStartDate: smsSettingStartDate ? new Date(smsSettingStartDate) : null,
        smsSettingEndDate: smsSettingEndDate ? new Date(smsSettingEndDate) : null,

        // 네이버 광고 설정
        naverAdSettingEnabled,
        naverAdSettingStartDate: naverAdSettingStartDate ? new Date(naverAdSettingStartDate) : null,
        naverAdSettingEndDate: naverAdSettingEndDate ? new Date(naverAdSettingEndDate) : null,

        // 홈페이지 설정
        homepageCompleted,
        homepageCompletedAt: homepageCompletedAt ? new Date(homepageCompletedAt) : null,
      },
    });

    // 홈페이지 완료 체크 시 워크플로우 자동 생성 또는 업데이트
    if (homepageCompleted) {
      // 기존 홈페이지 워크플로우가 있는지 확인
      const existingWorkflow = await prisma.workflow.findFirst({
        where: {
          userId,
          type: "홈페이지",
        },
      });

      if (existingWorkflow) {
        // 기존 워크플로우가 있으면 제작완료로 상태 변경
        await prisma.workflow.update({
          where: { id: existingWorkflow.id },
          data: { status: "제작완료" },
        });
      } else {
        // 기존 워크플로우가 없으면 새로 생성하고 바로 제작완료 상태로 설정
        await prisma.workflow.create({
          data: {
            userId,
            type: "홈페이지",
            status: "제작완료",
          },
        });
      }
    }

    // 이력 기록 (광고 자동화만)
    await prisma.adAutomationHistory.create({
      data: {
        userId,
        action: adAutomationEnabled ? "enabled" : "disabled",
        actionBy: session.user.id,
        actionByName: session.user.name || "관리자",
        reason: reason || "설정 변경",
        startDate: adAutomationStartDate ? new Date(adAutomationStartDate) : null,
        endDate: adAutomationEndDate ? new Date(adAutomationEndDate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "설정이 저장되었습니다.",
      data: {
        adAutomationEnabled: updatedUser.adAutomationEnabled,
        smsSettingEnabled: updatedUser.smsSettingEnabled,
        naverAdSettingEnabled: updatedUser.naverAdSettingEnabled,
        homepageCompleted: updatedUser.homepageCompleted,
      },
    });
  } catch (error) {
    console.error("설정 저장 실패:", error);
    return NextResponse.json(
      { success: false, error: "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
