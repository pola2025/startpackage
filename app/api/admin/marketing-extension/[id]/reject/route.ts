import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService, DataServiceRequestError } from "@/lib/d1/service-client";

// POST: 마케팅 지원 연장 신청 거부
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

    if (!adminResponse) {
      return NextResponse.json(
        { error: "거부 사유를 입력해주세요" },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      const result = await callDataService<Record<string, unknown>>("admin-domain/extension-reject", { adminId: (session.user as { id: string }).id, id, adminResponse });
      const email = String(result.userEmail ?? ""); const name = String(result.userName ?? ""); const phone = typeof result.userPhone === "string" ? result.userPhone : "";
      try {
        const { sendEmail } = await import("@/lib/email/resendClient");
        await sendEmail({ to: email, subject: "[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다", html: `<h2>마케팅 지원 연장 거부</h2><p>안녕하세요, ${name}님!</p><p>마케팅 지원 연장 신청이 거부되었습니다.</p><p><strong>거부 사유:</strong> ${adminResponse}</p><p>문의사항이 있으시면 관리자에게 연락 부탁드립니다.</p>` });
        if (phone) { const { sendSMS, getSenderPhoneByAdmin } = await import("@/lib/sms/ncpSensClient"); const from = getSenderPhoneByAdmin(session.user?.email); await sendSMS(phone, `[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다.\n\n사유: ${adminResponse}`, from ? { from } : undefined); }
      } catch (notificationError) { console.error("알림 발송 실패:", notificationError); }
      return NextResponse.json({ success: true, message: "연장 신청이 거부되었습니다" });
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
        { status: 404 },
      );
    }

    if (extensionRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다" },
        { status: 400 },
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
        const { sendSMS, getSenderPhoneByAdmin } =
          await import("@/lib/sms/ncpSensClient");
        const adminFrom = getSenderPhoneByAdmin(session.user?.email);
        await sendSMS(
          extensionRequest.user.연락처,
          `[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다.\n\n사유: ${adminResponse}`,
          adminFrom ? { from: adminFrom } : undefined,
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
    if (error instanceof DataServiceRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(
      "POST /api/admin/marketing-extension/[id]/reject error:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
