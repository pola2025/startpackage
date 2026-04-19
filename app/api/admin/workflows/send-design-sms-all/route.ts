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
    const { workflowIds } = body;

    if (
      !workflowIds ||
      !Array.isArray(workflowIds) ||
      workflowIds.length === 0
    ) {
      return NextResponse.json(
        { error: "워크플로우 ID 목록이 필요합니다." },
        { status: 400 },
      );
    }

    // Get workflows with user info
    const workflows = await prisma.workflow.findMany({
      where: {
        id: { in: workflowIds },
        시안URL: { not: null },
      },
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

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // SMS 메시지
    const message = `[스타트패키지]\n\n디자인 시안이 업로드되었습니다.\n확인 부탁드립니다.`;

    for (const workflow of workflows) {
      try {
        if (!workflow.user.연락처) {
          failedCount++;
          results.push({
            workflowId: workflow.id,
            userName: workflow.user.이름,
            success: false,
            error: "연락처 없음",
          });
          continue;
        }

        // Send SMS
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

        successCount++;
        results.push({
          workflowId: workflow.id,
          userName: workflow.user.이름,
          success: true,
        });

        console.log(
          `✅ 시안 완료 SMS 발송 성공: ${workflow.user.이름} (${workflow.type})`,
        );
      } catch (error: any) {
        failedCount++;
        results.push({
          workflowId: workflow.id,
          userName: workflow.user.이름,
          success: false,
          error: "SMS 발송 실패",
        });
        console.error(
          `❌ SMS 발송 실패: ${workflow.user.이름} / ${String(
            error?.message || error,
          ).slice(0, 200)}`,
        );
      }
    }

    console.log(
      `📊 SMS 일괄 발송 완료: 성공 ${successCount}건, 실패 ${failedCount}건`,
    );

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error("SMS 일괄 발송 에러:", error);
    return NextResponse.json(
      { error: "SMS 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
