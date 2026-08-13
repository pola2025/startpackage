import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const userId = session.user.id;

    // 워크플로우 조회
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "워크플로우를 찾을 수 없습니다." }, { status: 404 });
    }

    // 본인의 워크플로우인지 확인
    if (workflow.userId !== userId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (workflow.type === "홈페이지") {
      return NextResponse.json(
        { error: "홈페이지는 사용자 시안 확정 없이 제작 완료로 안내됩니다." },
        { status: 400 }
      );
    }

    // 확정 가능한 타입 확인 (로고, 명함, 명찰, 대봉투, 자문계약서)
    const confirmableTypes = ["로고", "명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지"];
    if (!confirmableTypes.includes(workflow.type)) {
      return NextResponse.json({ error: "확정할 수 없는 항목입니다." }, { status: 400 });
    }

    // 상태 확인 - 타입별로 다름
    if (workflow.type === "로고" && workflow.status !== "시안컨펌요청") {
      return NextResponse.json({ error: "시안컨펌요청 상태에서만 확정할 수 있습니다." }, { status: 400 });
    }

    // 명함, 명찰, 대봉투, 자문계약서는 "시안컨펌요청" 상태에서만 확정 가능
    const designTypes = ["명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지"];
    if (designTypes.includes(workflow.type) && workflow.status !== "시안컨펌요청") {
      return NextResponse.json({ error: "시안컨펌요청 상태에서만 확정할 수 있습니다." }, { status: 400 });
    }

    const previousStatus = workflow.status;

    // 워크플로우 상태를 최종확정으로 변경
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        status: "최종확정",
      },
    });

    // 로그 기록
    await prisma.workflowLog.create({
      data: {
        workflowId,
        performedBy: userId,
        performedByName: session.user.name || "사용자",
        action: `${workflow.type} 확정`,
        previousStatus,
        newStatus: "최종확정",
      },
    });

    // 사용자 정보 조회 (슬랙 채널, 기수, 브랜드명 등)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cohort: true,
        submission: {
          select: {
            브랜드명: true,
          },
        },
      },
    });

    // 슬랙 알림 전송
    if (user?.slackChannelId) {
      const { postMessage } = await import("@/lib/notification/slackClient");

      await postMessage({
        channelId: user.slackChannelId,
        text: `✅ ${workflow.type} 최종 확정`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `✅ ${workflow.type} 최종 확정`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*항목:*\n${workflow.type}`,
              },
              {
                type: "mrkdwn",
                text: `*이전 상태:*\n${previousStatus}`,
              },
              {
                type: "mrkdwn",
                text: `*현재 상태:*\n최종확정`,
              },
              {
                type: "mrkdwn",
                text: `*확정자:*\n${user.이름}`,
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
              },
            ],
          },
        ],
      }).catch(err => console.error("슬랙 알림 전송 실패:", err));
    }

    // 텔레그램 관리자 알림 전송
    if (user) {
      const { notifyAdmin } = await import("@/lib/notification/telegramClient");

      const cohortName = user.cohort?.name || "미정";
      const userName = user.이름 || "알 수 없음";
      const brandName = user.submission?.브랜드명 || "미정";

      await notifyAdmin({
        title: `✅ ${workflow.type} 확정`,
        message: `${cohortName}_${userName}_${brandName} 님이 ${workflow.type} 시안을 확정했습니다.`,
        details: {
          "기수": cohortName,
          "이름": userName,
          "브랜드명": brandName,
          "항목": workflow.type,
          "이전 상태": previousStatus,
          "현재 상태": "최종확정",
        },
      }).catch(err => console.error("텔레그램 알림 전송 실패:", err));
    }

    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow,
    });
  } catch (error: any) {
    console.error("로고 승인 에러:", error);
    return NextResponse.json(
      { error: "로고 승인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
