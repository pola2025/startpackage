import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token from cookies
  const sessionToken = request.cookies.get("authjs.session-token")?.value ||
                      request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  // Admin routes (excluding login/register)
  const isAdminRoute = pathname.startsWith("/admin") &&
                       !pathname.startsWith("/admin/login") &&
                       !pathname.startsWith("/admin/register");
  const isAdminLogin = pathname.startsWith("/admin/login");

  // Redirect logged-in users away from login
  if (isAdminLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Protect admin routes - require login
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Note: Role-based access control is handled by server components/API routes
  // as it requires database lookup which is not suitable for edge middleware

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
