/**
 * 배송지 필수 정책 적용 범위
 *
 * 배송지 입력 단계와 확정 게이트의 배송지 확인은 최근 2개 기수에만 적용한다.
 * 이미 발주가 끝난 지난 기수 고객까지 소급하면 완료된 항목이 다시 미완료로
 * 보이기 때문이다.
 *
 * 기준일 이후에 교육을 시작하는 기수는 자동으로 포함되므로, 새 기수가 열려도
 * 이 파일을 고칠 필요가 없다. 적용 범위를 다시 좁히거나 넓힐 때만 날짜를 옮긴다.
 *
 * 2026-08-27 시행 시점 기준 대상 — 26기(2026-08-13 시작), 26-5기(2026-07-01 시작)
 */
export const SHIPPING_POLICY_START_DATE = new Date("2026-07-01T00:00:00+09:00");

/** 해당 기수가 배송지 필수 정책 대상인지 판정 */
export function isShippingPolicyCohort(
  교육시작일?: Date | string | null,
): boolean {
  if (!교육시작일) return false;
  const 시작일 = new Date(교육시작일);
  if (Number.isNaN(시작일.getTime())) return false;
  return 시작일 >= SHIPPING_POLICY_START_DATE;
}
