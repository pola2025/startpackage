/**
 * 원본은 슬랙으로, 관리자 화면 표시용은 webp 로 압축해 R2 에 두는 이미지 필드
 * (프로필 사진은 별도 경로 lib/storage/profileUpload.ts 를 쓴다)
 *
 * PDF 등 이미지가 아닌 파일은 기존 /api/upload 로 원본을 그대로 저장한다.
 */
export const DISPLAY_IMAGE_FIELDS = {
  로고예시디자인URL: { key: "logo-ref-1", label: "참고 로고 1" },
  로고예시디자인2URL: { key: "logo-ref-2", label: "참고 로고 2" },
  로고URL: { key: "logo", label: "기존 로고 파일" },
  사업자등록증URL: { key: "bizreg", label: "사업자등록증" },
} as const;

export type DisplayImageField = keyof typeof DISPLAY_IMAGE_FIELDS;

export function isDisplayImageField(field: string): field is DisplayImageField {
  return Object.prototype.hasOwnProperty.call(DISPLAY_IMAGE_FIELDS, field);
}

/** 표시용 webp 파일 이름. 슬랙에 다시 올리지 않도록 이 형식으로 구분한다. */
export function displayWebpFileName(field: DisplayImageField): string {
  return `${DISPLAY_IMAGE_FIELDS[field].key}_display_${Date.now()}.webp`;
}

/** 표시용 webp 주소면 true (원본은 이미 슬랙에 있거나 보관 중) */
export function isDisplayWebpUrl(url: unknown): boolean {
  return typeof url === "string" && /_display_\d+\.webp(?:\?.*)?$/.test(url);
}
