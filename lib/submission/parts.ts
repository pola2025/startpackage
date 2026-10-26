/**
 * 제출 정보 파트별 완료 기준 (단일 출처)
 * 대시보드 카드·단계 카드·알림·위자드가 모두 이 기준을 쓴다.
 * 분류 근거: F:\startpackage\261017_submission-info-parts.html (2026-10-17 사용자 확정)
 */

export const LOGO_DESCRIPTION_MIN_LENGTH = 20;

/** 로고 설명이 비었거나 짧을 때 교육생에게 보이는 안내 (입력 창·제출 화면·단계 카드 공통) */
export const LOGO_DESCRIPTION_REQUIRED_MESSAGE =
  "로고 설명 및 요청내용 없이는 제작이 불가능합니다.";

/** 로고 확정으로 보는 상태값 (시안확정은 레거시) */
export const LOGO_CONFIRMED_STATUSES = ["최종확정", "시안확정"] as const;
export const LOGO_REVIEW_STATUSES = ["시안컨펌요청"] as const;
export const LOGO_WORKING_STATUSES = ["시안제작중", "시안중"] as const;

type Submission = Record<string, unknown> | null | undefined;

export interface PartItem {
  key: string;
  label: string;
  hint?: string;
  done: boolean;
}

const filled = (value: unknown) =>
  typeof value === "string"
    ? value.trim().length > 0
    : value !== null && value !== undefined;

const item = (
  sub: Submission,
  key: string,
  label: string,
  hint?: string,
): PartItem => ({
  key,
  label,
  hint,
  done: filled(sub?.[key]),
});

export function isExistingLogo(sub: Submission): boolean {
  return sub?.로고제작방식 === "기존로고";
}

/** 로고 파트: 새로 만들면 5가지, 기존 로고를 쓰면 로고 파일 1개 */
export function logoChecklist(sub: Submission): PartItem[] {
  if (isExistingLogo(sub)) return [item(sub, "로고URL", "기존 로고 파일")];
  const description =
    typeof sub?.로고제작요청사항 === "string"
      ? sub.로고제작요청사항.trim()
      : "";
  return [
    item(sub, "로고선호스타일", "선호 스타일"),
    item(sub, "로고선호폰트", "선호 폰트"),
    item(sub, "로고선호색상", "선호 색상"),
    {
      key: "로고제작요청사항",
      label: "원하는 로고 설명",
      hint: `${LOGO_DESCRIPTION_MIN_LENGTH}자 이상`,
      done: description.length >= LOGO_DESCRIPTION_MIN_LENGTH,
    },
    {
      key: "로고예시디자인URL",
      label: "참고 로고 이미지",
      hint: "1장 이상",
      done: filled(sub?.로고예시디자인URL) || filled(sub?.로고예시디자인2URL),
    },
  ];
}

export function isLogoInfoComplete(sub: Submission): boolean {
  return logoChecklist(sub).every((entry) => entry.done);
}

/** 기본 정보 (배송 정보는 발주 전 확인 파트로 분리됨) */
export function basicChecklist(sub: Submission): PartItem[] {
  return [
    item(sub, "사업자등록증URL", "사업자등록증"),
    item(sub, "프로필사진URL", "프로필 사진"),
    item(sub, "브랜드명", "브랜드명"),
    item(sub, "업종", "업종"),
    item(sub, "주소", "사업장 주소"),
    item(sub, "대표번호", "대표번호"),
    item(sub, "이메일", "명함 이메일"),
  ];
}

/** 발주 전 확인: 배송 정보 */
export function shippingChecklist(sub: Submission): PartItem[] {
  return [
    item(sub, "인쇄물받을주소", "인쇄물 받을 주소"),
    item(sub, "우편번호", "우편번호"),
    item(sub, "받는분이름", "받는 분 이름"),
    item(sub, "수령연락처", "수령 연락처"),
  ];
}

export type SmsUsage = "사용" | "미사용" | null;

export function smsUsage(sub: Submission): SmsUsage {
  const value = sub?.문자발송사용여부;
  return value === "사용" || value === "미사용" ? value : null;
}

/** 문자발송 파트: 사용 여부부터 고르고, 사용하는 사람만 서류·계정을 낸다 */
export function smsChecklist(sub: Submission): PartItem[] {
  const usage = smsUsage(sub);
  const choice: PartItem = {
    key: "문자발송사용여부",
    label: "문자·알림톡 사용 여부",
    done: usage !== null,
  };
  if (usage !== "사용") return [choice];
  return [
    choice,
    item(sub, "대표자신분증URL", "대표자 신분증"),
    item(sub, "통신서비스이용증명원URL", "통신서비스 이용증명원"),
    item(sub, "신용카드앞면URL", "신용카드 번호 면"),
    item(sub, "네이버클라우드ID", "네이버클라우드 아이디"),
    item(sub, "네이버클라우드PW", "네이버클라우드 비밀번호"),
  ];
}

export const isPartComplete = (items: PartItem[]) =>
  items.every((entry) => entry.done);
export const missingItems = (items: PartItem[]) =>
  items.filter((entry) => !entry.done);

export type LogoStage = "info" | "partial" | "working" | "review" | "done";

/**
 * 교육생에게 보여 줄 로고 단계
 * 로고 작업 상태가 진행됐으면 상태를 따르고, 아직 대기면 제출 정보로 판단한다.
 */
export function logoStage(
  sub: Submission,
  logoStatus: string | null | undefined,
): LogoStage {
  const status = logoStatus ?? "";
  if ((LOGO_CONFIRMED_STATUSES as readonly string[]).includes(status))
    return "done";
  if ((LOGO_REVIEW_STATUSES as readonly string[]).includes(status))
    return "review";
  if ((LOGO_WORKING_STATUSES as readonly string[]).includes(status))
    return "working";
  const items = logoChecklist(sub);
  if (isPartComplete(items)) return "working";
  const started =
    items.some((entry) => entry.done) || filled(sub?.로고제작방식);
  return started ? "partial" : "info";
}

export function isLogoConfirmed(
  logoStatus: string | null | undefined,
): boolean {
  return (LOGO_CONFIRMED_STATUSES as readonly string[]).includes(
    logoStatus ?? "",
  );
}

/** D1 응답의 날짜는 JSON 을 거치며 ISO 문자열이 되므로 Date·숫자·문자열을 모두 밀리초로 바꾼다 */
export function toEpochMs(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export type MetaSetupStage = "none" | "requested" | "done";

export function metaSetupStage(sub: Submission): MetaSetupStage {
  if (filled(sub?.MetaSetupDoneAt)) return "done";
  if (filled(sub?.MetaSetupRequestedAt)) return "requested";
  return "none";
}
