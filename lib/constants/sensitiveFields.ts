/**
 * 민감 정보 필드 정의
 * 이 필드들은 서버(R2/DB)에 저장하지 않고 슬랙으로만 전송
 */

export const SENSITIVE_FIELDS = [
  "대표자신분증URL",
  "통신서비스이용증명원URL",
  "신용카드앞면URL",
  "해외결제카드앞면URL",
  "해외결제카드뒷면URL",
] as const;

export type SensitiveFieldName = (typeof SENSITIVE_FIELDS)[number];

/**
 * 민감 필드인지 확인
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELDS.includes(fieldName as SensitiveFieldName);
}

/**
 * 민감 필드 한글 라벨
 */
export const SENSITIVE_FIELD_LABELS: Record<SensitiveFieldName, string> = {
  대표자신분증URL: "대표자 신분증",
  통신서비스이용증명원URL: "통신서비스 이용증명원",
  신용카드앞면URL: "신용카드 앞면",
  해외결제카드앞면URL: "해외결제카드 앞면",
  해외결제카드뒷면URL: "해외결제카드 뒷면",
};

/**
 * 슬랙 전송 완료 마커
 * DB에 URL 대신 이 값이 저장되면 "슬랙으로 전송됨" 상태
 */
export const SLACK_ONLY_MARKER = "SLACK_ONLY";
