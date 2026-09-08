import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";
import { notifyWorkflowFeedback } from "@/lib/notification/workflowNotifications";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// POST: 시안 피드백 제출
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: workflowId } = await params;
    const { feedback } = await request.json();

    if (!feedback || feedback.trim() === "") {
      return NextResponse.json(
        { error: "피드백 내용을 입력해주세요" },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      const updated = await callCore<Record<string, unknown>>("workflow-feedback", userId, { userId, workflowId, feedback });
      const meta = updated.__d1Meta as { user?: Record<string, unknown> } | undefined;
      delete updated.__d1Meta;
      const person = meta?.user || {};
      await notifyWorkflowFeedback({ userId, workflowType: String(updated.type || "워크플로우"), userName: String(person.이름 || person.englishName || session.user.name || "사용자"), cohortName: typeof person.cohortName === "string" ? person.cohortName : undefined, slackChannelId: typeof person.slackChannelId === "string" ? person.slackChannelId : undefined, feedback }).catch((error) => console.error("알림 발송 실패:", error));
      return NextResponse.json(updated);
    }

    // 워크플로우 확인
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        user: {
          include: {
            cohort: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    if (workflow.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 시안 수정 2회 제한 (기획서 결정사항)
    // 정책: 시안 수정 요청은 총 2회까지만 가능 / 여러 개 제안 불가
    const REVISION_LIMIT = 2;
    const currentCount = workflow.수정횟수 ?? 0;
    if (currentCount >= REVISION_LIMIT) {
      return NextResponse.json(
        {
          error: `시안 수정은 ${REVISION_LIMIT}회까지만 가능합니다. 추가 수정이 필요하시면 고객지원센터로 문의해주세요.`,
          revisionCount: currentCount,
          revisionLimit: REVISION_LIMIT,
        },
        { status: 403 },
      );
    }

    // 피드백 저장 + 수정횟수 increment
    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        feedback,
        feedbackDate: new Date(),
        수정횟수: currentCount + 1,
      },
    });

    try {
      await notifyWorkflowFeedback({
        userId,
        workflowType: workflow.type,
        userName: workflow.user.이름,
        cohortName: workflow.user.cohort?.name,
        slackChannelId: workflow.user.slackChannelId,
        feedback,
      });
    } catch (err) {
      console.error("피드백 알림 실패:", err);
    }

    // 문의 스레드 자동 생성
    try {
      const workflowTypeMap: Record<string, string> = {
        로고: "로고",
        명함: "일반",
        홈페이지: "홈페이지",
        인쇄물: "인쇄물",
      };

      const category = workflowTypeMap[workflow.type] || "일반";

      // 기존에 같은 워크플로우 관련 스레드가 있는지 확인
      const existingThread = await prisma.communicationThread.findFirst({
        where: {
          userId: userId,
          title: {
            contains: `[시안 피드백] ${workflow.type}`,
          },
          status: {
            in: ["open", "in_progress"],
          },
        },
      });

      if (existingThread) {
        // 기존 스레드에 메시지 추가
        await prisma.communicationMessage.create({
          data: {
            threadId: existingThread.id,
            authorId: userId,
            authorType: "user",
            authorName: workflow.user.이름,
            content: `[추가 피드백]\n\n${feedback}`,
            attachments: [],
          },
        });

        // 스레드의 lastReplyAt 업데이트
        await prisma.communicationThread.update({
          where: { id: existingThread.id },
          data: { lastReplyAt: new Date() },
        });
      } else {
        // 새 스레드 생성
        const thread = await prisma.communicationThread.create({
          data: {
            userId: userId,
            title: `[시안 피드백] ${workflow.type}`,
            category: category,
            status: "open",
            lastReplyAt: new Date(),
          },
        });

        // 첫 메시지 생성
        await prisma.communicationMessage.create({
          data: {
            threadId: thread.id,
            authorId: userId,
            authorType: "user",
            authorName: workflow.user.이름,
            content: `${workflow.type} 시안에 대한 피드백입니다.\n\n${feedback}`,
            attachments: [],
          },
        });
      }

      console.log("✅ 시안 피드백 문의 스레드 생성 완료");
    } catch (err) {
      console.error("문의 스레드 생성 실패:", err);
      // 실패해도 피드백 제출은 성공으로 처리
    }

    return NextResponse.json(updated);
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("POST /api/workflows/[id]/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
