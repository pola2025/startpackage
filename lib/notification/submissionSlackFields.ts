import { formatPhoneNumber } from "@/lib/utils";

/**
 * 슬랙에 값으로 보내는 제출 정보 항목 (관리자 제출정보 화면과 같은 범위)
 * - "📋 제작 정보"와 "📝 제출 정보 업데이트"가 같은 목록을 쓴다. 목록이 갈라지면 관리자에는 있는데 슬랙에는 없는 값이 생긴다.
 * - 파일은 원본 업로드로, 해외결제카드는 홈페이지 요청 메시지로, 로고 설명은 긴 글이라 따로 보낸다.
 */
export const SUBMISSION_SLACK_FIELDS = [
  ["브랜드명", "브랜드명"],
  ["업종", "업종"],
  ["주소", "주소"],
  ["대표번호", "대표번호"],
  ["이메일", "이메일"],
  ["인쇄물받을주소", "배송받을곳 주소"],
  ["받는분이름", "인쇄물 수령인"],
  ["수령연락처", "수령 연락처"],
  ["우편번호", "우편번호"],
  ["은행명", "은행명"],
  ["계좌번호", "계좌번호"],
  ["계좌명의자명", "계좌명의자"],
  ["로고제작방식", "로고 제작 방식"],
  ["로고선호스타일", "로고 스타일"],
  ["로고선호색상", "로고 색상"],
  ["로고선호폰트", "로고 폰트"],
  ["명함색상", "명함 색상"],
  ["명함시안", "명함 스타일"],
  ["계약서시안", "계약서 스타일"],
  ["홈페이지제작방식", "홈페이지 제작 방식"],
  ["홈페이지스타일", "홈페이지 스타일"],
  ["홈페이지컬러컨셉", "홈페이지 컬러"],
  ["도메인주소", "도메인 주소"],
  ["도메인관리사이트", "도메인 관리 사이트"],
  ["도메인관리ID", "도메인 관리 ID"],
  ["도메인관리PW", "도메인 관리 비밀번호"],
  ["GmailID", "Gmail ID"],
  ["GmailPW", "Gmail 비밀번호"],
  ["네이버검색광고ID", "네이버 검색광고 ID"],
  ["네이버검색광고PW", "네이버 검색광고 비밀번호"],
  ["네이버클라우드ID", "네이버 클라우드 ID"],
  ["네이버클라우드PW", "네이버 클라우드 비밀번호"],
  ["InstagramID", "Instagram ID"],
  ["InstagramPW", "Instagram 비밀번호"],
] as const;

const PHONE_FIELDS = new Set(["대표번호", "수령연락처"]);

/** mrkdwn field 한 칸은 2000자까지만 받는다 */
export function submissionFieldText(key: string, label: string, value: unknown): string {
  const text = PHONE_FIELDS.has(key) ? formatPhoneNumber(String(value)) : String(value);
  return `*${label}:*\n${text}`.slice(0, 1990);
}

/** 슬랙 section 한 개에는 fields 를 10개까지만 넣을 수 있다. 넘기면 메시지 전체가 invalid_blocks 로 거절된다. */
export function toFieldSections(fields: { type: "mrkdwn"; text: string }[]) {
  const sections: { type: "section"; fields: { type: "mrkdwn"; text: string }[] }[] = [];
  for (let i = 0; i < fields.length; i += 10) {
    sections.push({ type: "section", fields: fields.slice(i, i + 10) });
  }
  return sections;
}
