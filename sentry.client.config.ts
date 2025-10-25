import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 환경 설정
  environment: process.env.NODE_ENV,

  // 트레이싱 샘플링 레이트 (0.0 ~ 1.0)
  // 프로덕션에서는 낮은 값 권장 (예: 0.1 = 10%)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // 에러 필터링
  beforeSend(event, hint) {
    // 개발 환경에서 콘솔에도 출력
    if (process.env.NODE_ENV === "development") {
      console.error("Sentry Error:", hint.originalException || hint.syntheticException);
    }
    return event;
  },

  // 민감한 정보 제외
  ignoreErrors: [
    // 브라우저 확장 프로그램 에러
    "top.GLOBALS",
    "Can't find variable: ZiteReader",
    "jigsaw is not defined",
    "ComboSearch is not defined",
    // 네트워크 에러
    "NetworkError",
    "Failed to fetch",
    // 사용자 취소 액션
    "AbortError",
  ],

  // Replay 설정 (선택사항)
  replaysSessionSampleRate: 0.1, // 10% 세션 녹화
  replaysOnErrorSampleRate: 1.0, // 에러 발생 시 100% 녹화

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
