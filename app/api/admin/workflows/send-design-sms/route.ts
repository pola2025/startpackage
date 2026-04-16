import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendSMS, getSenderPhoneByAdmin } from "@/lib/sms/ncpSensClient";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "워크플로우 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // Get workflow with user info
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        user: {
          select: {
            이름: true,
            연락처: true,
            telegramChatId: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!workflow.시안URL) {
      return NextResponse.json(
        { error: "시안이 업로드되지 않았습니다." },
        { status: 400 },
      );
    }

    if (!workflow.user.연락처) {
      return NextResponse.json(
        { error: "사용자 연락처가 없습니다." },
        { status: 400 },
      );
    }

    // Send SMS
    const message = `[스타트패키지]\n\n디자인 시안이 업로드되었습니다.\n확인 부탁드립니다.`;

    const adminFrom = getSenderPhoneByAdmin(session.user?.email);
    await sendSMS(
      workflow.user.연락처,
      message,
      adminFrom ? { from: adminFrom } : undefined,
    );

    // Log notification
    await prisma.notification.create({
      data: {
        userId: workflow.userId,
        type: "시안완료",
        channel: "SMS",
        title: `[스타트패키지] ${workflow.type} 시안 완료`,
        message,
        status: "성공",
        sentBy: (session.user as any).id,
        sentByName: (session.user as any).name || "관리자",
      },
    });

    // 텔레그램은 발송하지 않음 (사용자는 SMS로만 알림 받음)

    console.log(`✅ 시안 완료 SMS 발송 완료: ${workflow.user.연락처}`);

    return NextResponse.json({
      success: true,
      message: "SMS 발송 완료",
    });
  } catch (error: any) {
    console.error("SMS 발송 에러:", error);
    return NextResponse.json(
      { error: "SMS 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
