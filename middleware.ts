import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMigrationMaintenance, MIGRATION_MAINTENANCE_MESSAGE } from "./lib/d1/maintenance";

// 도메인 분리 활성화 토글 (Phase 2 마이그 시 true로 전환)
const DOMAIN_SPLIT_ENABLED =
  process.env.NEXT_PUBLIC_DOMAIN_SPLIT_ENABLED === "true";

const ADMIN_HOST = "admin.polaai.co.kr";
const MAIN_HOST = "polaai.co.kr";
const EDUCATION_HOST = process.env.EDUCATION_HOST || "mkt.polaai.co.kr";

export function middleware(request: NextRequest) {
  const isContentTipCron = request.nextUrl.pathname === "/api/cron/content-tip-notifications";
  if (isMigrationMaintenance() && !isContentTipCron) {
    return NextResponse.json(
      { error: MIGRATION_MAINTENANCE_MESSAGE, code: "MIGRATION_MAINTENANCE" },
      { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } },
    );
  }
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") || "").toLowerCase();
  const hostname = host.split(":")[0];

  if (hostname === EDUCATION_HOST) {
    const userAgent = request.headers.get("user-agent") || "";
    if (process.env.NODE_ENV === "production" && (!userAgent || /bot|crawler|spider|scrapy|curl|wget|python-requests|headlesschrome|playwright|selenium/i.test(userAgent))) {
      return new NextResponse("Forbidden", { status: 403, headers: { "X-Robots-Tag": "noindex, nofollow, noarchive", "Cache-Control": "private, no-store" } });
    }
    const allowed = pathname.startsWith("/education") || pathname.startsWith("/api/education") || pathname.startsWith("/_next") || pathname === "/robots.txt" || pathname === "/favicon.ico";
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/education";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

  // ============================================================
  // 1. 호스트 분기 (도메인 분리 단계적 활성화)
  // ============================================================
  if (DOMAIN_SPLIT_ENABLED) {
    // admin 서브도메인: 페이지 라우트만 /admin/* 로 rewrite
    // /api/* 는 절대 rewrite 금지 (admin 페이지에서 /api/admin/*, /api/workflows/* 등 호출)
    if (host.startsWith("admin.")) {
      if (
        !pathname.startsWith("/admin") &&
        !pathname.startsWith("/api/") && // API는 원본 경로 유지
        !pathname.startsWith("/_next") &&
        !pathname.match(/\.[a-z0-9]+$/i) // 정적 파일 제외
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin" + (pathname === "/" ? "" : pathname);
        return NextResponse.rewrite(url);
      }
    }
    // 메인 도메인에서 /admin 경로 접근 → admin 서브도메인 영구 리다이렉트
    else if (host === MAIN_HOST && pathname.startsWith("/admin")) {
      const target = pathname.replace(/^\/admin/, "") || "/";
      return NextResponse.redirect(new URL(target, `https://${ADMIN_HOST}`), {
        status: 301,
      });
    }
  }

  // ============================================================
  // 2. admin 경로 인증 체크 (NextAuth v5 쿠키)
  // ============================================================
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isAdminRoute =
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/register");
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // 역할 기반 권한 체크는 Server Component / API Route에서 처리
  // (Edge Runtime에서 DB 조회 불가)

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * /admin/* 보호 + 호스트 분기 적용 범위
     * 정적 파일·_next·favicon 제외
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)).*)",
  ],
};
