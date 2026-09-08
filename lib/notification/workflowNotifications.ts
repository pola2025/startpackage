import { handleOrderRequest, handleStateChange } from "./notificationService";

type WorkflowNotificationContext = {
  userId: string;
  workflowType: string;
  userName?: string;
  cohortName?: string;
  brandName?: string;
  slackChannelId?: string | null;
  feedback?: string;
  fromState?: string;
  toState?: string;
  allOrdersRequested?: boolean;
  previousStatus?: string;
  confirmedAt?: Date;
};

function nowKo() {
  return new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export async function notifyWorkflowOrder(context: WorkflowNotificationContext) {
  try {
    await handleStateChange({ userId: context.userId, fromState: context.fromState || "발주대기", toState: context.toState || "발주요청" });
    await handleOrderRequest({ userId: context.userId, printItems: [context.workflowType] });
  } catch (error) {
    console.error("알림 발송 실패:", error);
  }

  if (context.allOrdersRequested) {
    try {
      const { sendTelegramMessage } = await import("./telegramClient");
      await sendTelegramMessage(
        `🎉 *전체 발주 요청 완료*\n\n*${context.cohortName || "미지정"} ${context.userName || "사용자"}* 님의 모든 디자인 시안 발주 요청이 접수되었습니다.\n\n관리자 승인을 기다리고 있습니다.`,
      );
    } catch (error) {
      console.error("전체 발주 확인 실패:", error);
    }
  }
}

export async function notifyWorkflowApproval(context: WorkflowNotificationContext) {
  const title = `✅ ${context.workflowType} 확정`;
  const previousStatus = context.previousStatus || "시안컨펌요청";
  const confirmedAt = context.confirmedAt || new Date();
  if (context.slackChannelId) {
    const { postMessage } = await import("./slackClient");
    await postMessage({
      channelId: context.slackChannelId,
      text: `✅ ${context.workflowType} 최종 확정`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `✅ ${context.workflowType} 최종 확정` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*항목:*\n${context.workflowType}` },
            { type: "mrkdwn", text: `*이전 상태:*\n${previousStatus}` },
            { type: "mrkdwn", text: "*현재 상태:*\n최종확정" },
            { type: "mrkdwn", text: `*확정자:*\n${context.userName || "사용자"}` },
          ],
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `📅 ${confirmedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` }],
        },
      ],
    });
  }
  const { notifyAdmin } = await import("./telegramClient");
  await notifyAdmin({
    title,
    message: `${context.cohortName || "미정"}_${context.userName || "사용자"}_${context.brandName || "미정"} 님이 ${context.workflowType} 시안을 확정했습니다.`,
    details: {
      "기수": context.cohortName || "미정",
      "이름": context.userName || "알 수 없음",
      "브랜드명": context.brandName || "미정",
      "항목": context.workflowType,
      "이전 상태": previousStatus,
      "현재 상태": "최종확정",
    },
  });
}

export async function notifyWorkflowFeedback(context: WorkflowNotificationContext) {
  const text = context.feedback || "";
  const { sendTelegramMessage } = await import("./telegramClient");
  await sendTelegramMessage(`📝 *시안 피드백 접수*\n\n*사용자:* ${context.userName || "사용자"} (${context.cohortName || "기수 미정"})\n*제작물:* ${context.workflowType}\n*피드백:*\n${text}\n\n*시간:* ${nowKo()}`);
  if (context.slackChannelId) {
    const { postMessage } = await import("./slackClient");
    await postMessage({
      channelId: context.slackChannelId,
      text: `📝 시안 피드백: ${context.workflowType}`,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*📝 ${context.workflowType} 시안 피드백*\n\n${text}` } },
        { type: "context", elements: [{ type: "mrkdwn", text: `📅 ${nowKo()}` }] },
      ],
    });
  }
}
