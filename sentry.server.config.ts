import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 환경 설정
  environment: process.env.NODE_ENV,

  // 트레이싱 샘플링 레이트
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // 에러 필터링
  beforeSend(event, hint) {
    // 개발 환경에서 콘솔에도 출력
    if (process.env.NODE_ENV === "development") {
      console.error("Sentry Server Error:", hint.originalException || hint.syntheticException);
    }
    return event;
  },

  // 민감한 정보 제외
  ignoreErrors: [
    // Prisma 연결 에러 (재시도로 해결될 수 있음)
    "PrismaClientInitializationError",
  ],
});
