import { isExistingLogo } from "@/lib/submission/parts";

type Person = {
  이름?: string;
  englishName?: string;
  cohortName?: string;
  cohortEnglishName?: string;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * 로고 정보가 처음으로 다 모였을 때 한 번 보내는 "접수" 알림
 * 디자이너가 작업을 시작해도 된다는 신호다. 원본 이미지는 업로드 때 슬랙에 따로 올라간다.
 */
export async function notifyLogoInfoSubmitted(params: {
  channelId?: string;
  submission: Record<string, unknown>;
  person: Person;
}): Promise<void> {
  const { channelId, submission, person } = params;
  const name = person.이름 || person.englishName || "알 수 없음";
  const cohort = person.cohortName || person.cohortEnglishName || "";
  const brand = String(submission.브랜드명 || "미입력");
  const existing = isExistingLogo(submission);
  const description = String(submission.로고제작요청사항 || "").trim();
  const referenceCount = [
    submission.로고예시디자인URL,
    submission.로고예시디자인2URL,
  ].filter(Boolean).length;

  if (channelId) {
    try {
      const { postMessage } = await import("@/lib/notification/slackClient");
      const text = existing
        ? `🎨 *로고 정보 접수 · 기존 로고 사용*\n━━━━━━━━━━━━━━━━━━━━\n교육생이 기존 로고 파일을 제출했습니다. 확인 후 진행해 주세요.`
        : [
            "🎨 *로고 정보 접수 · 디자이너 작업 시작 가능*",
            "━━━━━━━━━━━━━━━━━━━━",
            `*선호 스타일:* ${submission.로고선호스타일 || "-"}`,
            `*선호 폰트:* ${submission.로고선호폰트 || "-"}`,
            `*선호 색상:* ${submission.로고선호색상 || "-"}`,
            `*원하는 로고 설명:*\n${description || "-"}`,
            `*참고 로고:* ${referenceCount}장 (원본은 이 채널에 올라간 이미지)`,
          ].join("\n");
      await postMessage({ channelId, text });
    } catch (error) {
      console.error(
        "로고 접수 Slack 알림 실패:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  try {
    const { sendTelegramMessage } =
      await import("@/lib/notification/telegramClient");
    const summary = existing
      ? "기존 로고 파일 제출"
      : `스타일·폰트·색상 · 설명 ${description.length}자 · 참고 로고 ${referenceCount}장`;
    await sendTelegramMessage(
      [
        "[startpackage/logo-info]",
        "⚡️ <b>로고 정보 접수</b> · 디자이너 작업 시작 가능",
        `${escapeHtml(name)} · ${escapeHtml(brand)}${cohort ? ` (${escapeHtml(cohort)})` : ""}`,
        escapeHtml(summary),
      ].join("\n"),
    );
  } catch (error) {
    console.error(
      "로고 접수 Telegram 알림 실패:",
      error instanceof Error ? error.message : error,
    );
  }
}
