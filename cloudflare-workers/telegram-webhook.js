/**
 * Cloudflare Worker: 텔레그램 웹훅 핸들러
 *
 * 기능:
 * - 텔레그램에서 관리자 답장 수신
 * - 원본 메시지에서 스레드 ID 추출
 * - Next.js API로 답변 전송
 * - SSE를 통해 사용자에게 실시간 알림
 */

// 환경변수로 설정할 값들 (Cloudflare Worker Secrets)
// - TELEGRAM_BOT_TOKEN: 텔레그램 봇 토큰
// - API_BASE_URL: Next.js API URL (예: https://startpackage.vercel.app)
// - API_SECRET_KEY: API 호출 인증용 비밀키

export default {
  async fetch(request, env) {
    // CORS 프리플라이트 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // POST 요청만 처리
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const update = await request.json();
      console.log('텔레그램 업데이트 수신:', JSON.stringify(update, null, 2));

      // 메시지 업데이트인지 확인
      if (!update.message) {
        return new Response(JSON.stringify({ ok: true, skipped: 'no message' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const message = update.message;

      // 답장 메시지인지 확인 (reply_to_message가 있어야 함)
      if (!message.reply_to_message) {
        console.log('답장 메시지가 아님, 스킵');
        return new Response(JSON.stringify({ ok: true, skipped: 'not a reply' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const originalMessage = message.reply_to_message;
      const replyText = message.text;

      // 원본 메시지에서 스레드 ID 추출
      // 형식: 💬 <b>문의 답글</b> [ID: xxx] 또는 💬 <b>새 문의</b> [ID: xxx]
      const threadIdMatch = originalMessage.text?.match(/\[ID:\s*([a-zA-Z0-9]+)\]/);

      if (!threadIdMatch) {
        console.log('스레드 ID를 찾을 수 없음');

        // 텔레그램으로 오류 알림
        await sendTelegramMessage(
          env.TELEGRAM_BOT_TOKEN,
          message.chat.id,
          '⚠️ 스레드 ID를 찾을 수 없습니다.\n문의 메시지에 직접 답장해주세요.',
          message.message_id
        );

        return new Response(JSON.stringify({ ok: true, error: 'no thread id' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const threadId = threadIdMatch[1];
      console.log('추출된 스레드 ID:', threadId);
      console.log('답변 내용:', replyText);

      // Next.js API 호출하여 답변 등록
      const apiUrl = `${env.API_BASE_URL}/api/admin/communication/telegram-reply`;

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': env.API_SECRET_KEY || '',
        },
        body: JSON.stringify({
          threadId,
          content: replyText,
        }),
      });

      const apiResult = await apiResponse.json();
      console.log('API 응답:', apiResult);

      if (apiResult.success) {
        // 성공 알림
        await sendTelegramMessage(
          env.TELEGRAM_BOT_TOKEN,
          message.chat.id,
          '✅ 답변이 등록되었습니다.',
          message.message_id
        );
      } else {
        // 실패 알림
        await sendTelegramMessage(
          env.TELEGRAM_BOT_TOKEN,
          message.chat.id,
          `❌ 답변 등록 실패: ${apiResult.error || '알 수 없는 오류'}`,
          message.message_id
        );
      }

      return new Response(JSON.stringify({ ok: true, result: apiResult }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Worker 오류:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * 텔레그램 메시지 전송
 */
async function sendTelegramMessage(botToken, chatId, text, replyToMessageId) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_to_message_id: replyToMessageId,
      }),
    });
  } catch (error) {
    console.error('텔레그램 메시지 전송 실패:', error);
  }
}
