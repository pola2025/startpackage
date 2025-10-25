import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 환경 설정
  environment: process.env.NODE_ENV,

  // Edge Runtime은 가벼워야 하므로 낮은 샘플링 레이트
  tracesSampleRate: 0.1,

  // 에러 필터링
  beforeSend(event) {
    return event;
  },
});
