import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;

  // 로그인하지 않은 경우 - 로그인 페이지로
  if (!session?.user) {
    // 로그인 페이지나 회원가입 페이지는 제외
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/graduated") ||
      pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const user = session.user as any;
  const isGraduated = user.isGraduated === true || user.cohortName === "수료생";
  const isAdmin = user.role === "admin" || user.role === "super" || user.role === "designer" || user.role === "operator";

  // 관리자는 /admin만 접근 가능
  if (isAdmin) {
    if (!pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // 수료생 보호 로직
  if (pathname.startsWith("/dashboard")) {
    if (isGraduated) {
      // 수료생이 일반 대시보드 접근 시 → /graduated로 리다이렉트
      console.log(`[MIDDLEWARE] 수료생이 /dashboard 접근 차단 → /graduated 리다이렉트`);
      return NextResponse.redirect(new URL("/graduated", request.url));
    }
  }

  // 일반 사용자 보호 로직
  if (pathname.startsWith("/graduated")) {
    if (!isGraduated) {
      // 일반 사용자가 수료생 페이지 접근 시 → /dashboard로 리다이렉트
      console.log(`[MIDDLEWARE] 일반 사용자가 /graduated 접근 차단 → /dashboard 리다이렉트`);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
