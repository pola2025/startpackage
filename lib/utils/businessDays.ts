/**
 * 평일 계산 유틸리티
 * 주말(토,일)과 공휴일을 제외한 영업일 계산
 */

// 2025년 한국 공휴일
const holidays2025 = [
  '2025-01-01', // 신정
  '2025-01-28', // 설날 연휴
  '2025-01-29', // 설날
  '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-03-03', // 대체공휴일 (삼일절)
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일 (어린이날)
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', // 추석 연휴
  '2025-10-06', // 추석
  '2025-10-07', // 추석 연휴
  '2025-10-08', // 대체공휴일 (추석)
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

/**
 * 날짜가 공휴일인지 확인
 */
function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return holidays2025.includes(dateStr);
}

/**
 * 날짜가 주말(토,일)인지 확인
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0=일요일, 6=토요일
}

/**
 * 날짜가 영업일(평일)인지 확인
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

/**
 * 기준일로부터 N 영업일 후의 날짜 계산
 * @param startDate 기준일
 * @param businessDays 영업일 수
 * @returns N 영업일 후의 날짜
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    currentDate.setDate(currentDate.getDate() + 1);

    // 영업일인 경우에만 카운트
    if (isBusinessDay(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * 기준일로부터 최소/최대 영업일 후의 날짜 범위 계산
 * @param startDate 기준일
 * @param minDays 최소 영업일
 * @param maxDays 최대 영업일
 * @returns { min: Date, max: Date }
 */
export function getBusinessDayRange(
  startDate: Date,
  minDays: number,
  maxDays: number
): { min: Date; max: Date } {
  return {
    min: addBusinessDays(startDate, minDays),
    max: addBusinessDays(startDate, maxDays),
  };
}

/**
 * 제작물 타입별 소요 영업일 정의
 * 주의: 로고는 인쇄물이 아닌 디지털 파일이므로 예상도착일 계산에서 제외
 */
export const PRODUCTION_DAYS: Record<string, { min: number; max: number }> = {
  '명함': { min: 2, max: 3 },
  '명찰': { min: 2, max: 3 },
  '대봉투': { min: 4, max: 5 },
  '자문계약서 표지': { min: 7, max: 7 },
  '자문계약서 내지': { min: 7, max: 7 },
};

/**
 * 발주일 기준으로 예상 도착일 계산
 * @param orderDate 발주일
 * @param productType 제작물 타입
 * @returns "YYYY-MM-DD ~ YYYY-MM-DD" 형식의 예상 도착일 범위
 */
export function calculateExpectedArrival(
  orderDate: Date,
  productType: string
): string {
  const days = PRODUCTION_DAYS[productType];

  if (!days) {
    console.warn(`Unknown product type: ${productType}`);
    return '';
  }

  const range = getBusinessDayRange(orderDate, days.min, days.max);

  // 최소/최대가 같으면 단일 날짜 반환
  if (days.min === days.max) {
    return range.min.toISOString().split('T')[0];
  }

  // 범위 반환
  return `${range.min.toISOString().split('T')[0]} ~ ${range.max.toISOString().split('T')[0]}`;
}

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param dateStr "YYYY-MM-DD" 또는 "YYYY-MM-DD ~ YYYY-MM-DD" 형식
 * @returns "M월 D일 (요일)" 또는 "M월 D일 ~ M월 D일" 형식
 */
export function formatArrivalDate(dateStr: string): string {
  if (!dateStr) return '';

  if (dateStr.includes('~')) {
    const [start, end] = dateStr.split(' ~ ');
    return `${formatSingleDate(start)} ~ ${formatSingleDate(end)}`;
  }

  return formatSingleDate(dateStr);
}

function formatSingleDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}
