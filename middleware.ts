import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role;

  // Admin 영역 체크
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/register");
  const isAdminLogin = pathname.startsWith("/admin/login");

  // Admin 로그인 페이지: 이미 로그인되어 있으면 /admin으로
  if (isAdminLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Admin 영역: 미인증 또는 권한 없으면 로그인 페이지로
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    if (!["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
