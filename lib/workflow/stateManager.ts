/**
 * 스타트패키지 상태 관리 시스템
 *
 * 주요 기능:
 * 1. 상태 전환 규칙 검증
 * 2. 권한 제어
 * 3. 자동 상태 변경
 * 4. 알림 트리거
 */

// ============================================
// 타입 정의
// ============================================

export type WorkflowState =
  | "자료제출중"
  | "제작진행중"
  | "시안확인"
  | "발주요청"
  | "제작완료";

export type PrintItemState =
  | "대기"
  | "디자인중"
  | "시안완료"
  | "발주완료"
  | "제작완료"
  | "발송완료";

export interface StatePermissions {
  수정가능: boolean;
  업로드가능: boolean;
  발주가능: boolean;
  정보변경가능: boolean;
}

export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  condition?: () => Promise<boolean>;
  beforeTransition?: () => Promise<void>;
  afterTransition?: () => Promise<void>;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  missingFields?: string[];
}

// ============================================
// 상수
// ============================================

export const WORKFLOW_STATES: WorkflowState[] = [
  "자료제출중",
  "제작진행중",
  "시안확인",
  "발주요청",
  "제작완료",
];

export const PRINT_ITEM_STATES: PrintItemState[] = [
  "대기",
  "디자인중",
  "시안완료",
  "발주완료",
  "제작완료",
  "발송완료",
];

// 필수 제출 항목 (API와 일치)
export const REQUIRED_FIELDS = [
  "브랜드명",
  "업종",
  "주소",
  "사업자등록증URL",
  "프로필사진URL",
  "홈페이지컬러컨셉",
] as const;

// ============================================
// 상태별 권한 정의
// ============================================

export const STATE_PERMISSIONS: Record<WorkflowState, StatePermissions> = {
  자료제출중: {
    수정가능: true,
    업로드가능: true,
    발주가능: false,
    정보변경가능: true,
  },

  제작진행중: {
    수정가능: false,
    업로드가능: false,
    발주가능: false,
    정보변경가능: false,
  },

  시안확인: {
    수정가능: false,
    업로드가능: false,
    발주가능: true,
    정보변경가능: false,
  },

  발주요청: {
    수정가능: false,
    업로드가능: false,
    발주가능: false,
    정보변경가능: false,
  },

  제작완료: {
    수정가능: false,
    업로드가능: false,
    발주가능: false,
    정보변경가능: false,
  },
};

// ============================================
// 상태 전환 규칙
// ============================================

export const ALLOWED_TRANSITIONS: Record<
  WorkflowState,
  WorkflowState[]
> = {
  자료제출중: ["제작진행중"],
  제작진행중: ["시안확인", "자료제출중"], // 되돌리기 가능 (관리자만)
  시안확인: ["발주요청", "제작진행중"], // 수정 요청 시
  발주요청: ["제작완료"],
  제작완료: [], // 최종 상태
};

// ============================================
// StateManager 클래스
// ============================================

export class StateManager {
  /**
   * 상태 전환 가능 여부 확인
   */
  static canTransition(
    from: WorkflowState,
    to: WorkflowState
  ): boolean {
    const allowedStates = ALLOWED_TRANSITIONS[from];
    return allowedStates.includes(to);
  }

  /**
   * 현재 상태의 권한 가져오기
   */
  static getPermissions(state: WorkflowState): StatePermissions {
    return STATE_PERMISSIONS[state];
  }

  /**
   * 자료 제출 완료 여부 검증
   */
  static validateSubmission(submission: any): ValidationResult {
    const missingFields: string[] = [];

    // 필수 필드 체크
    REQUIRED_FIELDS.forEach((field) => {
      const value = submission[field];
      if (!value || value === "" || value === null) {
        missingFields.push(field);
      }
    });

    // 프로필 사진 크기 검증
    if (submission.프로필사진가로 && submission.프로필사진가로 > 1000) {
      return {
        isValid: false,
        message: "프로필 사진은 1000px 이하여야 합니다",
      };
    }

    if (submission.프로필사진세로 && submission.프로필사진세로 > 1000) {
      return {
        isValid: false,
        message: "프로필 사진은 1000px 이하여야 합니다",
      };
    }

    // 홈페이지 컬러 컨셉 필수
    if (!submission.홈페이지컬러컨셉) {
      missingFields.push("홈페이지컬러컨셉");
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: "필수 항목이 누락되었습니다",
        missingFields,
      };
    }

    return {
      isValid: true,
      message: "모든 필수 항목이 제출되었습니다",
    };
  }

  /**
   * 자동 상태 전환 (자료 제출 완료 시)
   */
  static async autoTransitionOnSubmissionComplete(
    userId: string,
    submission: any
  ): Promise<WorkflowState | null> {
    const validation = this.validateSubmission(submission);

    if (validation.isValid) {
      // 자료제출중 → 제작진행중
      return "제작진행중";
    }

    return null;
  }

  /**
   * 상태 메시지 가져오기
   */
  static getStateMessage(state: WorkflowState): string {
    const messages: Record<WorkflowState, string> = {
      자료제출중:
        "필수 자료를 모두 제출해주세요. 미제출 항목은 빨간색으로 강조되어 있습니다.",

      제작진행중:
        "🎨 디자인 시안이 영업일 기준 1~2일 내 전달될 예정입니다. 잠시만 기다려주세요!",

      시안확인:
        "⚠️ 시안을 꼼꼼히 확인해주세요!\n발주 후에는 정보 변경이 불가능하며, 오탈자 발견 시 재발주 비용은 본인 부담입니다.",

      발주요청:
        "🚀 발주가 완료되었습니다!\n정보 변경은 불가능합니다. 예상 완료일을 확인해주세요.",

      제작완료:
        "✅ 모든 인쇄물 제작이 완료되었습니다. 발송 정보를 확인해주세요.",
    };

    return messages[state];
  }

  /**
   * 경고 메시지 가져오기 (발주 전)
   */
  static getWarningBeforeOrder(): string[] {
    return [
      "발주 후 정보 변경 불가",
      "오탈자 미검수로 인한 재발주 비용은 본인 부담",
      "디자인 수정은 최대 2회까지만 가능",
      "3회 이상 수정 시 건당 1만원 추가 비용 발생",
      "꼭 본인 정보를 다시 한번 확인해주세요!",
    ];
  }
}

// ============================================
// 인쇄물 상태 관리
// ============================================

export class PrintItemStateManager {
  /**
   * 인쇄물 상태 전환 가능 여부
   */
  static canTransition(
    from: PrintItemState,
    to: PrintItemState
  ): boolean {
    const allowedTransitions: Record<PrintItemState, PrintItemState[]> = {
      대기: ["디자인중"],
      디자인중: ["시안완료", "대기"],
      시안완료: ["발주완료", "디자인중"],
      발주완료: ["제작완료"],
      제작완료: ["발송완료"],
      발송완료: [],
    };

    return allowedTransitions[from].includes(to);
  }

  /**
   * 수정 가능 횟수 체크
   */
  static canRequestRevision(수정횟수: number): boolean {
    const MAX_REVISIONS = 2;
    return 수정횟수 < MAX_REVISIONS;
  }

  /**
   * 추가 수정 비용 계산
   */
  static getRevisionCost(수정횟수: number): number {
    const MAX_FREE_REVISIONS = 2;
    const COST_PER_REVISION = 10000;

    if (수정횟수 <= MAX_FREE_REVISIONS) {
      return 0;
    }

    return (수정횟수 - MAX_FREE_REVISIONS) * COST_PER_REVISION;
  }
}

// ============================================
// 제작 일정 계산
// ============================================

export class ProductionSchedule {
  /**
   * 영업일 계산 (주말, 공휴일 제외)
   */
  static calculateBusinessDays(
    startDate: Date,
    daysToAdd: number
  ): Date {
    let currentDate = new Date(startDate);
    let addedDays = 0;

    // 한국 공휴일 (간단 버전 - 실제로는 DB 또는 API 사용)
    const holidays = [
      "2025-01-01", // 신정
      "2025-02-09", "2025-02-10", "2025-02-11", // 설날
      "2025-03-01", // 삼일절
      "2025-05-05", // 어린이날
      "2025-06-06", // 현충일
      "2025-08-15", // 광복절
      "2025-09-28", "2025-09-29", "2025-09-30", // 추석
      "2025-10-03", // 개천절
      "2025-10-09", // 한글날
      "2025-12-25", // 크리스마스
    ];

    while (addedDays < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);

      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split("T")[0];

      // 주말이 아니고 공휴일도 아니면
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
        addedDays++;
      }
    }

    return currentDate;
  }

  /**
   * 인쇄물별 예상 완료일 계산
   */
  static calculateExpectedDates(발주일: Date) {
    return {
      명함: {
        최소: this.calculateBusinessDays(발주일, 2),
        최대: this.calculateBusinessDays(발주일, 3),
      },
      대봉투: {
        최소: this.calculateBusinessDays(발주일, 4),
        최대: this.calculateBusinessDays(발주일, 5),
      },
      자문계약서: {
        최소: this.calculateBusinessDays(발주일, 7),
        최대: this.calculateBusinessDays(발주일, 7),
      },
      명찰: {
        최소: this.calculateBusinessDays(발주일, 3),
        최대: this.calculateBusinessDays(발주일, 4),
      },
    };
  }

  /**
   * 특별 기간 체크 (연말, 선거 등)
   */
  static checkSpecialPeriod(date: Date): string | null {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 연말연시 (12/20 ~ 1/10)
    if (
      (month === 12 && day >= 20) ||
      (month === 1 && day <= 10)
    ) {
      return "⚠️ 연말연시 기간으로 제작이 2~3일 지연될 수 있습니다";
    }

    // TODO: 선거일 체크 (동적으로 관리)
    // TODO: 대량 주문 기간 체크

    return null;
  }

  /**
   * 예상 완료일 메시지 생성
   */
  static getExpectedDateMessage(
    발주일: Date,
    itemType: "명함" | "대봉투" | "자문계약서" | "명찰"
  ): string {
    const dates = this.calculateExpectedDates(발주일);
    const { 최소, 최대 } = dates[itemType];

    const specialWarning = this.checkSpecialPeriod(발주일);

    let message = `📅 ${itemType} 예상 완료일: ${최소.toLocaleDateString("ko-KR")}`;

    if (최소.getTime() !== 최대.getTime()) {
      message += ` ~ ${최대.toLocaleDateString("ko-KR")}`;
    }

    if (specialWarning) {
      message += `\n${specialWarning}`;
    }

    return message;
  }
}

// ============================================
// 알림 트리거
// ============================================

export class NotificationTrigger {
  /**
   * 상태 변경 시 알림 발송
   */
  static async onStateChange(
    userId: string,
    from: WorkflowState,
    to: WorkflowState
  ): Promise<void> {
    const notifications: Record<
      WorkflowState,
      { to: string; title: string; message: string }
    > = {
      자료제출중: {
        to: "사용자",
        title: "자료 제출을 시작해주세요",
        message: "필수 자료를 모두 제출하면 제작이 시작됩니다.",
      },

      제작진행중: {
        to: "관리자",
        title: "자료 제출 완료",
        message: `[{이름}] 님이 자료 제출을 완료했습니다. 시안 제작을 시작해주세요.`,
      },

      시안확인: {
        to: "사용자",
        title: "시안이 완료되었습니다",
        message:
          "디자인 시안을 확인하신 후 발주 요청해주세요. 오탈자를 꼼꼼히 확인해주세요!",
      },

      발주요청: {
        to: "관리자+사용자",
        title: "발주가 완료되었습니다",
        message: "인쇄소에 발주되었습니다. 예상 완료일을 확인해주세요.",
      },

      제작완료: {
        to: "사용자",
        title: "인쇄물 제작 완료",
        message: "모든 인쇄물 제작이 완료되었습니다. 발송 정보를 확인해주세요.",
      },
    };

    const notification = notifications[to];

    // TODO: 실제 알림 발송 로직 (SMS, 이메일, 텔레그램)
    console.log(`[알림] ${notification.to}: ${notification.title}`);
  }

  /**
   * 시안 업로드 시 알림
   */
  static async onDesignUploaded(
    userId: string,
    itemType: string
  ): Promise<void> {
    // TODO: 알림 발송
    console.log(`[알림] ${itemType} 시안이 업로드되었습니다`);
  }
}

// ============================================
// 내보내기
// ============================================

export default {
  StateManager,
  PrintItemStateManager,
  ProductionSchedule,
  NotificationTrigger,
};
