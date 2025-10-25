/**
 * 기수별 자료 제출 마감일 관리 시스템
 *
 * 주요 기능:
 * 1. 교육 시작일 기준 마감일 자동 계산
 * 2. 4주차 시작일 (교육 요일) 체크
 * 3. 마감일 경과 시 제작 불가 처리
 * 4. 본사 문의 후 제작 가능 설정
 */

// ============================================
// 타입 정의
// ============================================

export interface CohortSchedule {
  id: string;
  name: string;
  교육시작일: Date;
  교육종료일: Date;
  자료제출마감일: Date;
  교육요일: number; // 0: 일요일, 1: 월요일, ..., 6: 토요일
  마감후제작가능: boolean;
}

export interface DeadlineStatus {
  isPassed: boolean; // 마감일 경과 여부
  daysRemaining: number; // 남은 일수 (음수면 경과)
  canSubmit: boolean; // 제출 가능 여부
  message: string;
  warningLevel: "safe" | "warning" | "critical" | "expired";
}

// ============================================
// DeadlineManager 클래스
// ============================================

export class DeadlineManager {
  /**
   * 교육 시작일 기준 4주차 시작일 계산
   *
   * 예: 교육시작일이 2025-10-23 (목요일)이면
   *     4주차 시작일 = 2025-11-13 (목요일)
   */
  static calculate4주차시작일(
    교육시작일: Date,
    교육요일: number
  ): Date {
    const targetDate = new Date(교육시작일);

    // 3주 추가
    targetDate.setDate(targetDate.getDate() + 21);

    // 목표 요일과 현재 요일 차이 계산
    const currentDayOfWeek = targetDate.getDay();
    const daysDiff = (교육요일 - currentDayOfWeek + 7) % 7;

    // 요일 조정
    targetDate.setDate(targetDate.getDate() + daysDiff);

    return targetDate;
  }

  /**
   * 교육 종료일 계산 (교육시작일 + 3개월)
   */
  static calculate교육종료일(교육시작일: Date): Date {
    const endDate = new Date(교육시작일);
    endDate.setMonth(endDate.getMonth() + 3);
    return endDate;
  }

  /**
   * 기수 일정 자동 생성
   */
  static createCohortSchedule(
    name: string,
    교육시작일: Date,
    교육요일: number
  ): Omit<CohortSchedule, "id"> {
    const 교육종료일 = this.calculate교육종료일(교육시작일);
    const 자료제출마감일 = this.calculate4주차시작일(교육시작일, 교육요일);

    return {
      name,
      교육시작일,
      교육종료일,
      자료제출마감일,
      교육요일,
      마감후제작가능: false,
    };
  }

  /**
   * 마감일 상태 확인
   */
  static checkDeadlineStatus(
    cohort: CohortSchedule,
    currentDate: Date = new Date()
  ): DeadlineStatus {
    const deadline = new Date(cohort.자료제출마감일);
    const diffTime = deadline.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isPassed = daysRemaining < 0;

    // 마감 경과 시
    if (isPassed) {
      if (cohort.마감후제작가능) {
        return {
          isPassed: true,
          daysRemaining,
          canSubmit: true,
          message: "⚠️ 마감일이 경과했습니다. 본사 승인으로 제작 가능합니다.",
          warningLevel: "warning",
        };
      } else {
        return {
          isPassed: true,
          daysRemaining,
          canSubmit: false,
          message:
            "❌ 자료 제출 마감일이 경과했습니다.\n본사에 문의하여 승인을 받으신 후 제작 가능합니다.\n\n문의: 010-XXXX-XXXX",
          warningLevel: "expired",
        };
      }
    }

    // 마감 3일 전 이내
    if (daysRemaining <= 3) {
      return {
        isPassed: false,
        daysRemaining,
        canSubmit: true,
        message: `🚨 마감일이 ${daysRemaining}일 남았습니다! 서둘러 제출해주세요.`,
        warningLevel: "critical",
      };
    }

    // 마감 7일 전 이내
    if (daysRemaining <= 7) {
      return {
        isPassed: false,
        daysRemaining,
        canSubmit: true,
        message: `⚠️ 마감일이 ${daysRemaining}일 남았습니다. 자료를 준비해주세요.`,
        warningLevel: "warning",
      };
    }

    // 여유 있음
    return {
      isPassed: false,
      daysRemaining,
      canSubmit: true,
      message: `마감일까지 ${daysRemaining}일 남았습니다.`,
      warningLevel: "safe",
    };
  }

  /**
   * 요일 이름 가져오기
   */
  static getDayName(dayOfWeek: number): string {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[dayOfWeek];
  }

  /**
   * 기수 생성 헬퍼 (관리자용)
   *
   * 예시:
   * - "19기 목" → 교육시작일: 2025-10-23 (목요일)
   * - 자동 계산:
   *   - 교육종료일: 2026-01-23
   *   - 자료제출마감일: 2025-11-13 (4주차 목요일)
   */
  static async createCohort(input: {
    name: string;
    교육시작일: Date;
  }): Promise<Omit<CohortSchedule, "id">> {
    const { name, 교육시작일 } = input;

    // 요일 자동 감지
    const 교육요일 = 교육시작일.getDay();

    const schedule = this.createCohortSchedule(
      name,
      교육시작일,
      교육요일
    );

    console.log(`
📅 기수 생성 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
기수명: ${name}
교육 요일: ${this.getDayName(교육요일)}요일

교육 시작일: ${교육시작일.toLocaleDateString("ko-KR")} (${this.getDayName(교육요일)})
교육 종료일: ${schedule.교육종료일.toLocaleDateString("ko-KR")}
자료 제출 마감일: ${schedule.자료제출마감일.toLocaleDateString("ko-KR")} (${this.getDayName(교육요일)})

📌 4주차 ${this.getDayName(교육요일)}요일까지 자료를 제출해야 합니다!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return schedule;
  }

  /**
   * 마감일 연장 (관리자용)
   */
  static async extendDeadline(
    cohortId: string,
    newDeadline: Date,
    reason: string
  ): Promise<void> {
    // TODO: DB 업데이트
    console.log(`
⏰ 마감일 연장
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
기수 ID: ${cohortId}
새 마감일: ${newDeadline.toLocaleDateString("ko-KR")}
사유: ${reason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }

  /**
   * 마감 후 제작 승인 (관리자용)
   */
  static async approvePostDeadlineProduction(
    cohortId: string,
    approvedBy: string,
    reason: string
  ): Promise<void> {
    // TODO: DB 업데이트 (마감후제작가능 = true)
    console.log(`
✅ 마감 후 제작 승인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
기수 ID: ${cohortId}
승인자: ${approvedBy}
승인 사유: ${reason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }

  /**
   * 마감일 임박 사용자 조회
   */
  static async getUsersNearingDeadline(
    cohortId: string,
    daysThreshold: number = 3
  ): Promise<any[]> {
    // TODO: DB 쿼리
    // - 마감일이 daysThreshold일 이내
    // - 자료 제출 미완료
    // - 해당 기수의 사용자

    return [];
  }

  /**
   * 마감일 자동 알림 발송 (Cron Job용)
   */
  static async sendDeadlineReminders(): Promise<void> {
    // TODO: 구현
    // 1. 마감 7일 전 → 첫 번째 알림
    // 2. 마감 3일 전 → 두 번째 알림
    // 3. 마감 1일 전 → 최종 경고
    // 4. 마감일 당일 → 긴급 알림

    console.log("📧 마감일 알림 발송 완료");
  }
}

// ============================================
// 사용 예시
// ============================================

/**
 * 예시 1: 19기 목 생성
 */
export async function example_create19기목() {
  const cohort = await DeadlineManager.createCohort({
    name: "19기 목",
    교육시작일: new Date("2025-10-23"), // 2025년 10월 23일 (목요일)
  });

  console.log("생성된 기수:", cohort);
}

/**
 * 예시 2: 19기 금 생성
 */
export async function example_create19기금() {
  const cohort = await DeadlineManager.createCohort({
    name: "19기 금",
    교육시작일: new Date("2025-10-24"), // 2025년 10월 24일 (금요일)
  });

  console.log("생성된 기수:", cohort);
}

/**
 * 예시 3: 마감일 상태 확인
 */
export async function example_checkDeadline() {
  const cohort: CohortSchedule = {
    id: "test-cohort",
    name: "19기 목",
    교육시작일: new Date("2025-10-23"),
    교육종료일: new Date("2026-01-23"),
    자료제출마감일: new Date("2025-11-13"),
    교육요일: 4, // 목요일
    마감후제작가능: false,
  };

  const status = DeadlineManager.checkDeadlineStatus(cohort);
  console.log("마감일 상태:", status);
}

/**
 * 예시 4: 마감 후 제작 승인
 */
export async function example_approvePostDeadline() {
  await DeadlineManager.approvePostDeadlineProduction(
    "cohort-id-123",
    "관리자명",
    "특별한 사정으로 승인"
  );
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 날짜 포맷팅 (한국어)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dayOfWeek = DeadlineManager.getDayName(date.getDay());

  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

/**
 * 상대 시간 표시 (예: "3일 후", "5일 전")
 */
export function getRelativeTimeText(targetDate: Date): string {
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  if (diffDays === -1) return "어제";
  if (diffDays > 0) return `${diffDays}일 후`;
  return `${Math.abs(diffDays)}일 전`;
}

// ============================================
// 내보내기
// ============================================

export default DeadlineManager;
