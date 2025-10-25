import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST: 마케팅 지원 연장 신청 거부
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    if (!adminResponse) {
      return NextResponse.json(
        { error: "거부 사유를 입력해주세요" },
        { status: 400 }
      );
    }

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
        { status: 404 }
      );
    }

    if (extensionRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다" },
        { status: 400 }
      );
    }

    // 연장 신청 거부
    await prisma.marketingExtensionRequest.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedBy: (session.user as any).id,
        reviewedAt: new Date(),
        adminResponse,
      },
    });

    // 사용자에게 알림
    try {
      // 이메일 발송
      const { sendEmail } = await import("@/lib/email/resendClient");
      await sendEmail({
        to: extensionRequest.user.email,
        subject: "[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다",
        html: `
          <h2>마케팅 지원 연장 거부</h2>
          <p>안녕하세요, ${extensionRequest.user.이름}님!</p>
          <p>마케팅 지원 연장 신청이 거부되었습니다.</p>
          <p><strong>거부 사유:</strong> ${adminResponse}</p>
          <p>문의사항이 있으시면 관리자에게 연락 부탁드립니다.</p>
        `,
      });

      // SMS 발송
      if (extensionRequest.user.연락처) {
        const { sendSMS } = await import("@/lib/sms/ncpSensClient");
        await sendSMS(
          extensionRequest.user.연락처,
          `[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다.\n\n사유: ${adminResponse}`
        );
      }
    } catch (error) {
      console.error("알림 발송 실패:", error);
    }

    return NextResponse.json({
      success: true,
      message: "연장 신청이 거부되었습니다",
    });
  } catch (error) {
    console.error("POST /api/admin/marketing-extension/[id]/reject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
