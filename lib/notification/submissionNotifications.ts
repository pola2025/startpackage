import { isLogoInfoComplete } from "@/lib/submission/parts";
import { isDisplayWebpUrl } from "@/lib/constants/displayImageFields";
import { notifyLogoInfoSubmitted } from "@/lib/notification/logoInfoSubmitted";
import { SUBMISSION_SLACK_FIELDS, submissionFieldText, toFieldSections } from "@/lib/notification/submissionSlackFields";

type SubmissionNotificationPerson = { email?: string; 이름?: string; englishName?: string; 연락처?: string; slackChannelId?: string | null; cohortName?: string; cohortEnglishName?: string; cohort?: { name?: string; englishName?: string } | null };

export async function notifySubmissionChanges(
  userId: string,
  submission: Record<string, unknown>,
  previous: Record<string, unknown> | undefined,
  person: SubmissionNotificationPerson,
  persistChannel: (channelId: string) => Promise<void>,
  touchedKeys: string[] = Object.keys(submission),
) {
  const touched = (key: string) => touchedKeys.includes(key);
  let channelId = person.slackChannelId || undefined;
  const cohortName = person.cohortEnglishName || person.cohortName || "unknown";
  const userName = person.englishName || person.이름 || "unknown";
  const brandName = String(submission.brandNameEnglish || submission.브랜드명 || "unknown");
  const slack = await import("@/lib/notification/slackClient");
  const hasBasicInfo = (value?: Record<string, unknown>) => Boolean(value?.브랜드명 && value?.업종 && value?.주소);
  if (!channelId && hasBasicInfo(submission)) {
    channelId = await slack.createSlackChannel({ cohortName, userName, brandName, userEmail: person.email || "", userPhone: person.연락처 || "" }) || undefined;
    if (channelId) {
      await persistChannel(channelId);
      await slack.pushSubmissionData({ channelId, submissionData: submission, userId });
    }
  } else if (channelId && hasBasicInfo(submission) && !hasBasicInfo(previous)) {
    // Meta 설정요청·홈페이지 요청이 기본 정보보다 먼저 채널을 만든 경우: 기본 정보가 처음 다 모인 순간 제작 정보를 한 번 올린다
    await slack.pushSubmissionData({ channelId, submissionData: submission, userId }).catch(() => false);
  }
  // 로고 정보가 처음으로 다 모인 순간 한 번: 디자이너 작업 시작 신호 (채널이 없어도 텔레그램은 보냄)
  if (!isLogoInfoComplete(previous) && isLogoInfoComplete(submission)) {
    await notifyLogoInfoSubmitted({ channelId, submission, person }).catch((error: unknown) => console.error("로고 접수 알림 실패:", error));
  }
  if (!channelId) return;
  if (touched("홈페이지스타일") || touched("홈페이지컬러컨셉")) {
    const styleNames: Record<string, string> = { "https://www.jnipartners.co.kr": "스타일 1", "https://bizcoaching.co.kr/": "스타일 2", "https://startpackage-demo-style3.vercel.app/": "스타일 3", "https://biznuri.co.kr/": "스타일 4", "https://www.wiztion.com/": "스타일 5", "https://brpartners.kr/": "스타일 6", "https://startpackagedemo.vercel.app/": "스타일 7", "https://hopebizgroup.com/": "스타일 8", "https://gopartners.cc/": "스타일 9" };
    const style = String(submission.홈페이지스타일 || "");
    await slack.postMessage({ channelId, text: "✅ 홈페이지 스타일 & 컬러 선택", blocks: [{ type: "section", text: { type: "mrkdwn", text: `*✅ 홈페이지 스타일 & 컬러 선택*\\n\\n*선택한 스타일:* ${styleNames[style] || style || "-"}\\n*컬러 컨셉:* ${submission.홈페이지컬러컨셉 || "-"}` } }] }).catch(() => undefined);
  }
  if (!previous) return;
  // 바뀐 값을 그대로 보낸다 ("업데이트됨"만 보내면 처음 제작 정보 뒤에 입력한 값은 슬랙에 영영 남지 않는다)
  const changed = SUBMISSION_SLACK_FIELDS.filter(([key]) => touched(key) && submission[key] && submission[key] !== previous[key]);
  if (changed.length) {
    await slack.postMessage({ channelId, text: "📝 제출 정보 업데이트", blocks: toFieldSections(changed.map(([key, label]) => ({ type: "mrkdwn" as const, text: submissionFieldText(key, label, submission[key]) }))) }).catch(() => undefined);
  }
  if (touched("로고제작요청사항") && submission.로고제작요청사항 && submission.로고제작요청사항 !== previous.로고제작요청사항) {
    await slack.postMessage({ channelId, text: `🎨 로고 설명 업데이트\n${String(submission.로고제작요청사항).slice(0, 2900)}` }).catch(() => undefined);
  }
  if (touched("GmailID") && submission.GmailID && !changed.some(([key]) => key === "GmailID")) {
    await slack.postMessage({ channelId, text: "✅ Gmail 계정 정보 등록" }).catch(() => undefined);
  }
  const fileFields = [
    ["사업자등록증URL", "사업자등록증", "사업자등록증.pdf"], ["로고URL", "로고 파일", "로고.png"],
    ["대표자신분증URL", "대표자신분증", "대표자신분증.jpg"], ["통신서비스이용증명원URL", "통신서비스이용증명원", "통신서비스이용증명원.pdf"],
    ["신용카드앞면URL", "신용카드앞면", "신용카드앞면.jpg"], ["로고예시디자인URL", "로고예시디자인", "로고예시디자인.jpg"], ["로고예시디자인2URL", "로고예시디자인2", "로고예시디자인2.jpg"],
  ] as const;
  // 프로필 사진은 표시용 webp 를 슬랙에 올리지 않는다. 아직 못 보낸 원본이 있으면 그것만 올린다.
  if (touched("프로필사진URL") && submission.프로필사진URL && submission.프로필사진URL !== previous.프로필사진URL) {
    await slack.sendPendingProfileOriginal({ userId, channelId, userName: person.이름 }).catch(() => false);
    const telegram = await import("@/lib/notification/telegramClient");
    await telegram.sendTelegramMessage(`📤 *파일 업로드*\n\n*사용자:* ${userName}\n*파일:* 프로필사진`).catch(() => undefined);
  }
  for (const [key, label, fileName] of fileFields) {
    // 표시용 webp 는 슬랙에 올리지 않는다 (원본은 업로드 때 슬랙으로 갔거나 채널이 생기면 보관분이 올라감)
    if (touched(key) && submission[key] && submission[key] !== previous[key] && !isDisplayWebpUrl(submission[key])) {
      await slack.uploadFileToSlack({ channelId, filePath: String(submission[key]), fileName, title: label }).catch(() => undefined);
      const telegram = await import("@/lib/notification/telegramClient");
      await telegram.sendTelegramMessage(`📤 *파일 업로드*\\n\\n*사용자:* ${userName}\\n*파일:* ${label}`).catch(() => undefined);
    }
  }
  for (const [key, label] of [["명함시안", "명함 스타일"], ["계약서시안", "계약서 스타일"]] as const) {
    if (touched(key) && submission[key] && submission[key] !== previous[key]) await slack.postMessage({ channelId, text: `✅ ${label} 선택: ${submission[key]}` }).catch(() => undefined);
  }
}
