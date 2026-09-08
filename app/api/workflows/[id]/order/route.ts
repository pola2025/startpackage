import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculateExpectedArrival } from "@/lib/utils/businessDays";
import {
  buildConfirmSnapshot,
  validateConfirmPayload,
  requiresShippingStep,
  type ShippingSnapshot,
} from "@/lib/design-confirm";
import { isShippingPolicyCohort } from "@/lib/shipping-policy";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";
import { notifyWorkflowOrder } from "@/lib/notification/workflowNotifications";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

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
    const body = await request.json().catch(() => ({}));

    if (isD1RuntimeEnabled()) {
      const result = await callCore<Record<string, unknown>>("workflow-order", userId, {
        userId,
        workflowId,
        shipping: body?.shipping ?? null,
        agreements: body?.agreements,
      });
      const meta = result.__d1Meta as { user?: Record<string, unknown>; allOrdersRequested?: boolean } | undefined;
      delete result.__d1Meta;
      await notifyWorkflowOrder({ userId, userName: typeof meta?.user?.이름 === "string" ? meta.user.이름 : undefined, cohortName: typeof meta?.user?.cohortName === "string" ? meta.user.cohortName : undefined, allOrdersRequested: meta?.allOrdersRequested === true, workflowType: String(result.type || "워크플로우"), ...(meta?.user?.slackChannelId ? { slackChannelId: String(meta.user.slackChannelId) } : {}) }).catch((error) => console.error("알림 발송 실패:", error));
      return NextResponse.json(result);
    }

    // 워크플로우 확인
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { user: { include: { cohort: true } } },
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

    const isPrint = requiresShippingStep(workflow.type);
    if (!isPrint) {
      return NextResponse.json({ error: "인쇄물만 발주 요청할 수 있습니다." }, { status: 400 });
    }

    const rawShipping = body?.shipping;
    if (rawShipping && typeof rawShipping === "object") {
      const shippingKeys = ["인쇄물받을주소", "받는분이름", "수령연락처", "우편번호"] as const;
      if (shippingKeys.some((key) => key in rawShipping && typeof rawShipping[key] !== "string")) {
        return NextResponse.json({ error: "배송지 정보 형식이 올바르지 않습니다." }, { status: 400 });
      }
    }
    const shipping: ShippingSnapshot | null = rawShipping && typeof rawShipping === "object"
      ? {
          인쇄물받을주소: typeof rawShipping.인쇄물받을주소 === "string" ? rawShipping.인쇄물받을주소 : "",
          받는분이름: typeof rawShipping.받는분이름 === "string" ? rawShipping.받는분이름 : "",
          수령연락처: typeof rawShipping.수령연락처 === "string" ? rawShipping.수령연락처 : "",
          우편번호: typeof rawShipping.우편번호 === "string" ? rawShipping.우편번호 : "",
        }
      : null;
      const agreements: string[] = Array.isArray(body?.agreements)
        ? body.agreements
        : [];
      const shippingRequired = isShippingPolicyCohort(workflow.user.cohort?.교육시작일);
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

      const orderDate = new Date();
      const expectedArrival = calculateExpectedArrival(orderDate, workflow.type);
      const result = await prisma.workflow.updateMany({
        where: { id: workflowId, userId, status: "발주대기" },
        data: {
          status: "발주요청",
          발주요청일: orderDate,
          예상도착일: expectedArrival || null,
          ...confirmSnapshot,
          확정일시: orderDate,
        },
      });
      if (result.count !== 1) {
        return NextResponse.json({ error: "이미 변경된 발주 상태입니다. 새로고침해주세요." }, { status: 409 });
      }
      const updated = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { user: { include: { cohort: true } } },
      });
      if (!updated) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }

    let allOrdersRequested = false;
    try {
      const allWorkflows = await prisma.workflow.findMany({
        where: { userId },
        select: { status: true },
      });
      allOrdersRequested = allWorkflows.every(
        (w) => w.status === "발주요청" ||
               w.status === "발주완료" ||
               w.status === "제작완료" ||
               w.status === "발송완료",
      );
    } catch (notificationError) {
      console.error("전체 발주 확인 실패:", notificationError);
      // 알림 실패는 무시하고 계속 진행
    }
    await notifyWorkflowOrder({
      userId,
      workflowType: workflow.type,
      userName: workflow.user.이름,
      cohortName: workflow.user.cohort?.name,
      allOrdersRequested,
    }).catch((error) => console.error("알림 발송 실패:", error));

    return NextResponse.json(updated);
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("POST /api/workflows/[id]/order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
