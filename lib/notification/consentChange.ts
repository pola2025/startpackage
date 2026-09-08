type ConsentValues = {
  SMS수신동의?: boolean | null;
  이메일수신동의?: boolean | null;
  slackChannelId?: string | null;
};

export async function sendConsentChangeNotification(before: ConsentValues, after: ConsentValues): Promise<void> {
  if (!before.slackChannelId) return;
  const changed: string[] = [];
  if (after.SMS수신동의 !== undefined && after.SMS수신동의 !== before.SMS수신동의) {
    changed.push(`SMS 수신동의: ${before.SMS수신동의 ? "동의" : "미동의"} → *${after.SMS수신동의 ? "동의" : "미동의"}*`);
  }
  if (after.이메일수신동의 !== undefined && after.이메일수신동의 !== before.이메일수신동의) {
    changed.push(`이메일 수신동의: ${before.이메일수신동의 ? "동의" : "미동의"} → *${after.이메일수신동의 ? "동의" : "미동의"}*`);
  }
  if (!changed.length) return;
  const { postMessage } = await import("@/lib/notification/slackClient");
  await postMessage({
    channelId: before.slackChannelId,
    text: "⚙️ 수신동의 설정 변경",
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*⚙️ 수신동의 설정 변경*\n${changed.join("\n")}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` }] },
    ],
  });
}
