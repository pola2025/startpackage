import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { handleStateChange, handleProductionComplete, logProgress } from "@/lib/notification/notificationService";
import { calculateExpectedArrival } from "@/lib/utils/businessDays";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { workflowId, status, 택배회사, 운송장번호, 시안URL, feedbackRead } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "워크플로우 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Get current workflow state
    const currentWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!currentWorkflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Prepare update data with automatic date tracking
    const updateData: any = {
      status,
      택배회사,
      운송장번호,
    };

    // Handle feedbackRead if provided
    if (feedbackRead !== undefined) {
      updateData.feedbackRead = feedbackRead;
    }

    // Handle 시안URL if provided
    if (시안URL !== undefined) {
      updateData.시안URL = 시안URL;

      // 시안 파일이 업로드되었고, 이전에 없었다면 슬랙에 업로드 + 수정횟수 증가 + 이력 저장
      if (시안URL && 시안URL !== currentWorkflow.시안URL) {
        const user = await prisma.user.findUnique({
          where: { id: currentWorkflow.userId },
          select: { slackChannelId: true },
        });

        // 시안 버전 계산 (기존 이력 수 + 1)
        const designHistoryCount = await prisma.designHistory.count({
          where: { workflowId },
        });
        const version = designHistoryCount + 1;

        // 시안 이력 저장
        await prisma.designHistory.create({
          data: {
            workflowId,
            version,
            fileUrl: 시안URL,
            uploadedBy: (session.user as any).id,
            uploadedByName: (session.user as any).name || "관리자",
          },
        });

        if (user?.slackChannelId) {
          const { uploadFileToSlack } = await import("@/lib/notification/slackClient");
          await uploadFileToSlack({
            channelId: user.slackChannelId,
            filePath: 시안URL,
            fileName: `${currentWorkflow.type}_${version}차시안.jpg`,
            title: `${currentWorkflow.type} ${version}차시안`,
          }).catch(err => console.error("시안 파일 슬랙 업로드 실패:", err));
        }

        // 시안이 이미 있었다면 수정으로 간주 (첫 업로드는 제외)
        if (currentWorkflow.시안URL) {
          updateData.수정횟수 = (currentWorkflow.수정횟수 || 0) + 1;
        }
      }
    }

    // Auto-update dates based on status changes
    const now = new Date();

    // If status changed to 발주대기 and 시안업로드일 is not set
    if (
      status === "발주대기" &&
      currentWorkflow.status !== "발주대기" &&
      !currentWorkflow.시안업로드일
    ) {
      updateData.시안업로드일 = now;
    }

    // If status changed to 발주완료 and 발주승인일 is not set (관리자 승인)
    if (
      status === "발주완료" &&
      currentWorkflow.status !== "발주완료" &&
      !currentWorkflow.발주승인일
    ) {
      updateData.발주승인일 = now;

      // 예상 도착일 자동 계산 (홈페이지는 제외 - 인쇄물이 아님)
      if (currentWorkflow.type !== "홈페이지" && currentWorkflow.type !== "로고") {
        const expectedArrival = calculateExpectedArrival(now, currentWorkflow.type);
        if (expectedArrival) {
          updateData.예상도착일 = expectedArrival;
        }
      }
    }

    // If status changed to 제작완료 and 제작완료일 is not set
    if (
      status === "제작완료" &&
      currentWorkflow.status !== "제작완료" &&
      !currentWorkflow.제작완료일
    ) {
      updateData.제작완료일 = now;
    }

    // If status changed to 발송완료 and 발송일 is not set
    if (
      status === "발송완료" &&
      currentWorkflow.status !== "발송완료" &&
      !currentWorkflow.발송일
    ) {
      updateData.발송일 = now;
    }

    // If shipping info is added and 발송일 is not set
    if (
      택배회사 &&
      운송장번호 &&
      (!currentWorkflow.택배회사 || !currentWorkflow.운송장번호) &&
      !currentWorkflow.발송일
    ) {
      updateData.발송일 = now;
    }

    // 홈페이지가 "제작 완료" 상태로 변경되면 User.homepageCompleted도 true로 설정
    if (
      currentWorkflow.type === "홈페이지" &&
      status === "제작 완료" &&
      currentWorkflow.status !== "제작 완료"
    ) {
      await prisma.user.update({
        where: { id: currentWorkflow.userId },
        data: {
          homepageCompleted: true,
          homepageCompletedAt: now,
        },
      });
    }

    // Update workflow
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: updateData,
      include: {
        user: {
          select: {
            이름: true,
            연락처: true,
            email: true,
          },
        },
      },
    });

    // Log the update
    await prisma.workflowLog.create({
      data: {
        workflowId,
        performedBy: (session.user as any).id,
        performedByName: (session.user as any).name || "관리자",
        action: "상태변경",
        previousStatus: currentWorkflow.status,
        newStatus: status,
        metadata: { 택배회사, 운송장번호, 시안URL },
      },
    });

    // Send notifications based on status change
    try {
      // 상태 변경 알림 (텔레그램 + 슬랙)
      if (currentWorkflow.status !== status) {
        await handleStateChange({
          userId: updatedWorkflow.userId,
          fromState: currentWorkflow.status,
          toState: status,
          changedBy: (session.user as any).name || "관리자",
        });
      }

      // 시안 완료 알림 (발주대기 상태로 변경 시)
      // 자동 발송 제거 - 관리자가 직접 SMS 발송 버튼으로 발송
      // if (status === "발주대기" && currentWorkflow.status !== "발주대기") { ... }

      // 발주 완료 알림 (이메일/SMS는 수동 발송으로 변경)
      if (status === "발주완료" && currentWorkflow.status !== "발주완료") {
        // 자동 발송 없음 - "발주완료 알림 발송" 버튼으로 일괄 발송
      }

      // 제작 완료 알림 (텔레그램/슬랙 + 이메일만, SMS는 수동 발송)
      if (status === "제작완료" && currentWorkflow.status !== "제작완료") {
        await handleProductionComplete({
          userId: updatedWorkflow.userId,
          itemName: updatedWorkflow.type,
        });

        // 이메일 발송 (Resend)
        if (updatedWorkflow.user.email) {
          const { sendEmail } = await import("@/lib/email/resendClient");
          await sendEmail({
            to: updatedWorkflow.user.email,
            subject: `[스타트패키지] ${updatedWorkflow.type} 제작이 완료되었습니다`,
            html: `
              <h2>제작이 완료되었습니다</h2>
              <p>안녕하세요, ${updatedWorkflow.user.이름}님!</p>
              <p><strong>${updatedWorkflow.type}</strong> 제작이 완료되었습니다.</p>
              <p>곧 배송이 시작될 예정입니다.</p>
            `,
          });
        }

        // SMS 자동 발송 비활성화 - 관리자가 수동으로 발송
        // 필요시 사용자관리 > 메시지 발송 기능 사용
      }

      // 홈페이지 "제작 완료" 알림 (이메일만 - SMS는 수동 발송)
      if (
        currentWorkflow.type === "홈페이지" &&
        status === "제작 완료" &&
        currentWorkflow.status !== "제작 완료"
      ) {
        const 홈페이지주소 = updatedWorkflow.시안URL || "";

        // 이메일 발송 (Resend - 홈페이지 주소만 포함)
        if (updatedWorkflow.user.email && 홈페이지주소) {
          const { sendEmail } = await import("@/lib/email/resendClient");
          await sendEmail({
            to: updatedWorkflow.user.email,
            subject: `[스타트패키지] 홈페이지 제작이 완료되었습니다`,
            html: `
              <h2>홈페이지 제작이 완료되었습니다</h2>
              <p>안녕하세요, ${updatedWorkflow.user.이름}님!</p>
              <p>홈페이지 제작이 완료되었습니다.</p>
              <p><strong>홈페이지 주소:</strong> <a href="${홈페이지주소}" target="_blank">${홈페이지주소}</a></p>
            `,
          });
        }

        // SMS 자동 발송 비활성화 - 관리자가 수동으로 발송
        // 필요시 사용자관리 > 메시지 발송 기능(템플릿: 홈페이지 제작 완료) 사용
      }

      // 택배 정보 입력 시 알림 (SMS는 수동 발송으로 변경)
      if (택배회사 && 운송장번호) {
        await handleProductionComplete({
          userId: updatedWorkflow.userId,
          itemName: updatedWorkflow.type,
          trackingNumber: 운송장번호,
        });

        // 이메일만 자동 발송 (SMS는 "배송정보 SMS 발송" 버튼으로 일괄 발송)
        if (updatedWorkflow.user.email) {
          const { sendEmail } = await import("@/lib/email/resendClient");
          await sendEmail({
            to: updatedWorkflow.user.email,
            subject: `[스타트패키지] ${updatedWorkflow.type} 배송이 시작되었습니다`,
            html: `
              <h2>배송이 시작되었습니다</h2>
              <p>안녕하세요, ${updatedWorkflow.user.이름}님!</p>
              <p><strong>${updatedWorkflow.type}</strong> 배송이 시작되었습니다.</p>
              <p><strong>택배회사:</strong> ${택배회사}</p>
              <p><strong>운송장번호:</strong> ${운송장번호}</p>
              <p>택배회사 홈페이지에서 배송 조회를 하실 수 있습니다.</p>
            `,
          });
        }
      }

      // 슬랙 진행 로그
      // 홈페이지 "제작 완료" 시 주소만 전송
      if (
        updatedWorkflow.type === "홈페이지" &&
        status === "제작 완료" &&
        currentWorkflow.status !== "제작 완료"
      ) {
        const 홈페이지주소 = updatedWorkflow.시안URL || "";
        await logProgress({
          userId: updatedWorkflow.userId,
          stage: `홈페이지 제작 완료`,
          status: "완료",
          details: {
            "홈페이지 주소": 홈페이지주소,
          },
          emoji: "✅",
        });
      } else {
        // 일반 상태 변경 로그
        await logProgress({
          userId: updatedWorkflow.userId,
          stage: `${updatedWorkflow.type} 상태 변경`,
          status,
          details: {
            "이전 상태": currentWorkflow.status,
            "변경 후": status,
            ...(택배회사 && { 택배회사 }),
            ...(운송장번호 && { 운송장번호 }),
          },
        });
      }
    } catch (notificationError) {
      console.error("알림 발송 실패:", notificationError);
      // 알림 실패는 무시하고 계속 진행
    }

    return NextResponse.json({
      success: true,
      workflow: updatedWorkflow,
    });
  } catch (error: any) {
    console.error("워크플로우 업데이트 에러:", error);
    return NextResponse.json(
      { error: "워크플로우 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
