import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 도메인 분리 활성화 토글 (Phase 2 마이그 시 true로 전환)
const DOMAIN_SPLIT_ENABLED =
  process.env.NEXT_PUBLIC_DOMAIN_SPLIT_ENABLED === "true";

const ADMIN_HOST = "admin.polaai.co.kr";
const MAIN_HOST = "polaai.co.kr";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") || "").toLowerCase();

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
  const isAdminLogin = pathname.startsWith("/admin/login");

  if (isAdminLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
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
