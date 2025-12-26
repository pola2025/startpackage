# 실시간 메시지 알림 시스템

텔레그램 웹훅 + 슬랙 통합을 통한 실시간 양방향 메시지 시스템

## 개요

- **텔레그램**: 관리자가 답장하면 자동으로 DB에 답변 등록
- **슬랙**: 모든 메시지 기록 (사용자/관리자 구분)
- **SSE**: 웹 실시간 알림

## 아키텍처

```
사용자 → Next.js API → 텔레그램 그룹 알림 [ID: xxx]
                     → 슬랙 채널 기록
                     → SSE 실시간 알림

관리자 텔레그램 답장 → Cloudflare Worker → Next.js API → DB 저장
                                                      → 사용자 알림
```

## 필요한 환경변수

```env
# 텔레그램 (문의 전용 봇 - 웹훅 지원)
TELEGRAM_INQUIRY_BOT_TOKEN="봇토큰"
TELEGRAM_INQUIRY_CHAT_ID="그룹ID"  # 채널 아님, 그룹이어야 답장 가능

# 슬랙 통합 채널
SLACK_BOT_TOKEN="xoxb-..."
SLACK_QNA_CHANNEL_ID="C0..."

# Cloudflare Worker 인증
TELEGRAM_WEBHOOK_SECRET="비밀키"
```

## Cloudflare Worker 설정

### 1. Worker 코드 (cloudflare-workers/telegram-webhook.js)

```javascript
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const update = await request.json();

      if (!update.message || !update.message.reply_to_message) {
        return new Response(JSON.stringify({ ok: true, skipped: 'not a reply' }));
      }

      const message = update.message;
      const originalMessage = message.reply_to_message;
      const replyText = message.text;

      // [ID: xxx] 형식에서 스레드 ID 추출
      const threadIdMatch = originalMessage.text?.match(/\[ID:\s*([a-zA-Z0-9]+)\]/);

      if (!threadIdMatch) {
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, message.chat.id,
          '⚠️ 스레드 ID를 찾을 수 없습니다.', message.message_id);
        return new Response(JSON.stringify({ ok: true, error: 'no thread id' }));
      }

      const threadId = threadIdMatch[1];

      // Next.js API 호출
      const apiResponse = await fetch(`${env.API_BASE_URL}/api/admin/communication/telegram-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': env.API_SECRET_KEY || '',
        },
        body: JSON.stringify({ threadId, content: replyText }),
      });

      const apiResult = await apiResponse.json();

      if (apiResult.success) {
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, message.chat.id,
          '✅ 답변이 등록되었습니다.', message.message_id);
      } else {
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, message.chat.id,
          `❌ 답변 등록 실패: ${apiResult.error}`, message.message_id);
      }

      return new Response(JSON.stringify({ ok: true, result: apiResult }));
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
    }
  },
};

async function sendTelegramMessage(botToken, chatId, text, replyToMessageId) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_to_message_id: replyToMessageId }),
  });
}
```

### 2. wrangler.toml

```toml
name = "telegram-webhook"
main = "telegram-webhook.js"
compatibility_date = "2024-01-01"
workers_dev = true
```

### 3. Worker Secrets 설정

```bash
cd cloudflare-workers
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put API_BASE_URL      # https://your-domain.vercel.app
wrangler secret put API_SECRET_KEY
wrangler deploy
```

### 4. 텔레그램 웹훅 등록

```bash
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://telegram-webhook.{account}.workers.dev","allowed_updates":["message"]}'
```

## 텔레그램 클라이언트 코드

### lib/notification/telegramClient.ts

```typescript
const TELEGRAM_INQUIRY_BOT_TOKEN = process.env.TELEGRAM_INQUIRY_BOT_TOKEN || "";
const TELEGRAM_INQUIRY_CHAT_ID = process.env.TELEGRAM_INQUIRY_CHAT_ID || "";

export async function sendInquiryTelegramMessage(
  message: string,
  chatId?: string
): Promise<boolean> {
  const targetChatId = chatId || TELEGRAM_INQUIRY_CHAT_ID;

  if (!TELEGRAM_INQUIRY_BOT_TOKEN || !targetChatId) {
    console.error("문의하기용 텔레그램 설정 누락");
    return false;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_INQUIRY_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );

  const result = await response.json();
  return result.ok;
}
```

## 메시지 형식

### 텔레그램 (답장 가능하도록 ID 포함)

```
🔔 <b>새 문의</b> [ID: {threadId}]

<b>사용자:</b> 홍길동
<b>제목:</b> 문의 제목
<b>카테고리:</b> 일반

<b>내용:</b>
문의 내용...

💡 이 메시지에 답장하면 자동으로 답변이 등록됩니다.
```

### 슬랙 (통합 채널 기록)

**사용자 메시지:**
```
🔔 [홍길동] 새 문의
━━━━━━━━━━━━━━━━━━━━
제목: 문의 제목
카테고리: 일반

내용:
문의 내용...

📅 2024-12-25 11:30
```

**관리자 답변:**
```
📤 [관리자] → [홍길동] 답변
━━━━━━━━━━━━━━━━━━━━
담당자: 김디자이너
제목: 문의 제목

내용:
답변 내용...

📅 2024-12-25 12:00
```

## API 라우트 예시

### 새 문의 생성 시 알림 (threads/route.ts)

```typescript
// 텔레그램 알림
const { sendInquiryTelegramMessage } = await import("@/lib/notification/telegramClient");
await sendInquiryTelegramMessage(
  `🔔 <b>새 문의</b> [ID: ${thread.id}]\n\n<b>사용자:</b> ${userName}\n<b>제목:</b> ${title}\n\n<b>내용:</b>\n${content}\n\n💡 이 메시지에 답장하면 자동으로 답변이 등록됩니다.`
);

// 슬랙 알림
const SLACK_QNA_CHANNEL_ID = process.env.SLACK_QNA_CHANNEL_ID;
if (SLACK_QNA_CHANNEL_ID) {
  const { postMessage } = await import("@/lib/notification/slackClient");
  await postMessage({
    channelId: SLACK_QNA_CHANNEL_ID,
    text: `🔔 [${userName}] 새 문의`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `🔔 *[${userName}] 새 문의*\n━━━━━━━━━━━━━━━━━━━━` },
      },
      // ... 추가 블록
    ],
  });
}
```

### 텔레그램 답장 처리 API (telegram-reply/route.ts)

```typescript
export async function POST(request: Request) {
  // 인증 확인
  const apiSecret = request.headers.get("X-API-Secret");
  if (WEBHOOK_SECRET && apiSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId, content } = await request.json();

  // 스레드 확인 및 메시지 생성
  const thread = await prisma.communicationThread.findUnique({
    where: { id: threadId },
    include: { user: { select: { id: true, 이름: true } } },
  });

  if (!thread) {
    return NextResponse.json({ error: "스레드를 찾을 수 없음" }, { status: 404 });
  }

  // 메시지 저장
  await prisma.communicationMessage.create({
    data: {
      threadId,
      authorId: "telegram-admin",
      authorType: "admin",
      authorName: "관리자",
      content,
    },
  });

  // SSE 알림 + 슬랙 기록
  // ...

  return NextResponse.json({ success: true });
}
```

## 중요 사항

1. **채널 vs 그룹**: 텔레그램 채널에서는 답장 불가. 반드시 **그룹** 사용
2. **봇 분리**: getUpdates 폴링 사용하는 봇과 웹훅 봇은 분리해야 함
3. **스레드 ID**: `[ID: xxx]` 형식으로 메시지에 포함하여 답장 시 매칭
4. **환경변수**: Vercel 환경변수 추가 후 반드시 재배포 필요

## 체크리스트

- [ ] 텔레그램 봇 생성 (@BotFather)
- [ ] 텔레그램 그룹 생성 및 봇 관리자 추가
- [ ] Cloudflare Worker 배포
- [ ] Worker Secrets 설정
- [ ] 텔레그램 웹훅 등록
- [ ] 슬랙 채널 생성 및 봇 추가
- [ ] Vercel 환경변수 설정
- [ ] Vercel 재배포
- [ ] 테스트
