import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleStateChange, handleOrderRequest } from "@/lib/notification/notificationService";
import { calculateExpectedArrival } from "@/lib/utils/businessDays";

// POST: 발주 요청
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: workflowId } = await params;

    // 워크플로우 확인
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { user: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (workflow.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 상태 체크
    if (workflow.status !== "발주대기") {
      return NextResponse.json(
        { error: "발주 대기 상태가 아닙니다" },
        { status: 400 }
      );
    }

    // 발주 요청일 기준으로 예상 도착일 계산
    const orderDate = new Date();
    const expectedArrival = calculateExpectedArrival(orderDate, workflow.type);

    // 발주 요청으로 상태 변경 (관리자 승인 대기)
    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        status: "발주요청",
        발주요청일: orderDate,
        예상도착일: expectedArrival || null,
      },
    });

    // 알림 발송 (발주 요청 - 텔레그램 + 슬랙)
    try {
      await handleStateChange({
        userId,
        fromState: "발주대기",
        toState: "발주요청",
      });

      await handleOrderRequest({
        userId,
        printItems: [workflow.type],
      });
    } catch (notificationError) {
      console.error("알림 발송 실패:", notificationError);
      // 알림 실패는 무시하고 계속 진행
    }

    // 모든 워크플로우가 발주요청 상태인지 확인
    try {
      const allWorkflows = await prisma.workflow.findMany({
        where: { userId },
      });

      const allOrdersRequested = allWorkflows.every(
        (w) => w.status === "발주요청" ||
               w.status === "발주완료" ||
               w.status === "제작완료" ||
               w.status === "발송완료"
      );

      if (allOrdersRequested) {
        // 모든 워크플로우가 발주요청 이상의 상태일 때만 알림
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { cohort: true },
        });

        if (user) {
          const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");

          await sendTelegramMessage(
            `🎉 *전체 발주 요청 완료*\n\n*${user.cohort?.name || "미지정"} ${user.이름}* 님의 모든 디자인 시안 발주 요청이 접수되었습니다.\n\n관리자 승인을 기다리고 있습니다.`
          );
        }
      }
    } catch (checkError) {
      console.error("전체 발주 확인 실패:", checkError);
      // 확인 실패는 무시하고 계속 진행
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/workflows/[id]/order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
