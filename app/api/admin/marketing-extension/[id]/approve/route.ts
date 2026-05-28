import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  ONLINE_MARKETING_BILLING_MONTHS,
  ONLINE_MARKETING_MONTHLY_PRICE,
  ONLINE_MARKETING_TOTAL_PRICE,
  formatManwon,
  formatWon,
} from "@/lib/marketing-pricing";

// POST: 마케팅 지원 연장 신청 승인
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { adminResponse } = body;

    // 연장 신청 조회
    const extensionRequest = await prisma.marketingExtensionRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            이름: true,
            email: true,
            연락처: true,
          },
        },
      },
    });

    if (!extensionRequest) {
      return NextResponse.json(
        { error: "신청을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (extensionRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다" },
        { status: 400 },
      );
    }

    // 연장 신청 승인
    await prisma.marketingExtensionRequest.update({
      where: { id },
      data: {
        status: "approved",
        reviewedBy: (session.user as any).id,
        reviewedAt: new Date(),
        adminResponse,
      },
    });

    // 사용자의 마케팅 지원 종료일 연장
    await prisma.user.update({
      where: { id: extensionRequest.userId },
      data: {
        marketingSupportEndDate: extensionRequest.newEndDate,
      },
    });

    // 사용자에게 알림
    try {
      // 이메일 발송
      const { sendEmail } = await import("@/lib/email/resendClient");
      await sendEmail({
        to: extensionRequest.user.email,
        subject: "[스타트패키지] 마케팅 지원 연장 신청이 승인되었습니다",
        html: `
          <h2>마케팅 지원 연장 승인</h2>
          <p>안녕하세요, ${extensionRequest.user.이름}님!</p>
          <p>마케팅 지원 연장 신청이 승인되었습니다.</p>
          <p><strong>새로운 종료일:</strong> ${extensionRequest.newEndDate.toLocaleDateString("ko-KR")}</p>
          ${adminResponse ? `<p><strong>관리자 메시지:</strong> ${adminResponse}</p>` : ""}
          <hr />
          <p><strong>결제 정보:</strong></p>
          <ul>
            <li>계좌번호: 우리은행 1005-302-954803</li>
            <li>예금주: 폴라애드(이재호)</li>
            <li>금액: ${formatWon(ONLINE_MARKETING_TOTAL_PRICE)}원 (VAT 포함, ${ONLINE_MARKETING_BILLING_MONTHS}개월분)</li>
            <li>월 ${formatWon(ONLINE_MARKETING_MONTHLY_PRICE)}원 (VAT 포함)</li>
          </ul>
          <p>결제 후 확인 부탁드립니다.</p>
        `,
      });

      // SMS 발송
      if (extensionRequest.user.연락처) {
        const { sendSMS, getSenderPhoneByAdmin } =
          await import("@/lib/sms/ncpSensClient");
        const adminFrom = getSenderPhoneByAdmin(session.user?.email);
        await sendSMS(
          extensionRequest.user.연락처,
          `[스타트패키지] 마케팅 지원 연장이 승인되었습니다.\n\n새로운 종료일: ${extensionRequest.newEndDate.toLocaleDateString("ko-KR")}\n\n결제 정보: 우리은행 1005-302-954803 폴라애드(이재호) / ${formatManwon(ONLINE_MARKETING_TOTAL_PRICE)}(VAT포함)`,
          adminFrom ? { from: adminFrom } : undefined,
        );
      }
    } catch (error) {
      console.error("알림 발송 실패:", error);
    }

    return NextResponse.json({
      success: true,
      message: "연장 신청이 승인되었습니다",
    });
  } catch (error) {
    console.error(
      "POST /api/admin/marketing-extension/[id]/approve error:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
