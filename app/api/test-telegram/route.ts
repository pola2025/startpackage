import { NextResponse } from "next/server";

export async function GET() {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

  // 토큰 마스킹 (앞 10자만 표시)
  const maskedToken = TELEGRAM_BOT_TOKEN
    ? `${TELEGRAM_BOT_TOKEN.slice(0, 10)}...`
    : "NOT SET";

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: "✅ 테스트 메시지 - Vercel에서 발송",
          parse_mode: "HTML",
        }),
      }
    );

    const result = await response.json();

    return NextResponse.json({
      token: maskedToken,
      chatId: TELEGRAM_CHAT_ID,
      telegramResponse: result,
    });
  } catch (error: any) {
    return NextResponse.json({
      token: maskedToken,
      chatId: TELEGRAM_CHAT_ID,
      error: error.message,
    });
  }
}
