/**
 * Meta 설정요청 알림과 토큰 안내 메일
 * - 요청: 학생 슬랙 채널(ID/PW 원문, 홈페이지 제작요청과 같은 방식) + 텔레그램(비밀번호 제외 요약)
 * - 완료: 토큰 2개를 mkt@polarad.co.kr 메일로 보내고, 슬랙·텔레그램에는 토큰 없이 완료만 알린다
 */

export type MetaSetupType = "instagram" | "google";

export type MetaSetupUser = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cohortName?: string | null;
  brandName?: string | null;
  slackChannelId?: string | null;
};

const TYPE_LABEL: Record<MetaSetupType, string> = {
  instagram: "인스타그램",
  google: "구글",
};
const DASHBOARD_URL = "https://www.polaai.co.kr/dashboard/meta-setup";

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** 텔레그램에는 아이디도 앞 5자만 보인다 */
export const maskLoginId = (value: string) =>
  value.length <= 5 ? `${value.slice(0, 2)}***` : `${value.slice(0, 5)}***`;

async function ensureSlackChannel(
  user: MetaSetupUser,
  persistSlackChannel: (channelId: string) => Promise<void>,
): Promise<string | null> {
  if (user.slackChannelId) return user.slackChannelId;
  const { createSlackChannel } = await import("@/lib/notification/slackClient");
  const channelId = await createSlackChannel({
    cohortName: user.cohortName || "unknown",
    userName: user.name || "unknown",
    brandName: user.brandName || "meta",
    userEmail: user.email || "",
    userPhone: user.phone || "",
  });
  if (channelId) await persistSlackChannel(channelId);
  return channelId || null;
}

export async function sendMetaSetupRequestNotifications(
  user: MetaSetupUser,
  request: {
    type: MetaSetupType;
    loginId: string;
    password: string;
    memo: string | null;
    updated: boolean;
  },
  persistSlackChannel: (channelId: string) => Promise<void>,
): Promise<void> {
  const label = TYPE_LABEL[request.type];
  const heading = request.updated ? "Meta 설정요청 수정" : "Meta 설정요청 접수";

  try {
    const channelId = await ensureSlackChannel(user, persistSlackChannel);
    if (channelId) {
      const { postMessage } = await import("@/lib/notification/slackClient");
      const lines = [
        `📱 *${heading}*`,
        "━━━━━━━━━━━━━━━━━━━━",
        `*계정 유형:* ${label}`,
        `*아이디:* ${request.loginId}`,
        `*비밀번호:* ${request.password}`,
      ];
      if (request.memo) lines.push(`*전달 내용:* ${request.memo}`);
      lines.push(
        "",
        "_마케팅 교육 전에 Meta 설정을 마치고 관리자 화면에서 토큰 2개를 입력해 완료 처리해 주세요._",
      );
      await postMessage({ channelId, text: lines.join("\n") });
    }
  } catch (error) {
    console.error(
      "Meta 설정요청 Slack 알림 실패:",
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const { sendTelegramMessage } =
      await import("@/lib/notification/telegramClient");
    await sendTelegramMessage(
      [
        "[startpackage/meta-setup]",
        `⚡️ <b>${heading}</b>`,
        `${escapeHtml(user.name || "알 수 없음")} · ${escapeHtml(user.brandName || "브랜드 미입력")}${user.cohortName ? ` (${escapeHtml(user.cohortName)})` : ""}`,
        `계정 유형: ${label} · ${escapeHtml(maskLoginId(request.loginId))}`,
        "슬랙 채널에서 상세 확인",
      ].join("\n"),
    );
  } catch (error) {
    console.error(
      "Meta 설정요청 Telegram 알림 실패:",
      error instanceof Error ? error.message : error,
    );
  }
}

/** 토큰 안내 메일 (왼쪽 정렬, 문단 구조: 인사 → 목적 → 토큰 → 다음 행동 → 맺음말) */
export function buildMetaTokenEmail(params: {
  name?: string | null;
  systemUserToken: string;
  threadsToken: string;
}): { subject: string; html: string; text: string } {
  const name = params.name || "대표";
  const p = (content: string) =>
    `<p style="margin:0 0 14px;text-align:left;line-height:1.7;">${content}</p>`;
  const tokenCell = (title: string, token: string) =>
    `<tr><td style="padding:10px 12px;text-align:left;border:1px solid #d7dde5;background:#f8fafc;width:140px;font-weight:700;">${escapeHtml(title)}</td>` +
    `<td style="padding:10px 12px;text-align:left;border:1px solid #d7dde5;font-family:Consolas,monospace;font-size:12px;word-break:break-all;">${escapeHtml(token)}</td></tr>`;

  const html = [
    "<div style=\"max-width:640px;margin:0;text-align:left;font-family:'Malgun Gothic',sans-serif;font-size:14px;color:#1e293b;\">",
    p(`안녕하세요, ${escapeHtml(name)}님. 폴라애드입니다.`),
    p(
      "요청하신 Meta(페이스북·인스타그램) 설정을 마쳤습니다. 교육 08G Meta SNS 자동화와 08H Meta 광고 자동화에서 쓰는 토큰 2개를 보내 드립니다.",
    ),
    `<table style="border-collapse:collapse;width:100%;margin:0 0 14px;">${tokenCell("시스템사용자 토큰", params.systemUserToken)}${tokenCell("쓰레드 토큰", params.threadsToken)}</table>`,
    '<p style="margin:0 0 6px;text-align:left;line-height:1.7;font-weight:700;">다음에 하실 일</p>',
    '<ol style="margin:0 0 14px;padding-left:20px;text-align:left;">',
    '<li style="text-align:left;line-height:1.7;">교육 08G STEP 01~02를 따라 두 토큰을 Codex에게 붙여 넣습니다.</li>',
    `<li style="text-align:left;line-height:1.7;">이 메일을 찾기 어려우면 스타트패키지 대시보드의 <a href="${DASHBOARD_URL}" style="color:#003876;">Meta 설정요청</a> 화면에서도 같은 토큰을 볼 수 있습니다.</li>`,
    '<li style="text-align:left;line-height:1.7;">토큰은 대표님 계정을 다루는 열쇠라서 다른 사람에게 전달하지 않습니다.</li>',
    "</ol>",
    p("궁금한 점은 이 메일에 회신하시거나 카카오톡 채널로 문의해 주세요."),
    p("감사합니다.<br>폴라애드 드림"),
    "</div>",
  ].join("");

  const text = [
    `안녕하세요, ${name}님. 폴라애드입니다.`,
    "",
    "요청하신 Meta(페이스북·인스타그램) 설정을 마쳤습니다. 교육 08G Meta SNS 자동화와 08H Meta 광고 자동화에서 쓰는 토큰 2개를 보내 드립니다.",
    "",
    `시스템사용자 토큰: ${params.systemUserToken}`,
    `쓰레드 토큰: ${params.threadsToken}`,
    "",
    "다음에 하실 일",
    "1. 교육 08G STEP 01~02를 따라 두 토큰을 Codex에게 붙여 넣습니다.",
    `2. 대시보드 Meta 설정요청 화면(${DASHBOARD_URL})에서도 같은 토큰을 볼 수 있습니다.`,
    "3. 토큰은 대표님 계정을 다루는 열쇠라서 다른 사람에게 전달하지 않습니다.",
    "",
    "궁금한 점은 이 메일에 회신하시거나 카카오톡 채널로 문의해 주세요.",
    "",
    "감사합니다.",
    "폴라애드 드림",
  ].join("\n");

  return {
    subject: "[폴라애드] Meta 설정 완료 · 교육용 토큰 안내",
    html,
    text,
  };
}

/** 완료 알림 (토큰은 넣지 않는다) */
export async function sendMetaSetupDoneNotifications(
  user: MetaSetupUser,
  emailResult: { sent: boolean; error?: string },
): Promise<void> {
  const mailLine = emailResult.sent
    ? `토큰 메일 발송: ${user.email}`
    : `토큰 메일 발송 실패 (${emailResult.error || "원인 미상"}) · 교육생 대시보드에서는 확인 가능`;
  if (user.slackChannelId) {
    try {
      const { postMessage } = await import("@/lib/notification/slackClient");
      await postMessage({
        channelId: user.slackChannelId,
        text: `✅ *Meta 설정 완료*\n${mailLine}`,
      });
    } catch (error) {
      console.error(
        "Meta 설정 완료 Slack 알림 실패:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  try {
    const { sendTelegramMessage } =
      await import("@/lib/notification/telegramClient");
    await sendTelegramMessage(
      [
        "[startpackage/meta-setup]",
        "✅ <b>Meta 설정 완료</b>",
        `${escapeHtml(user.name || "알 수 없음")} · ${escapeHtml(user.brandName || "브랜드 미입력")}`,
        escapeHtml(mailLine),
      ].join("\n"),
    );
  } catch (error) {
    console.error(
      "Meta 설정 완료 Telegram 알림 실패:",
      error instanceof Error ? error.message : error,
    );
  }
}
