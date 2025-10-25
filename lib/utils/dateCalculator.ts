/**
 * 날짜 계산 유틸리티
 */

/**
 * 평일 기준 N일 후 날짜 계산
 * - 오전 11시 이전: 당일 포함 영업일 2일차
 * - 오전 11시 이후: 다음날부터 영업일 3일차
 * - 금 오전 11시 이전: 월요일 (금+월 = 2일)
 * - 금 오전 11시 이후: 화요일 (월+화 = 2일)
 * - 토요일/일요일: 다음 월요일부터 2일 = 화요일
 * - 주말(토, 일)은 제외
 *
 * @param startDate 시작 날짜 (기본값: 현재)
 * @param businessDays 평일 기준 일수 (사용 안함 - 11시 기준으로 자동 계산)
 * @returns 계산된 날짜
 */
export function calculateBusinessDays(startDate: Date = new Date(), businessDays: number = 3): Date {
  const result = new Date(startDate);
  const currentHour = result.getHours();
  const dayOfWeek = result.getDay(); // 0=일요일, 5=금요일, 6=토요일

  let actualDays: number;

  // 오전 11시 기준으로 영업일 계산
  if (currentHour < 11) {
    // 오전 11시 이전: 영업일 2일
    actualDays = 2;
  } else {
    // 오전 11시 이후: 영업일 3일
    actualDays = 3;
  }

  // 금요일 11시 이후, 토요일, 일요일 -> 다음 월요일부터 시작
  if (
    (dayOfWeek === 5 && currentHour >= 11) || // 금 11시 이후
    dayOfWeek === 6 || // 토요일
    dayOfWeek === 0    // 일요일
  ) {
    // 다음 월요일로 이동
    const daysUntilMonday = dayOfWeek === 6 ? 2 : (dayOfWeek === 0 ? 1 : 3);
    result.setDate(result.getDate() + daysUntilMonday);
    // 주말에서 월요일로 넘어왔으므로 2일만 카운트
    actualDays = 2;
  } else if (currentHour >= 11) {
    // 평일 오전 11시 이후: 다음날부터 시작
    result.setDate(result.getDate() + 1);
  }

  let daysAdded = 0;

  while (daysAdded < actualDays) {
    // 다음날로 이동
    result.setDate(result.getDate() + 1);

    // 평일인지 확인 (0=일요일, 6=토요일)
    const currentDayOfWeek = result.getDay();
    if (currentDayOfWeek !== 0 && currentDayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * 시안 전달 예정일 계산 (평일 기준 3일)
 */
export function calculateDesignDeadline(requestDate: Date = new Date()): Date {
  return calculateBusinessDays(requestDate, 3);
}

/**
 * 홈페이지 제작 완료 예정일 계산 (영업일 기준 7일)
 * - 영업일만 카운트 (주말 제외)
 */
export function calculateWebsiteDeadline(startDate: Date = new Date()): Date {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < 7) {
    // 다음날로 이동
    result.setDate(result.getDate() + 1);

    // 평일인지 확인 (0=일요일, 6=토요일)
    const currentDayOfWeek = result.getDay();
    if (currentDayOfWeek !== 0 && currentDayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * 날짜를 한국어 형식으로 포맷 (예: "10월 27일 (월)")
 */
export function formatKoreanDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}
