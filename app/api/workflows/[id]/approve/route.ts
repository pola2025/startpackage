import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  buildConfirmSnapshot,
  validateConfirmPayload,
  type ShippingSnapshot,
} from "@/lib/design-confirm";
import { isShippingPolicyCohort } from "@/lib/shipping-policy";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";
import { notifyWorkflowApproval } from "@/lib/notification/workflowNotifications";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

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

    if (isD1RuntimeEnabled()) {
      const body = await request.json().catch(() => ({}));
      const result = await callCore<Record<string, unknown>>("workflow-approve", userId, {
        userId,
        workflowId,
        shipping: body?.shipping ?? null,
        agreements: Array.isArray(body?.agreements) ? body.agreements : [],
        performedByName: session.user.name || "사용자",
      });
      const meta = result.__d1Meta as { user?: Record<string, unknown> } | undefined;
      delete result.__d1Meta;
      const person = meta?.user || {};
      await notifyWorkflowApproval({ userId, workflowType: String(result.type || "워크플로우"), userName: String(person.이름 || person.englishName || session.user.name || "사용자"), cohortName: String(person.cohortName || person.cohortEnglishName || "미정"), brandName: String(person.브랜드명 || person.brandNameEnglish || "미정"), slackChannelId: typeof person.slackChannelId === "string" ? person.slackChannelId : undefined }).catch((error) => console.error("알림 발송 실패:", error));
      return NextResponse.json({ success: true, workflow: result });
    }

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

    // 확정 게이트 검증 — 시안 대화방 확정과 같은 조건을 적용한다
    const body = await request.json().catch(() => ({}));
    const shipping: ShippingSnapshot | null = body?.shipping ?? null;
    const agreements: string[] = Array.isArray(body?.agreements)
      ? body.agreements
      : [];

    const 기수 = await prisma.user.findUnique({
      where: { id: userId },
      select: { cohort: { select: { 교육시작일: true } } },
    });
    const shippingRequired = isShippingPolicyCohort(기수?.cohort?.교육시작일);

    const validationError = validateConfirmPayload({
      workflowType: workflow.type,
      shipping,
      agreements,
      shippingRequired,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const confirmSnapshot = buildConfirmSnapshot({
      workflowType: workflow.type,
      shipping,
      agreements,
      shippingRequired,
    });

    const previousStatus = workflow.status;

    // 워크플로우 상태를 최종확정으로 변경
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        status: "최종확정",
        ...confirmSnapshot,
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

    if (user) {
      await notifyWorkflowApproval({
        userId,
        workflowType: workflow.type,
        userName: user.이름 || "알 수 없음",
        cohortName: user.cohort?.name || "미정",
        brandName: user.submission?.브랜드명 || "미정",
        slackChannelId: user.slackChannelId,
        previousStatus,
        confirmedAt: new Date(),
      }).catch(err => console.error("승인 알림 전송 실패:", err));
    }

    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow,
    });
  } catch (error: any) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("로고 승인 에러:", error);
    return NextResponse.json(
      { error: "로고 승인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
