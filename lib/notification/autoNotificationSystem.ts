/**
 * 자동 알림 시스템
 *
 * 주요 기능:
 * 1. 회원 가입 완료 시 환영 알림
 * 2. 2주차 도래 시 미제출 자료 안내
 * 3. 마감일 임박 알림 (7일전, 3일전, 1일전)
 * 4. 시안 완료 알림
 * 5. 발주 완료 알림
 * 6. 제작 완료 알림
 */

import DeadlineManager from "../workflow/deadlineManager";

// ============================================
// 타입 정의
// ============================================

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
}

export type NotificationType =
  | "회원가입완료"
  | "2주차미제출알림"
  | "마감7일전"
  | "마감3일전"
  | "마감1일전"
  | "시안완료"
  | "발주완료"
  | "제작완료"
  | "발송완료";

export type NotificationChannel = "SMS" | "EMAIL";

export interface User {
  id: string;
  이름: string;
  연락처: string;
  이메일: string;
  SMS수신동의: boolean;
  이메일수신동의: boolean;
  cohort: {
    name: string;
    교육시작일: Date;
    자료제출마감일: Date;
  };
}

export interface Submission {
  사업자등록증URL?: string;
  프로필사진URL?: string;
  메타광고관리자값?: string;
  네이버검색광고ID?: string;
  홈페이지컬러컨셉?: string;
}

// ============================================
// 알림 템플릿
// ============================================

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  {
    title: string;
    getMessage: (data: any) => string;
    channels: NotificationChannel[];
  }
> = {
  회원가입완료: {
    title: "[스타트패키지] 환영합니다!",
    getMessage: (data: { 이름: string; 기수: string; 마감일: string }) => `
안녕하세요, ${data.이름}님!

비즈액터스쿨 스타트패키지에 가입하신 것을 환영합니다.

📌 기수: ${data.기수}
📅 자료 제출 마감일: ${data.마감일}

지금 바로 로그인하여 인쇄물, 마케팅, 홈페이지 제작에 필요한 자료를 제출해주세요.

필수 제출 자료:
✅ 사업자등록증
✅ 프로필사진
✅ 기본 정보 (브랜드명, 연락처, 이메일 등)

마감일까지 자료를 제출하셔야 제작이 진행됩니다.

문의: 010-XXXX-XXXX
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  "2주차미제출알림": {
    title: "[스타트패키지] 자료 제출을 부탁드립니다",
    getMessage: (data: { 이름: string; 미제출항목: string[]; 마감일: string }) => `
안녕하세요, ${data.이름}님!

2주차가 시작되었습니다.
아직 제출되지 않은 자료가 있습니다.

❌ 미제출 항목:
${data.미제출항목.map((item) => `  - ${item}`).join("\n")}

📅 마감일: ${data.마감일}

마감일 이후에는 본사 문의 후 제작 가능하니,
서둘러 자료를 제출해주세요.

로그인: [링크]
문의: 010-XXXX-XXXX
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  마감7일전: {
    title: "[스타트패키지] 마감일이 7일 남았습니다",
    getMessage: (data: { 이름: string; 미제출항목: string[]; 마감일: string }) => `
⚠️ ${data.이름}님, 마감일이 일주일 남았습니다!

📅 마감일: ${data.마감일} (D-7)

${
  data.미제출항목.length > 0
    ? `
❌ 아직 제출되지 않은 자료:
${data.미제출항목.map((item) => `  - ${item}`).join("\n")}

지금 바로 제출해주세요!
`
    : "✅ 모든 자료가 제출되었습니다. 감사합니다!"
}

로그인: [링크]
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  마감3일전: {
    title: "[스타트패키지] 🚨 마감일이 3일 남았습니다!",
    getMessage: (data: { 이름: string; 미제출항목: string[]; 마감일: string }) => `
🚨 ${data.이름}님, 마감일이 3일밖에 남지 않았습니다!

📅 마감일: ${data.마감일} (D-3)

${
  data.미제출항목.length > 0
    ? `
❌ 긴급! 아직 제출되지 않은 자료:
${data.미제출항목.map((item) => `  - ${item}`).join("\n")}

마감일 이후에는 제작이 불가하니,
서둘러 제출해주세요!
`
    : "✅ 모든 자료가 제출되었습니다."
}

로그인: [링크]
문의: 010-XXXX-XXXX
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  마감1일전: {
    title: "[스타트패키지] 🔥 마감일이 내일입니다!",
    getMessage: (data: { 이름: string; 미제출항목: string[]; 마감일: string }) => `
🔥 ${data.이름}님, 마감일이 내일입니다!

📅 마감일: ${data.마감일} (D-1)

${
  data.미제출항목.length > 0
    ? `
❌ 최종 경고! 미제출 자료:
${data.미제출항목.map((item) => `  - ${item}`).join("\n")}

내일까지 제출하지 않으면 제작이 불가합니다!
지금 바로 제출해주세요!
`
    : "✅ 모든 자료가 제출되었습니다."
}

긴급 문의: 010-XXXX-XXXX
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  시안완료: {
    title: "[스타트패키지] 디자인 시안이 완료되었습니다",
    getMessage: (data: { 이름: string; 인쇄물종류: string }) => `
✅ ${data.이름}님, ${data.인쇄물종류} 시안이 완료되었습니다!

지금 바로 로그인하여 시안을 확인해주세요.

⚠️ 중요 안내:
- 시안을 꼼꼼히 확인해주세요
- 발주 후에는 정보 변경이 불가능합니다
- 오탈자 발견 시 재발주 비용은 본인 부담입니다
- 디자인 수정은 최대 2회까지 무료입니다

확인 후 발주 요청해주세요.

로그인: [링크]
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  발주완료: {
    title: "[스타트패키지] 발주가 완료되었습니다",
    getMessage: (data: {
      이름: string;
      인쇄물종류: string;
      예상완료일: string;
    }) => `
🚀 ${data.이름}님, ${data.인쇄물종류} 발주가 완료되었습니다!

📅 예상 완료일: ${data.예상완료일}

인쇄소에서 제작을 시작했습니다.
완료 시 다시 안내드리겠습니다.

※ 정보 변경은 불가능합니다.

문의: 010-XXXX-XXXX
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  제작완료: {
    title: "[스타트패키지] 인쇄물 제작이 완료되었습니다",
    getMessage: (data: { 이름: string; 인쇄물목록: string[] }) => `
✅ ${data.이름}님, 인쇄물 제작이 완료되었습니다!

완료된 인쇄물:
${data.인쇄물목록.map((item) => `  ✓ ${item}`).join("\n")}

발송 준비가 완료되면 다시 안내드리겠습니다.

감사합니다!
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },

  발송완료: {
    title: "[스타트패키지] 인쇄물이 발송되었습니다",
    getMessage: (data: {
      이름: string;
      주소: string;
      운송장번호?: string;
    }) => `
📦 ${data.이름}님, 인쇄물이 발송되었습니다!

발송 주소: ${data.주소}
${data.운송장번호 ? `운송장번호: ${data.운송장번호}` : ""}

2-3일 내 도착 예정입니다.
수령 후 내용물을 확인해주세요.

감사합니다!
    `.trim(),
    channels: ["SMS", "EMAIL"],
  },
};

// ============================================
// AutoNotificationSystem 클래스
// ============================================

export class AutoNotificationSystem {
  /**
   * 1. 회원 가입 완료 시
   */
  static async sendWelcomeNotification(user: User): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.회원가입완료;

    const payload: NotificationPayload = {
      userId: user.id,
      type: "회원가입완료",
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        기수: user.cohort.name,
        마감일: user.cohort.자료제출마감일.toLocaleDateString("ko-KR"),
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  /**
   * 2. 2주차 시작일 도래 시 (Cron Job)
   */
  static async send2주차미제출알림(
    user: User,
    submission: Submission
  ): Promise<void> {
    // 2주차 시작일 계산
    const 교육시작일 = new Date(user.cohort.교육시작일);
    const 교육요일 = 교육시작일.getDay();
    const 이주차시작일 = new Date(교육시작일);
    이주차시작일.setDate(이주차시작일.getDate() + 7); // 1주 후
    이주차시작일.setDate(
      이주차시작일.getDate() + ((교육요일 - 이주차시작일.getDay() + 7) % 7)
    );

    const today = new Date();
    const is2주차 =
      today.toDateString() === 이주차시작일.toDateString();

    if (!is2주차) return;

    // 미제출 항목 확인
    const 미제출항목 = this.getMissingItems(submission);

    if (미제출항목.length === 0) return; // 모두 제출됨

    const template = NOTIFICATION_TEMPLATES["2주차미제출알림"];

    const payload: NotificationPayload = {
      userId: user.id,
      type: "2주차미제출알림",
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        미제출항목,
        마감일: user.cohort.자료제출마감일.toLocaleDateString("ko-KR"),
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  /**
   * 3. 마감일 임박 알림 (Cron Job - 매일 실행)
   */
  static async sendDeadlineReminders(): Promise<void> {
    // TODO: DB에서 모든 활성 사용자 조회
    // const users = await prisma.user.findMany({ ... });

    console.log("📧 마감일 알림 발송 시작...");

    // for (const user of users) {
    //   await this.checkAndSendDeadlineReminder(user);
    // }
  }

  /**
   * 개별 사용자 마감일 알림
   */
  static async checkAndSendDeadlineReminder(
    user: User,
    submission: Submission
  ): Promise<void> {
    const 마감일 = new Date(user.cohort.자료제출마감일);
    const today = new Date();
    const diffTime = 마감일.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let notificationType: NotificationType | null = null;

    if (daysRemaining === 7) {
      notificationType = "마감7일전";
    } else if (daysRemaining === 3) {
      notificationType = "마감3일전";
    } else if (daysRemaining === 1) {
      notificationType = "마감1일전";
    }

    if (!notificationType) return;

    const 미제출항목 = this.getMissingItems(submission);
    const template = NOTIFICATION_TEMPLATES[notificationType];

    const payload: NotificationPayload = {
      userId: user.id,
      type: notificationType,
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        미제출항목,
        마감일: 마감일.toLocaleDateString("ko-KR"),
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  /**
   * 4. 시안 완료 알림
   */
  static async send시안완료알림(
    user: User,
    인쇄물종류: string
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.시안완료;

    const payload: NotificationPayload = {
      userId: user.id,
      type: "시안완료",
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        인쇄물종류,
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  /**
   * 5. 발주 완료 알림
   */
  static async send발주완료알림(
    user: User,
    인쇄물종류: string,
    예상완료일: Date
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.발주완료;

    const payload: NotificationPayload = {
      userId: user.id,
      type: "발주완료",
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        인쇄물종류,
        예상완료일: 예상완료일.toLocaleDateString("ko-KR"),
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  /**
   * 6. 제작 완료 알림
   */
  static async send제작완료알림(
    user: User,
    인쇄물목록: string[]
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.제작완료;

    const payload: NotificationPayload = {
      userId: user.id,
      type: "제작완료",
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        인쇄물목록,
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  /**
   * 7. 발송 완료 알림
   */
  static async send발송완료알림(
    user: User,
    주소: string,
    운송장번호?: string
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES.발송완료;

    const payload: NotificationPayload = {
      userId: user.id,
      type: "발송완료",
      title: template.title,
      message: template.getMessage({
        이름: user.이름,
        주소,
        운송장번호,
      }),
      channels: this.getEnabledChannels(user),
    };

    await this.sendNotification(payload, user);
  }

  // ============================================
  // 유틸리티 메서드
  // ============================================

  /**
   * 사용자의 활성화된 알림 채널 가져오기
   */
  private static getEnabledChannels(user: User): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (user.SMS수신동의) channels.push("SMS");
    if (user.이메일수신동의) channels.push("EMAIL");

    return channels;
  }

  /**
   * 미제출 항목 확인
   */
  private static getMissingItems(submission: Submission): string[] {
    const missing: string[] = [];

    const requiredFields = {
      사업자등록증URL: "사업자등록증",
      프로필사진URL: "프로필사진",
      메타광고관리자값: "메타광고 설정",
      네이버검색광고ID: "네이버 검색광고",
      홈페이지컬러컨셉: "홈페이지 컬러 컨셉",
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!submission[field as keyof Submission]) {
        missing.push(label);
      }
    }

    return missing;
  }

  /**
   * 실제 알림 발송 (SMS + 이메일)
   */
  private static async sendNotification(
    payload: NotificationPayload,
    user: User
  ): Promise<void> {
    console.log(`
📨 알림 발송
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
사용자: ${user.이름} (${user.cohort.name})
채널: ${payload.channels.join(", ")}
제목: ${payload.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${payload.message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // SMS 발송
    if (payload.channels.includes("SMS")) {
      await this.sendSMS(user.연락처, payload.message);
    }

    // 이메일 발송
    if (payload.channels.includes("EMAIL")) {
      await this.sendEmail(user.이메일, payload.title, payload.message);
    }

    // DB에 알림 기록 저장
    await this.saveNotificationLog(payload);
  }

  /**
   * SMS 발송 (NCP SENS)
   */
  private static async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    try {
      const { sendSMS } = await import("../sms/ncpSensClient");
      await sendSMS(phoneNumber, message);
      console.log(`✅ SMS 발송 성공: ${phoneNumber}`);
    } catch (error) {
      console.error(`❌ SMS 발송 실패: ${phoneNumber}`, error);
      throw error;
    }
  }

  /**
   * 이메일 발송
   */
  private static async sendEmail(
    email: string,
    subject: string,
    body: string
  ): Promise<void> {
    // TODO: SendGrid or Nodemailer 연동
    console.log(`📧 이메일 발송: ${email}`);
    console.log(`제목: ${subject}`);
    console.log(body);
  }

  /**
   * 알림 로그 저장
   */
  private static async saveNotificationLog(
    payload: NotificationPayload
  ): Promise<void> {
    // TODO: Prisma로 Notification 테이블에 저장
    console.log("💾 알림 로그 저장 완료");
  }
}

// ============================================
// Cron Job 함수들
// ============================================

/**
 * 매일 실행: 마감일 알림 체크
 */
export async function cronJob_마감일알림체크() {
  await AutoNotificationSystem.sendDeadlineReminders();
}

/**
 * 매주 교육 요일 실행: 2주차 미제출 알림
 */
export async function cronJob_2주차미제출알림체크() {
  // TODO: 2주차에 해당하는 사용자 조회 및 알림 발송
  console.log("🔍 2주차 미제출 사용자 체크...");
}

// ============================================
// 내보내기
// ============================================

export default AutoNotificationSystem;
