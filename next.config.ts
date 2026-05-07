import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// ============================================================
// 보안 헤더 — 외부 노출 0 정책 (수강생 전용 사이트)
// ============================================================
const SECURITY_HEADERS = [
  // 검색엔진 / 봇 색인 완전 차단
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
  },
  // 외부 사이트로 referrer 누출 차단
  { key: "Referrer-Policy", value: "no-referrer" },
  // MIME 스니핑 차단
  { key: "X-Content-Type-Options", value: "nosniff" },
  // iframe 임베드 차단 (clickjacking 방어)
  { key: "X-Frame-Options", value: "DENY" },
  // HTTPS 강제 + 프리로드
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // 카메라·마이크·위치 등 권한 차단 (불필요)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
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
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
