"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Package, MessageSquare, Megaphone } from "lucide-react";
import Link from "next/link";

export default function GraduatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (
      status === "authenticated" &&
      (session?.user as any)?.role === "admin"
    ) {
      router.push("/admin");
    } else if (status === "authenticated") {
      const cohortName = (session?.user as any)?.cohortName;
      const isGraduated = (session?.user as any)?.isGraduated === true || cohortName === "수료생";

      // 수료생이 아닌 경우 일반 대시보드로 리다이렉트
      if (!isGraduated) {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white animate-pulse">로딩 중...</div>
      </div>
    );
  }

  if (
    status === "unauthenticated" ||
    (session?.user as any)?.role === "admin"
  ) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Subtle Pattern Background */}
      <div className="fixed inset-0 pattern-background opacity-50" />

      {/* Header */}
      <header className="relative z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Top Bar */}
          <div className="flex h-12 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-sm sm:text-xl font-bold text-gray-900">START PACKAGE</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm hidden sm:block">
                <span className="text-gray-600">안녕하세요, </span>
                <span className="text-blue-600 font-semibold">
                  {session?.user?.name}
                </span>
                <span className="text-gray-600">님</span>
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  수료생
                </span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-7 px-2 sm:h-9 sm:px-3"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </div>
          </div>
          {/* 수료생 전용 네비게이션 - 2개 메뉴만 */}
          <nav className="grid grid-cols-2 gap-1 pb-2 sm:pb-4">
            <Link href="/graduated/communication">
              <Button
                variant="ghost"
                size="sm"
                className={`${pathname === "/graduated/communication" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"} text-xs sm:text-sm h-8 px-2 sm:h-9 sm:px-3 w-full`}
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                문의하기
              </Button>
            </Link>
            <Link href="/graduated/announcements">
              <Button
                variant="ghost"
                size="sm"
                className={`${pathname === "/graduated/announcements" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"} text-xs sm:text-sm h-8 px-2 sm:h-9 sm:px-3 w-full`}
              >
                <Megaphone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                마케팅 소식
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto p-3 sm:p-4 md:p-6">{children}</main>

      {/* Footer */}
      <footer className="relative mt-8 sm:mt-12 border-t border-gray-200 bg-white py-4 sm:py-6">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-gray-500">
          <p>© 비즈액터스쿨 스타트패키지. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
