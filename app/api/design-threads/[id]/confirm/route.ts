import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  buildConfirmSnapshot,
  validateConfirmPayload,
  type ShippingSnapshot,
} from "@/lib/design-confirm";
import { isShippingPolicyCohort } from "@/lib/shipping-policy";

// POST: 시안 최종 확정
// - 클라이언트만 가능
// - 확정 시 워크플로우 상태 자동 변경 (시안중 → 발주요청)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const user = session.user as any;
    const isAdmin = ["super", "designer", "operator"].includes(user.role);

    // 관리자는 시안 확정 불가 (클라이언트만 가능)
    if (isAdmin) {
      return NextResponse.json(
        { error: "Only client can confirm design" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message } = body; // 확정 메시지 (선택)
    const shipping: ShippingSnapshot | null = body?.shipping ?? null;
    const agreements: string[] = Array.isArray(body?.agreements)
      ? body.agreements
      : [];

    // 쓰레드 조회
    const thread = await prisma.designThread.findUnique({
      where: { id: threadId },
      include: {
        workflow: true,
        messages: {
          where: { messageType: "design_upload" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // 권한 확인: 본인 워크플로우인지
    if (thread.workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 이미 확정된 경우
    if (thread.status === "confirmed") {
      return NextResponse.json(
        { error: "Already confirmed" },
        { status: 400 }
      );
    }

    // 시안이 없는 경우
    if (thread.currentVersion === 0 || thread.messages.length === 0) {
      return NextResponse.json(
        { error: "No design to confirm" },
        { status: 400 }
      );
    }

    // 확정 게이트 검증 — 배송지 확인과 고지 동의를 거치지 않은 요청은 막는다
    // 배송지 확인은 최근 2개 기수(정책 시행일 이후 시작 기수)에만 적용한다
    const 기수 = await prisma.user.findUnique({
      where: { id: user.id },
      select: { cohort: { select: { 교육시작일: true } } },
    });
    const shippingRequired = isShippingPolicyCohort(기수?.cohort?.교육시작일);

    const validationError = validateConfirmPayload({
      workflowType: thread.workflow.type,
      shipping,
      agreements,
      shippingRequired,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const latestDesign = thread.messages[0];
    const confirmSnapshot = buildConfirmSnapshot({
      workflowType: thread.workflow.type,
      shipping,
      agreements,
      shippingRequired,
    });

    // 사용자 정보 조회
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 이름: true },
    });

    // 트랜잭션으로 확정 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 확정 메시지 생성
      const confirmationMessage = await tx.designThreadMessage.create({
        data: {
          threadId,
          authorId: user.id,
          authorType: "user",
          authorName: userInfo?.이름 || "사용자",
          messageType: "confirmation",
          content:
            message ||
            `${thread.currentVersion}차 시안으로 최종 확정합니다.`,
          isReadByAdmin: false,
          isReadByUser: true,
        },
      });

      // 2. 쓰레드 확정 처리
      const updatedThread = await tx.designThread.update({
        where: { id: threadId },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          confirmedByName: userInfo?.이름 || "사용자",
        },
      });

      // 3. 워크플로우 상태 변경 (시안중 → 발주요청)
      const updatedWorkflow = await tx.workflow.update({
        where: { id: thread.workflowId },
        data: {
          status: "발주요청",
          시안URL: latestDesign.designUrl,
          시안업로드일: new Date(),
          수정횟수: thread.currentVersion - 1,
          발주요청일: new Date(),
          ...confirmSnapshot,
        },
      });

      // 4. 워크플로우 로그 기록
      await tx.workflowLog.create({
        data: {
          workflowId: thread.workflowId,
          action: "시안확정",
          performedBy: user.id,
          performedByName: userInfo?.이름 || "사용자",
          previousStatus: thread.workflow.status,
          newStatus: "발주요청",
          metadata: {
            confirmedVersion: thread.currentVersion,
            designUrl: latestDesign.designUrl,
            threadId: thread.id,
            확정배송지: confirmSnapshot.확정배송지,
            확정수령인: confirmSnapshot.확정수령인,
            동의항목: agreements,
          },
        },
      });

      return {
        message: confirmationMessage,
        thread: updatedThread,
        workflow: updatedWorkflow,
      };
    });

    return NextResponse.json({
      success: true,
      message: "시안이 최종 확정되었습니다.",
      thread: {
        id: result.thread.id,
        status: result.thread.status,
        confirmedAt: result.thread.confirmedAt,
        confirmedByName: result.thread.confirmedByName,
      },
      workflow: {
        id: result.workflow.id,
        status: result.workflow.status,
      },
    });
  } catch (error) {
    console.error("POST /api/design-threads/[id]/confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
