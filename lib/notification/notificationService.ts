/**
 * 통합 알림 서비스
 * - 텔레그램 (사용자 알림)
 * - 슬랙 (관리자 알림 + 진행 과정 기록)
 */

import * as telegram from "./telegramClient";
import * as slack from "./slackClient";
import prisma from "@/lib/prisma";

/**
 * 자료 제출 완료 처리
 * 1. 슬랙 채널 생성 (기수명_이름_브랜드명)
 * 2. 제작 정보 슬랙에 푸시
 * 3. 텔레그램 관리자 알림
 * 4. DB에 슬랙 채널 ID 저장
 */
export async function handleSubmissionComplete(params: {
  userId: string;
  cohortName: string;
  userName: string;
  brandName: string;
  userEmail: string;
  userPhone: string;
  submissionData: Record<string, any>;
}): Promise<void> {
  try {
    const {
      userId,
      cohortName,
      userName,
      brandName,
      userEmail,
      userPhone,
      submissionData,
    } = params;

    console.log(`📋 자료 제출 완료 처리 시작: ${cohortName}_${userName}_${brandName}`);

    // 1. 슬랙 채널 생성
    const slackChannelId = await slack.createSlackChannel({
      cohortName,
      userName,
      brandName,
      userEmail,
      userPhone,
    });

    // 2. 슬랙 채널에 제작 정보 푸시
    if (slackChannelId) {
      await slack.pushSubmissionData({
        channelId: slackChannelId,
        submissionData,
      });

      // DB에 슬랙 채널 ID 저장
      await prisma.user.update({
        where: { id: userId },
        data: { slackChannelId },
      });

      console.log(`✅ 슬랙 채널 생성 및 정보 푸시 완료: ${slackChannelId}`);
    }

    // 3. 텔레그램 관리자 알림
    await telegram.notifySubmissionComplete({
      cohortName,
      userName,
      brandName,
      userPhone,
      userEmail,
    });

    // 4. 사용자에게 SMS 발송
    if (userPhone) {
      const { sendSMS } = await import("@/lib/sms/ncpSensClient");
      const message = `[스타트패키지]\n\n디자인 시안 제작요청이 접수되었습니다.\n\n영업일 2일 이내 제작 후 안내드리겠습니다.`;

      try {
        await sendSMS(userPhone, message);
        console.log(`✅ 제작요청 SMS 발송 완료: ${userPhone}`);
      } catch (error) {
        console.error("SMS 발송 실패:", error);
      }
    }

    console.log(`✅ 자료 제출 완료 알림 발송 완료`);
  } catch (error) {
    console.error("자료 제출 완료 처리 실패:", error);
  }
}

/**
 * 워크플로우 상태 변경 알림
 */
export async function handleStateChange(params: {
  userId: string;
  fromState: string;
  toState: string;
  changedBy?: string;
}): Promise<void> {
  try {
    const { userId, fromState, toState, changedBy } = params;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cohort: true },
    });

    if (!user) {
      console.error("사용자를 찾을 수 없습니다:", userId);
      return;
    }

    const userName = user.name || "사용자";
    const slackChannelId = user.slackChannelId;

    // 슬랙에 상태 변경 로그
    if (slackChannelId) {
      await slack.logStateChange({
        channelId: slackChannelId,
        fromState,
        toState,
        changedBy,
      });
    }

    // 상태별 알림 처리
    switch (toState) {
      case "제작진행중":
        // 관리자에게 알림
        await telegram.notifyAdmin({
          title: "📋 자료 제출 완료",
          message: `${userName}님이 자료 제출을 완료했습니다. 시안 제작을 시작해주세요.`,
        });
        break;

      case "시안확인":
        // 사용자에게 알림
        await telegram.notifyUser({
          userName,
          title: "🎨 시안 완료",
          message:
            "디자인 시안이 완료되었습니다.\n대시보드에서 확인하신 후 발주 요청해주세요.\n⚠️ 오탈자를 꼼꼼히 확인해주세요!",
          userChatId: user.telegramChatId || undefined,
        });
        break;

      case "발주요청":
        // 사용자와 관리자 모두에게 알림
        await telegram.notifyUser({
          userName,
          title: "📋 발주 요청 접수",
          message:
            "발주 요청이 접수되었습니다.\n관리자 확인 후 인쇄소에 발주됩니다.",
          userChatId: user.telegramChatId || undefined,
        });

        await telegram.notifyAdmin({
          title: "📋 발주 요청 접수",
          message: `${userName}님의 발주 요청이 접수되었습니다. 확인 후 승인해주세요.`,
        });
        break;

      case "발주완료":
        // 관리자가 승인하여 실제 발주 완료된 경우
        await telegram.notifyUser({
          userName,
          title: "🚀 발주 완료",
          message:
            "관리자 승인이 완료되어 인쇄소에 발주되었습니다.\n제작이 시작됩니다.",
          userChatId: user.telegramChatId || undefined,
        });

        // 슬랙에 발주 완료 로그
        if (slackChannelId) {
          await slack.logProgress({
            channelId: slackChannelId,
            stage: "발주 완료",
            status: "인쇄소 발주 완료 - 제작 시작",
            emoji: "🚀",
          });
        }
        break;

      case "제작완료":
        // 사용자에게 알림
        await telegram.notifyUser({
          userName,
          title: "✅ 제작 완료",
          message:
            "모든 인쇄물 제작이 완료되었습니다.\n발송 정보를 확인해주세요.",
          userChatId: user.telegramChatId || undefined,
        });
        break;
    }

    console.log(`✅ 상태 변경 알림 완료: ${fromState} → ${toState}`);
  } catch (error) {
    console.error("상태 변경 알림 실패:", error);
  }
}

/**
 * 시안 업로드 알림
 */
export async function handleDesignUpload(params: {
  userId: string;
  itemName: string;
  designUrl: string;
  version?: number;
}): Promise<void> {
  try {
    const { userId, itemName, designUrl, version } = params;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error("사용자를 찾을 수 없습니다:", userId);
      return;
    }

    const userName = user.name || "사용자";
    const slackChannelId = user.slackChannelId;

    // 슬랙에 시안 업로드 로그만 기록 (사용자 알림은 관리자가 SMS 버튼으로 수동 발송)
    if (slackChannelId) {
      await slack.logDesignUpload({
        channelId: slackChannelId,
        itemName,
        designUrl,
        version,
      });
    }

    console.log(`✅ 시안 업로드 슬랙 로그 완료: ${itemName} (사용자 알림은 관리자가 SMS 버튼으로 수동 발송)`);
  } catch (error) {
    console.error("시안 업로드 알림 실패:", error);
  }
}

/**
 * 발주 요청 알림
 */
export async function handleOrderRequest(params: {
  userId: string;
  printItems: string[];
  expectedDate?: Date;
}): Promise<void> {
  try {
    const { userId, printItems, expectedDate } = params;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cohort: true,
        submission: true,
      },
    });

    if (!user) {
      console.error("사용자를 찾을 수 없습니다:", userId);
      return;
    }

    const cohortName = user.cohort?.name || "기수 미지정";
    const userName = user.name || "사용자";
    const brandName = user.submission?.브랜드명 || "브랜드 미지정";
    const slackChannelId = user.slackChannelId;

    // 슬랙에 발주 로그
    if (slackChannelId) {
      await slack.logOrder({
        channelId: slackChannelId,
        printItems,
        expectedDate,
      });
    }

    // 텔레그램 관리자 알림
    await telegram.notifyOrderRequest({
      cohortName,
      userName,
      brandName,
      printItems,
    });

    console.log(`✅ 발주 요청 알림 완료: ${printItems.join(", ")}`);
  } catch (error) {
    console.error("발주 요청 알림 실패:", error);
  }
}

/**
 * 제작 완료 알림
 */
export async function handleProductionComplete(params: {
  userId: string;
  itemName: string;
  trackingNumber?: string;
}): Promise<void> {
  try {
    const { userId, itemName, trackingNumber } = params;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error("사용자를 찾을 수 없습니다:", userId);
      return;
    }

    const userName = user.name || "사용자";
    const slackChannelId = user.slackChannelId;

    // 슬랙에 제작 완료 로그
    if (slackChannelId) {
      await slack.logProductionComplete({
        channelId: slackChannelId,
        itemName,
        trackingNumber,
      });
    }

    // 사용자에게 텔레그램 알림
    await telegram.notifyProductionComplete({
      userName,
      itemName,
      trackingNumber,
      userChatId: user.telegramChatId || undefined,
    });

    console.log(`✅ 제작 완료 알림 완료: ${itemName}`);
  } catch (error) {
    console.error("제작 완료 알림 실패:", error);
  }
}

/**
 * 일반 진행 상황 로그 (슬랙 전용)
 */
export async function logProgress(params: {
  userId: string;
  stage: string;
  status: string;
  details?: Record<string, string>;
  emoji?: string;
}): Promise<void> {
  try {
    const { userId, stage, status, details, emoji } = params;

    // 사용자의 슬랙 채널 ID 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { slackChannelId: true },
    });

    if (!user?.slackChannelId) {
      console.log("슬랙 채널이 없습니다. 로그를 건너뜁니다.");
      return;
    }

    // 슬랙에 진행 상황 로그
    await slack.logProgress({
      channelId: user.slackChannelId,
      stage,
      status,
      details,
      emoji,
    });

    console.log(`✅ 진행 상황 로그 완료: ${stage} - ${status}`);
  } catch (error) {
    console.error("진행 상황 로그 실패:", error);
  }
}

export default {
  handleSubmissionComplete,
  handleStateChange,
  handleDesignUpload,
  handleOrderRequest,
  handleProductionComplete,
  logProgress,
};
