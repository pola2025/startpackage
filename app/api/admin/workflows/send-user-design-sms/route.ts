import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendSMS, getSenderPhoneByAdmin } from "@/lib/sms/ncpSensClient";
import {
  sendEmail,
  getDesignCompleteEmailHTML,
} from "@/lib/email/resendClient";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        이름: true,
        연락처: true,
        email: true,
        telegramChatId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!user.연락처) {
      return NextResponse.json(
        { error: "사용자 연락처가 없습니다." },
        { status: 400 },
      );
    }

    // Get workflows with design uploaded
    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
        시안URL: { not: null },
      },
    });

    if (workflows.length === 0) {
      return NextResponse.json(
        { error: "시안이 업로드된 워크플로우가 없습니다." },
        { status: 400 },
      );
    }

    // Send SMS
    const smsMessage = `[스타트패키지]\n\n디자인 시안이 업로드되었습니다.\n확인 부탁드립니다.`;

    const adminFrom = getSenderPhoneByAdmin(session.user?.email);
    await sendSMS(
      user.연락처,
      smsMessage,
      adminFrom ? { from: adminFrom } : undefined,
    );

    // Send Email
    if (user.email) {
      const emailHTML = getDesignCompleteEmailHTML({
        userName: user.이름 || "사용자",
        workflowCount: workflows.length,
      });

      await sendEmail({
        to: user.email,
        subject: "[스타트패키지] 디자인 시안이 업로드되었습니다",
        html: emailHTML,
      });
    }

    // Log notification
    await prisma.notification.create({
      data: {
        userId,
        type: "시안완료",
        channel: "SMS",
        title: `[스타트패키지] 시안 완료`,
        message: smsMessage,
        status: "성공",
        sentBy: (session.user as any).id,
        sentByName: (session.user as any).name || "관리자",
      },
    });

    // 텔레그램은 발송하지 않음 (사용자는 SMS와 이메일로만 알림 받음)

    console.log(
      `✅ ${user.이름}님에게 시안 완료 SMS${user.email ? " & 이메일" : ""} 발송 완료 (${workflows.length}개)`,
    );

    return NextResponse.json({
      success: true,
      message: "SMS 발송 완료",
      count: workflows.length,
    });
  } catch (error: any) {
    console.error("SMS 발송 에러:", error);
    return NextResponse.json(
      { error: "SMS 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
