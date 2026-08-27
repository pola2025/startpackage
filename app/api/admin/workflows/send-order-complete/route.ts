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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // 해당 사용자의 발주완료 상태인 모든 워크플로우 조회
    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
        status: "발주완료",
      },
      include: {
        user: {
          select: {
            이름: true,
            연락처: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (workflows.length === 0) {
      return NextResponse.json(
        { error: "발주완료 상태인 워크플로우가 없습니다." },
        { status: 404 },
      );
    }

    const user = workflows[0].user;

    // 발송지 안내 — 확정 시점 스냅샷을 우선하고, 없으면 제출정보를 쓴다
    const submission = await prisma.submission.findUnique({
      where: { userId },
      select: {
        인쇄물받을주소: true,
        받는분이름: true,
        수령연락처: true,
        우편번호: true,
        주소: true,
      },
    });

    const 스냅샷 = workflows.find((w) => w.확정배송지);
    const 배송지 =
      스냅샷?.확정배송지 ||
      [submission?.우편번호, submission?.인쇄물받을주소]
        .filter(Boolean)
        .join(" ") ||
      submission?.주소 ||
      null;
    const 수령인 = 스냅샷?.확정수령인 || submission?.받는분이름 || null;

    // 이메일 발송
    if (user.email) {
      const { sendEmail } = await import("@/lib/email/resendClient");

      let emailBody = `
        <h2>발주가 완료되었습니다</h2>
        <p>안녕하세요, ${user.이름}님!</p>
        <p>다음 제작물의 발주가 완료되어 제작이 진행됩니다:</p>
        <ul>
      `;

      workflows.forEach((workflow) => {
        emailBody += `<li><strong>${workflow.type}</strong></li>`;
      });

      emailBody += `
        </ul>
      `;

      if (배송지) {
        emailBody += `
        <p><strong>받으실 곳</strong><br/>${배송지}${
          수령인 ? ` (${수령인})` : ""
        }</p>
        <p style="color:#b91c1c;">발주가 진행되어 배송지는 변경할 수 없습니다.</p>
      `;
      }

      emailBody += `
        <p>제작 완료 시 다시 안내드리겠습니다.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: `[스타트패키지] 발주가 완료되었습니다 (${workflows.length}개 제작물)`,
        html: emailBody,
      });
    }

    // SMS 발송
    if (user.연락처) {
      let message = "[스타트패키지] 발주가 완료되었습니다.\n\n";

      workflows.forEach((workflow, index) => {
        message += `[${workflow.type}]\n`;
        if (index < workflows.length - 1) {
          message += "\n";
        }
      });

      if (배송지) {
        message += `\n받으실 곳: ${배송지}${수령인 ? ` (${수령인})` : ""}\n`;
        message += "발주가 진행되어 배송지는 변경할 수 없습니다.\n";
      }

      message += "\n제작이 진행됩니다. 제작 완료 시 다시 안내드리겠습니다.";

      try {
        const adminFrom = getSenderPhoneByAdmin(session.user?.email);
        await sendSMS(
          user.연락처,
          message,
          adminFrom ? { from: adminFrom } : undefined,
        );

        // 각 워크플로우에 대한 알림 기록 생성
        await Promise.all(
          workflows.map((workflow) =>
            prisma.notification.create({
              data: {
                userId: workflow.userId,
                type: "발주완료",
                channel: "SMS",
                title: `[스타트패키지] 발주 완료`,
                message: `${workflow.type} - 발주가 완료되어 제작이 진행됩니다`,
                status: "성공",
                sentBy: (session.user as any).id,
                sentByName: (session.user as any).name || "관리자",
              },
            }),
          ),
        );
      } catch (smsError: any) {
        console.error("SMS 발송 실패:", smsError);
        return NextResponse.json(
          { error: `SMS 발송 실패: ${smsError.message}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${workflows.length}개 제작물의 발주완료 알림을 발송했습니다.`,
      workflows: workflows.map((w) => ({
        type: w.type,
        status: w.status,
      })),
    });
  } catch (error: any) {
    console.error("발주완료 알림 발송 에러:", error);
    return NextResponse.json(
      { error: "발주완료 알림 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
