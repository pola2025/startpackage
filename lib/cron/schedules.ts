/**
 * Cron Job 스케줄 정의
 *
 * node-cron 또는 Vercel Cron을 사용하여 자동 실행
 */

import AutoNotificationSystem from "../notification/autoNotificationSystem";

// ============================================
// Cron 스케줄 정의
// ============================================

export const CRON_SCHEDULES = {
  // 매일 오전 9시: 마감일 알림 체크 (7일전, 3일전, 1일전)
  마감일알림체크: {
    schedule: "0 9 * * *", // 매일 오전 9시
    timezone: "Asia/Seoul",
    handler: async () => {
      console.log("🔔 [Cron] 마감일 알림 체크 시작");
      await AutoNotificationSystem.sendDeadlineReminders();
      console.log("✅ [Cron] 마감일 알림 체크 완료");
    },
  },

  // 매주 월요일 오전 9시: 2주차 미제출 알림 (월요일 기수용)
  "2주차알림_월요일": {
    schedule: "0 9 * * 1", // 매주 월요일 오전 9시
    timezone: "Asia/Seoul",
    handler: async () => {
      console.log("🔔 [Cron] 2주차 미제출 알림 (월요일) 시작");
      await check2주차미제출알림(1); // 1 = 월요일
      console.log("✅ [Cron] 2주차 미제출 알림 (월요일) 완료");
    },
  },

  // 매주 화요일 오전 9시: 2주차 미제출 알림 (화요일 기수용)
  "2주차알림_화요일": {
    schedule: "0 9 * * 2",
    timezone: "Asia/Seoul",
    handler: async () => {
      console.log("🔔 [Cron] 2주차 미제출 알림 (화요일) 시작");
      await check2주차미제출알림(2);
      console.log("✅ [Cron] 2주차 미제출 알림 (화요일) 완료");
    },
  },

  // 매주 수요일 오전 9시
  "2주차알림_수요일": {
    schedule: "0 9 * * 3",
    timezone: "Asia/Seoul",
    handler: async () => {
      console.log("🔔 [Cron] 2주차 미제출 알림 (수요일) 시작");
      await check2주차미제출알림(3);
      console.log("✅ [Cron] 2주차 미제출 알림 (수요일) 완료");
    },
  },

  // 매주 목요일 오전 9시
  "2주차알림_목요일": {
    schedule: "0 9 * * 4",
    timezone: "Asia/Seoul",
    handler: async () => {
      console.log("🔔 [Cron] 2주차 미제출 알림 (목요일) 시작");
      await check2주차미제출알림(4);
      console.log("✅ [Cron] 2주차 미제출 알림 (목요일) 완료");
    },
  },

  // 매주 금요일 오전 9시
  "2주차알림_금요일": {
    schedule: "0 9 * * 5",
    timezone: "Asia/Seoul",
    handler: async () => {
      console.log("🔔 [Cron] 2주차 미제출 알림 (금요일) 시작");
      await check2주차미제출알림(5);
      console.log("✅ [Cron] 2주차 미제출 알림 (금요일) 완료");
    },
  },
};

// ============================================
// Cron Job 핸들러
// ============================================

/**
 * 2주차 미제출 알림 체크
 */
async function check2주차미제출알림(교육요일: number): Promise<void> {
  // TODO: Prisma로 해당 요일의 2주차 사용자 조회
  // const users = await prisma.user.findMany({
  //   where: {
  //     cohort: {
  //       교육요일,
  //       isActive: true
  //     }
  //   },
  //   include: {
  //     cohort: true,
  //     submission: true
  //   }
  // });

  // for (const user of users) {
  //   const 교육시작일 = new Date(user.cohort.교육시작일);
  //   const 이주차시작일 = calculate2주차시작일(교육시작일, 교육요일);
  //   const today = new Date();

  //   // 오늘이 2주차 시작일인지 확인
  //   if (today.toDateString() === 이주차시작일.toDateString()) {
  //     await AutoNotificationSystem.send2주차미제출알림(user, user.submission);
  //   }
  // }

  console.log(`📧 2주차 알림 발송 완료 (${getDayName(교육요일)}요일 기수)`);
}

/**
 * 2주차 시작일 계산
 */
function calculate2주차시작일(교육시작일: Date, 교육요일: number): Date {
  const 이주차 = new Date(교육시작일);
  이주차.setDate(이주차.getDate() + 7); // 1주 추가

  // 요일 조정
  const currentDay = 이주차.getDay();
  const daysDiff = (교육요일 - currentDay + 7) % 7;
  이주차.setDate(이주차.getDate() + daysDiff);

  return 이주차;
}

/**
 * 요일 이름 가져오기
 */
function getDayName(dayOfWeek: number): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[dayOfWeek];
}

// ============================================
// Cron Job 시작 (Node.js 환경)
// ============================================

export async function startCronJobs() {
  const cron = require("node-cron");

  console.log("🚀 Cron Jobs 시작...\n");

  for (const [name, config] of Object.entries(CRON_SCHEDULES)) {
    cron.schedule(
      config.schedule,
      async () => {
        try {
          await config.handler();
        } catch (error) {
          console.error(`❌ [Cron Error] ${name}:`, error);
        }
      },
      {
        timezone: config.timezone,
      }
    );

    console.log(`  ✅ ${name} - ${config.schedule}`);
  }

  console.log("\n📅 Cron Jobs 등록 완료\n");
}

// ============================================
// Vercel Cron (Serverless 환경)
// ============================================

/**
 * Vercel Cron API Routes
 *
 * /api/cron/deadline-reminder
 * /api/cron/2week-reminder-mon
 * /api/cron/2week-reminder-tue
 * ...
 */

export const vercelCronHandlers = {
  "deadline-reminder": CRON_SCHEDULES.마감일알림체크.handler,
  "2week-reminder-mon": CRON_SCHEDULES["2주차알림_월요일"].handler,
  "2week-reminder-tue": CRON_SCHEDULES["2주차알림_화요일"].handler,
  "2week-reminder-wed": CRON_SCHEDULES["2주차알림_수요일"].handler,
  "2week-reminder-thu": CRON_SCHEDULES["2주차알림_목요일"].handler,
  "2week-reminder-fri": CRON_SCHEDULES["2주차알림_금요일"].handler,
};

// ============================================
// 내보내기
// ============================================

export default {
  CRON_SCHEDULES,
  startCronJobs,
  vercelCronHandlers,
};
