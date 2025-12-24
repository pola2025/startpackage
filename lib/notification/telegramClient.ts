/**
 * 텔레그램 봇 클라이언트
 * 사용자 알림 및 관리자 알림 발송
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/**
 * 텔레그램 메시지 발송 (fetch 사용)
 */
export async function sendTelegramMessage(
  message: string,
  chatId?: string
): Promise<boolean> {
  try {
    const targetChatId = chatId || TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("텔레그램 BOT_TOKEN이 설정되지 않았습니다");
      return false;
    }

    if (!targetChatId) {
      console.error("텔레그램 CHAT_ID가 설정되지 않았습니다");
      return false;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      console.error("텔레그램 API 에러:", result.description);
      return false;
    }

    console.log(`✅ 텔레그램 메시지 발송 성공: ${targetChatId}`);
    return true;
  } catch (error) {
    console.error("텔레그램 메시지 발송 실패:", error);
    return false;
  }
}

/**
 * 사용자 알림 (비활성화됨 - 텔레그램은 관리자 전용)
 * SMS를 통해 사용자에게 알림을 보내세요.
 */
export async function notifyUser(params: {
  userName: string;
  title: string;
  message: string;
  userChatId?: string;
}): Promise<boolean> {
  console.log("⚠️ 텔레그램 사용자 알림은 비활성화되었습니다. SMS를 사용하세요.");
  return false;
}

/**
 * 관리자 알림 (자료 제출 완료, 발주 요청 등)
 */
export async function notifyAdmin(params: {
  title: string;
  message: string;
  details?: Record<string, string>;
}): Promise<boolean> {
  const { title, message, details } = params;

  let formattedMessage = `
⚡️ <b>${title}</b>

${message}
  `.trim();

  if (details) {
    formattedMessage += "\n\n<b>상세 정보:</b>";
    Object.entries(details).forEach(([key, value]) => {
      formattedMessage += `\n• ${key}: ${value}`;
    });
  }

  formattedMessage += `\n\n───────────────────\n📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;

  return sendTelegramMessage(formattedMessage);
}

/**
 * 자료 제출 완료 알림 (관리자용)
 */
export async function notifySubmissionComplete(params: {
  cohortName: string;
  userName: string;
  brandName: string;
  userPhone: string;
  userEmail: string;
}): Promise<boolean> {
  const { cohortName, userName, brandName, userPhone, userEmail } = params;

  return notifyAdmin({
    title: "📋 자료 제출 완료",
    message: `${cohortName}_${userName}_${brandName} 님이 자료 제출을 완료했습니다.`,
    details: {
      기수: cohortName,
      이름: userName,
      브랜드명: brandName,
      연락처: userPhone,
      이메일: userEmail,
    },
  });
}

/**
 * 발주 요청 알림 (관리자용)
 */
export async function notifyOrderRequest(params: {
  cohortName: string;
  userName: string;
  brandName: string;
  printItems: string[];
}): Promise<boolean> {
  const { cohortName, userName, brandName, printItems } = params;

  return notifyAdmin({
    title: "🚀 발주 요청",
    message: `${cohortName}_${userName}_${brandName} 님이 발주를 요청했습니다.`,
    details: {
      기수: cohortName,
      이름: userName,
      브랜드명: brandName,
      "발주 항목": printItems.join(", "),
    },
  });
}

/**
 * 시안 완료 알림 (비활성화됨 - 텔레그램은 관리자 전용)
 * SMS를 통해 사용자에게 알림을 보내세요.
 */
export async function notifyDesignComplete(params: {
  userName: string;
  itemName: string;
  userChatId?: string;
}): Promise<boolean> {
  console.log("⚠️ 텔레그램 시안 완료 알림은 비활성화되었습니다. SMS를 사용하세요.");
  return false;
}

/**
 * 제작 완료 알림 (비활성화됨 - 텔레그램은 관리자 전용)
 * SMS를 통해 사용자에게 알림을 보내세요.
 */
export async function notifyProductionComplete(params: {
  userName: string;
  itemName: string;
  trackingNumber?: string;
  userChatId?: string;
}): Promise<boolean> {
  console.log("⚠️ 텔레그램 제작 완료 알림은 비활성화되었습니다. SMS를 사용하세요.");
  return false;
}

export default {
  sendTelegramMessage,
  notifyUser,
  notifyAdmin,
  notifySubmissionComplete,
  notifyOrderRequest,
  notifyDesignComplete,
  notifyProductionComplete,
};
