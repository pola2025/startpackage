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

/**
 * 토큰 안내 메일 (폭 580px, 인라인 스타일, 네이비 머리띠, 왼쪽 정렬)
 * 메일 프로그램은 스크립트를 막아 복사 버튼이 동작하지 않는다. 토큰을 상자 하나에 하나씩 담아
 * 길게 누르거나 세 번 클릭하면 그 토큰만 선택되게 하고, 토큰 옆에 대시보드(그 토큰 자동 복사)로 가는 복사 버튼을 둔다.
 */
export function buildMetaTokenEmail(params: {
  name?: string | null;
  systemUserToken: string;
  threadsToken: string;
}): { subject: string; html: string; text: string } {
  const name = params.name || "대표";
  const p = (content: string, extra = "") =>
    `<p style="margin:0 0 14px;text-align:left;line-height:1.7;${extra}">${content}</p>`;
  const note = (content: string, extra = "") =>
    `<p style="margin:6px 0 0;text-align:left;font-size:12px;line-height:1.6;color:#64748b;${extra}">${content}</p>`;
  // 메일 속 버튼은 복사를 직접 하지 못한다. 대시보드를 열면 그 토큰을 강조하고 자동 복사를 시도한다
  const tokenBlock = (step: string, title: string, token: string, copyKey: "system" | "threads") =>
    `<p style="margin:18px 0 6px;text-align:left;font-size:13px;font-weight:700;color:#0d1b2a;">${step} ${escapeHtml(title)}</p>` +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">' +
    `<tr><td style="padding:14px 16px;background:#f8fafc;border:1px solid #cbd5e1;border-right:0;border-left:4px solid #c9a84c;border-radius:6px 0 0 6px;text-align:left;font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:1.6;color:#0f172a;word-break:break-all;-webkit-user-select:all;user-select:all;">${escapeHtml(token)}</td>` +
    `<td width="76" style="width:76px;background:#1b2838;border-radius:0 6px 6px 0;text-align:center;vertical-align:middle;"><a href="${DASHBOARD_URL}?copy=${copyKey}" style="display:block;padding:14px 0;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">복사</a></td></tr>` +
    "</table>";

  const html = [
    '<div style="margin:0;padding:24px 12px;background:#f1f5f9;">',
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1e293b;\">",
    '<tr><td style="padding:22px 28px;background:#0d1b2a;border-radius:10px 10px 0 0;text-align:left;">',
    '<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#c9a84c;">폴라애드 · 스타트패키지</p>',
    '<p style="margin:0;font-size:20px;font-weight:700;line-height:1.4;color:#ffffff;">Meta 설정을 마쳤습니다</p>',
    '<p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#c5cfd9;">교육 08G·08H에서 쓰는 토큰 2개를 보내 드립니다.</p>',
    "</td></tr>",
    '<tr><td style="padding:26px 28px 8px;text-align:left;">',
    p(`안녕하세요, ${escapeHtml(name)}님. 폴라애드입니다.`),
    p(
      "요청하신 Meta(페이스북·인스타그램) 설정을 마쳤습니다. 아래 토큰 2개는 교육 08G Meta SNS 자동화와 08H Meta 광고 자동화에서 Codex에게 붙여 넣는 값입니다.",
    ),
    tokenBlock("①", "시스템사용자 토큰", params.systemUserToken, "system"),
    tokenBlock("②", "쓰레드 토큰", params.threadsToken, "threads"),
    note(
      "복사 버튼을 누르면 스타트패키지 대시보드가 열리고 그 토큰이 복사됩니다. 메일에서 바로 복사할 때는 상자 안을 길게 누르거나(휴대폰) 세 번 클릭하면(PC) 토큰 전체가 선택됩니다.",
      "margin-top:8px;",
    ),
    '<p style="margin:22px 0 6px;text-align:left;font-weight:700;color:#0d1b2a;">다음에 하실 일</p>',
    '<ol style="margin:0 0 16px;padding-left:20px;text-align:left;">',
    '<li style="text-align:left;line-height:1.7;">교육 08G STEP 01~02를 따라 두 토큰을 Codex에게 붙여 넣습니다.</li>',
    `<li style="text-align:left;line-height:1.7;">이 메일을 찾기 어려우면 스타트패키지 대시보드의 <a href="${DASHBOARD_URL}" style="color:#003876;">Meta 설정요청</a> 화면에서도 같은 토큰을 볼 수 있습니다.</li>`,
    "</ol>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;text-align:left;font-size:13px;line-height:1.6;color:#92400e;">토큰은 대표님 계정을 다루는 열쇠입니다. 다른 사람에게 전달하지 말아 주세요.</td></tr></table>',
    p("궁금한 점은 이 메일에 회신하시거나 카카오톡 채널로 문의해 주세요."),
    p("감사합니다.<br>폴라애드 드림", "margin-bottom:22px;"),
    "</td></tr>",
    '<tr><td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 10px 10px;text-align:left;font-size:11px;line-height:1.6;color:#94a3b8;">이 메일은 스타트패키지 Meta 설정요청에 따라 보내 드렸습니다.</td></tr>',
    "</table>",
    "</div>",
  ].join("");

  const text = [
    `안녕하세요, ${name}님. 폴라애드입니다.`,
    "",
    "요청하신 Meta(페이스북·인스타그램) 설정을 마쳤습니다. 아래 토큰 2개는 교육 08G Meta SNS 자동화와 08H Meta 광고 자동화에서 Codex에게 붙여 넣는 값입니다.",
    "",
    "① 시스템사용자 토큰",
    params.systemUserToken,
    `(대시보드에서 복사: ${DASHBOARD_URL}?copy=system)`,
    "",
    "② 쓰레드 토큰",
    params.threadsToken,
    `(대시보드에서 복사: ${DASHBOARD_URL}?copy=threads)`,
    "",
    "다음에 하실 일",
    "1. 교육 08G STEP 01~02를 따라 두 토큰을 Codex에게 붙여 넣습니다.",
    `2. 대시보드 Meta 설정요청 화면(${DASHBOARD_URL})에서도 같은 토큰을 볼 수 있습니다.`,
    "",
    "토큰은 대표님 계정을 다루는 열쇠입니다. 다른 사람에게 전달하지 말아 주세요.",
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
