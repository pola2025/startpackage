import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paymentSchema = z.object({
  paymentDate: z.string().datetime(),
  paymentAmount: z.number().int().positive(),
  paymentMethod: z.enum(["카드", "계좌이체", "현금"]),
  receiptUrl: z.string().url().optional(),
  memo: z.string().optional(),
});

/**
 * POST /api/admin/ad-automation/[userId]/payment
 *
 * 광고자동화 결제 추가 (관리자용)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
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
        adAutomationEndDate: true,
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
    const validation = paymentSchema.safeParse(body);

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

    const { paymentDate, paymentAmount, paymentMethod, receiptUrl, memo } =
      validation.data;

    const paymentDateObj = new Date(paymentDate);

    // 서비스 기간 계산 (결제일부터 1개월)
    const serviceStartDate = paymentDateObj;
    const serviceEndDate = new Date(paymentDateObj);
    serviceEndDate.setMonth(serviceEndDate.getMonth() + 1);

    // 결제 기록 생성
    const payment = await prisma.adAutomationPayment.create({
      data: {
        userId,
        paymentDate: paymentDateObj,
        paymentAmount,
        paymentMethod,
        receiptUrl,
        serviceStartDate,
        serviceEndDate,
        status: "completed",
        memo,
        registeredBy: session.user.id,
        registeredByName: session.user.name || "관리자",
      },
    });

    // 광고자동화 활성화 및 종료일 연장
    const newEndDate =
      user.adAutomationEndDate &&
      new Date(user.adAutomationEndDate) > serviceEndDate
        ? user.adAutomationEndDate
        : serviceEndDate;

    await prisma.user.update({
      where: { id: userId },
      data: {
        adAutomationEnabled: true,
        adAutomationEndDate: newEndDate,
      },
    });

    // 이력 기록
    await prisma.adAutomationHistory.create({
      data: {
        userId,
        action: "enabled",
        actionBy: session.user.id,
        actionByName: session.user.name || "관리자",
        reason: `유료 결제 (${paymentAmount.toLocaleString()}원)`,
        startDate: serviceStartDate,
        endDate: serviceEndDate,
      },
    });

    return NextResponse.json({
      success: true,
      message: "결제가 등록되었습니다.",
      data: {
        payment,
        serviceStartDate,
        serviceEndDate,
      },
    });
  } catch (error) {
    console.error("결제 등록 실패:", error);
    return NextResponse.json(
      { success: false, error: "결제 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
