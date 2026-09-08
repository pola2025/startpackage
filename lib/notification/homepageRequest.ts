type HomepageRequestUser = {
  name?: string | null;
  cohortName?: string | null;
  brandName?: string | null;
  slackChannelId?: string | null;
};

type HomepageRequestBody = {
  홈페이지제작방식: string;
  해외결제카드유효기간: string;
  해외결제카드CVC: string;
  GmailID: string;
  GmailPW: string;
  홈페이지스타일?: string | null;
  홈페이지컬러컨셉?: string | null;
};

const styleNames: Record<string, string> = {
  "https://www.jnipartners.co.kr": "스타일 1",
  "https://bizcoaching.co.kr/": "스타일 2",
  "https://startpackage-demo-style3.vercel.app/": "스타일 3",
  "https://biznuri.co.kr/": "스타일 4",
  "https://www.wiztion.com/": "스타일 5",
  "https://brpartners.kr/": "스타일 6",
  "https://startpackagedemo.vercel.app/": "스타일 7",
  "https://hopebizgroup.com/": "스타일 8",
  "https://gopartners.cc/": "스타일 9",
  "https://startpackage-demo2.vercel.app/": "스타일 8",
  "https://startpackage-demo3.vercel.app/": "스타일 9",
  "https://mjgood.imweb.me/": "스타일 2",
  "https://bizen.co.kr/": "스타일 2",
  "https://ksupport-center.imweb.me/": "스타일 4",
  "https://fpbiz.imweb.me/": "스타일 6",
  "https://www.k-eai.kr/index.html": "스타일 6",
};

export async function sendHomepageRequestNotifications(user: HomepageRequestUser, body: HomepageRequestBody): Promise<void> {
  try {
    const { postMessage } = await import("@/lib/notification/slackClient");
    if (user.slackChannelId) {
      let message = `📋 *홈페이지 제작 상세 정보*\n━━━━━━━━━━━━━━━━━━━━\n*제작 방식:* ${body.홈페이지제작방식}\n`;
      message += `• 카드 유효기간: ${body.해외결제카드유효기간}\n• 카드 CVC: ${body.해외결제카드CVC}\n`;
      message += `\n*Gmail (서비스 인프라 연결용)*\n• ID: ${body.GmailID}\n• PW: ${body.GmailPW}\n`;
      if (body.홈페이지스타일) message += `\n*스타일 선택*\n• 선택 스타일: ${styleNames[body.홈페이지스타일] || body.홈페이지스타일}\n• 참고 URL: ${body.홈페이지스타일}\n`;
      if (body.홈페이지컬러컨셉) message += `• 컬러 컨셉: ${body.홈페이지컬러컨셉}\n`;
      await postMessage({ channelId: user.slackChannelId, text: message });
    }
    const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
    let telegramMsg = `🌐 <b>홈페이지 제작 요청</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 ${user.name || "알 수 없음"}`;
    if (user.cohortName) telegramMsg += ` (${user.cohortName})`;
    telegramMsg += `\n🏢 브랜드: ${user.brandName || "미지정"}\n📋 제작 방식: ${body.홈페이지제작방식}\n`;
    if (body.홈페이지스타일) telegramMsg += `🎨 스타일: ${styleNames[body.홈페이지스타일] || "선택됨"}\n`;
    await sendTelegramMessage(telegramMsg);
  } catch (error) {
    console.error("알림 발송 실패:", error);
  }
}
