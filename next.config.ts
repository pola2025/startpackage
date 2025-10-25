import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

// Sentry 설정
const sentryConfig = {
  // Sentry SDK 설정 파일 경로 자동 감지
  silent: true, // 빌드 로그 간소화

  // Source maps 업로드 설정 (프로덕션 빌드만)
  widenClientFileUpload: true,
  hideSourceMaps: true, // 프로덕션에서 소스맵 숨김
  disableLogger: true, // Sentry 내부 로거 비활성화

  // 자동 계측 설정
  automaticVercelMonitors: true, // Vercel Cron 자동 모니터링
};

// Sentry가 활성화된 경우에만 withSentryConfig 적용
export default process.env.SENTRY_DSN ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;
