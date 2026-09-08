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
  if (!channelId && submission.브랜드명 && submission.업종 && submission.주소) {
    channelId = await slack.createSlackChannel({ cohortName, userName, brandName, userEmail: person.email || "", userPhone: person.연락처 || "" }) || undefined;
    if (channelId) {
      await persistChannel(channelId);
      await slack.pushSubmissionData({ channelId, submissionData: submission });
    }
  }
  if (!channelId) return;
  if (touched("홈페이지스타일") || touched("홈페이지컬러컨셉")) {
    const styleNames: Record<string, string> = { "https://www.jnipartners.co.kr": "스타일 1", "https://bizcoaching.co.kr/": "스타일 2", "https://startpackage-demo-style3.vercel.app/": "스타일 3", "https://biznuri.co.kr/": "스타일 4", "https://www.wiztion.com/": "스타일 5", "https://brpartners.kr/": "스타일 6", "https://startpackagedemo.vercel.app/": "스타일 7", "https://hopebizgroup.com/": "스타일 8", "https://gopartners.cc/": "스타일 9" };
    const style = String(submission.홈페이지스타일 || "");
    await slack.postMessage({ channelId, text: "✅ 홈페이지 스타일 & 컬러 선택", blocks: [{ type: "section", text: { type: "mrkdwn", text: `*✅ 홈페이지 스타일 & 컬러 선택*\\n\\n*선택한 스타일:* ${styleNames[style] || style || "-"}\\n*컬러 컨셉:* ${submission.홈페이지컬러컨셉 || "-"}` } }] }).catch(() => undefined);
  }
  if (!previous) return;
  const fields = [
    ["브랜드명", "브랜드명"], ["업종", "업종"], ["주소", "주소"], ["인쇄물받을주소", "배송받을곳 주소"],
    ["받는분이름", "인쇄물 수령인"], ["수령연락처", "수령 연락처"], ["우편번호", "우편번호"], ["대표번호", "대표번호"],
    ["이메일", "이메일"], ["로고선호스타일", "로고 선호 스타일"], ["로고선호색상", "로고 선호 색상"], ["로고선호폰트", "로고 선호 폰트"],
    ["명함색상", "로고/명함 색상"], ["명함시안", "명함 스타일"], ["계약서시안", "계약서 스타일"], ["GmailID", "Gmail ID"],
    ["GmailPW", "Gmail 비밀번호"], ["네이버검색광고ID", "네이버 검색광고 ID"], ["네이버검색광고PW", "네이버 검색광고 비밀번호"],
    ["네이버클라우드ID", "네이버 클라우드 ID"], ["네이버클라우드PW", "네이버 클라우드 비밀번호"], ["InstagramID", "Instagram ID"], ["InstagramPW", "Instagram 비밀번호"],
    ["홈페이지스타일", "홈페이지 스타일"], ["홈페이지컬러컨셉", "홈페이지 컬러"], ["은행명", "은행명"], ["계좌번호", "계좌번호"], ["계좌명의자명", "계좌명의자"],
  ] as const;
  const changed = fields.filter(([key]) => touched(key) && submission[key] && submission[key] !== previous[key]);
  if (changed.length) {
    await slack.postMessage({ channelId, text: "📝 제출 정보 업데이트", blocks: [{ type: "section", fields: changed.map(([key, label]) => ({ type: "mrkdwn", text: `*${label}:* ${key.endsWith("PW") ? "등록/변경됨" : "업데이트됨"}` })) }] }).catch(() => undefined);
  }
  if (touched("GmailID") && submission.GmailID && !changed.some(([key]) => key === "GmailID")) {
    await slack.postMessage({ channelId, text: "✅ Gmail 계정 정보 등록" }).catch(() => undefined);
  }
  const fileFields = [
    ["사업자등록증URL", "사업자등록증", "사업자등록증.pdf"], ["프로필사진URL", "프로필사진", "프로필사진.jpg"], ["로고URL", "로고 파일", "로고.png"],
    ["대표자신분증URL", "대표자신분증", "대표자신분증.jpg"], ["통신서비스이용증명원URL", "통신서비스이용증명원", "통신서비스이용증명원.pdf"],
    ["신용카드앞면URL", "신용카드앞면", "신용카드앞면.jpg"], ["로고예시디자인URL", "로고예시디자인", "로고예시디자인.jpg"], ["로고예시디자인2URL", "로고예시디자인2", "로고예시디자인2.jpg"],
  ] as const;
  for (const [key, label, fileName] of fileFields) {
    if (touched(key) && submission[key] && submission[key] !== previous[key]) {
      await slack.uploadFileToSlack({ channelId, filePath: String(submission[key]), fileName, title: label }).catch(() => undefined);
      const telegram = await import("@/lib/notification/telegramClient");
      await telegram.sendTelegramMessage(`📤 *파일 업로드*\\n\\n*사용자:* ${userName}\\n*파일:* ${label}`).catch(() => undefined);
    }
  }
  for (const [key, label] of [["명함시안", "명함 스타일"], ["계약서시안", "계약서 스타일"]] as const) {
    if (touched(key) && submission[key] && submission[key] !== previous[key]) await slack.postMessage({ channelId, text: `✅ ${label} 선택: ${submission[key]}` }).catch(() => undefined);
  }
}
