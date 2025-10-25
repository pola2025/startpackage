import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendSMS } from "@/lib/sms/ncpSensClient";

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
        { status: 400 }
      );
    }

    // 해당 사용자의 배송 정보가 있는 모든 워크플로우 조회
    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
        택배회사: { not: null },
        운송장번호: { not: null },
      },
      include: {
        user: {
          select: {
            이름: true,
            연락처: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (workflows.length === 0) {
      return NextResponse.json(
        { error: "배송 정보가 입력된 워크플로우가 없습니다." },
        { status: 404 }
      );
    }

    const user = workflows[0].user;

    if (!user.연락처) {
      return NextResponse.json(
        { error: "사용자의 연락처가 등록되지 않았습니다." },
        { status: 400 }
      );
    }

    // SMS 메시지 작성 (모든 배송 정보 포함)
    let message = "[스타트패키지] 배송이 시작되었습니다.\n\n";

    workflows.forEach((workflow, index) => {
      message += `[${workflow.type}]\n`;
      message += `택배: ${workflow.택배회사}\n`;
      message += `운송장: ${workflow.운송장번호}\n`;
      if (index < workflows.length - 1) {
        message += "\n";
      }
    });

    message += "\n배송 조회를 통해 확인하세요.";

    // SMS 발송
    try {
      await sendSMS(user.연락처, message);

      // 각 워크플로우에 대한 알림 기록 생성
      await Promise.all(
        workflows.map((workflow) =>
          prisma.notification.create({
            data: {
              userId: workflow.userId,
              type: "배송알림",
              channel: "SMS",
              title: `[스타트패키지] 배송 시작`,
              message: `${workflow.type} - ${workflow.택배회사} ${workflow.운송장번호}`,
              status: "성공",
              sentBy: (session.user as any).id,
              sentByName: (session.user as any).name || "관리자",
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        message: `${workflows.length}개 제작물의 배송 정보를 SMS로 발송했습니다.`,
        workflows: workflows.map((w) => ({
          type: w.type,
          택배회사: w.택배회사,
          운송장번호: w.운송장번호,
        })),
      });
    } catch (smsError: any) {
      console.error("SMS 발송 실패:", smsError);
      return NextResponse.json(
        { error: `SMS 발송 실패: ${smsError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("배송 SMS 발송 에러:", error);
    return NextResponse.json(
      { error: "배송 SMS 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
