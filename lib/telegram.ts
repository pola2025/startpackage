/**
 * 텔레그램 알림 전송 유틸리티
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "Markdown" | "HTML";
}

/**
 * 텔레그램으로 메시지 전송
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Telegram 환경변수가 설정되지 않았습니다.");
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const message: TelegramMessage = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "Markdown",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Telegram API 오류:", data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("텔레그램 메시지 전송 실패:", error);
    return false;
  }
}

/**
 * 디자인 제작 요청 알림
 */
export async function notifyDesignRequest(userName: string, cohortName: string) {
  const message = `
🎨 *새로운 디자인 제작 요청*

👤 이름: ${userName}
📚 기수: ${cohortName}
⏰ 요청 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}

인쇄물 자료가 모두 업로드되었습니다.
디자인 시안 작업을 진행해 주세요.
  `.trim();

  return await sendTelegramMessage(message);
}

/**
 * 시안 업로드 완료 알림 (관리자용)
 * 사용자에게는 SMS로 알림을 보내세요.
 */
export async function notifyDesignUploaded(userName: string, workflowType: string) {
  const message = `
✅ *디자인 시안이 업로드되었습니다*

👤 ${userName}님의 시안이 업로드되었습니다.
📄 인쇄물: ${workflowType}

⚠️ 사용자에게는 SMS로 알림을 발송하세요.
  `.trim();

  return await sendTelegramMessage(message);
}

/**
 * 발주 요청 알림
 */
export async function notifyPrintOrder(userName: string, workflowType: string) {
  const message = `
🖨️ *인쇄물 발주 요청*

👤 이름: ${userName}
📄 인쇄물: ${workflowType}
⏰ 요청 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}

발주 승인을 진행해 주세요.
  `.trim();

  return await sendTelegramMessage(message);
}

/**
 * 배송 시작 알림 (관리자용)
 * 사용자에게는 SMS로 알림을 보내세요.
 */
export async function notifyShippingComplete(
  userName: string,
  workflowType: string,
  courier: string,
  trackingNumber: string
) {
  const message = `
🚚 *배송이 시작되었습니다*

👤 ${userName}님의 인쇄물 배송이 시작되었습니다.
📄 인쇄물: ${workflowType}
🚛 택배사: ${courier}
📦 운송장번호: ${trackingNumber}

⚠️ 사용자에게는 SMS로 배송 정보를 발송하세요.
  `.trim();

  return await sendTelegramMessage(message);
}
