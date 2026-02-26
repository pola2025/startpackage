"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Workflow,
  Bell,
  GraduationCap,
  LogOut,
  UserPlus,
  Package,
  Menu,
  X,
  Megaphone,
  MessageSquare,
  Shield,
  Lightbulb,
  Zap,
  Globe,
  Palette,
  BellRing,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    name: "대시보드",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "사용자 관리",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "워크플로우",
    href: "/admin/workflows",
    icon: Workflow,
  },
  {
    name: "알림 이력",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    name: "팝업 관리",
    href: "/admin/alerts",
    icon: BellRing,
  },
  {
    name: "기수 관리",
    href: "/admin/cohorts",
    icon: GraduationCap,
  },
  {
    name: "관리자 관리",
    href: "/admin/admins",
    icon: Shield,
  },
  {
    name: "가입 신청",
    href: "/admin/requests",
    icon: UserPlus,
  },
  {
    name: "마케팅 연장",
    href: "/admin/marketing-extensions",
    icon: Megaphone,
  },
  {
    name: "커뮤니케이션",
    href: "/admin/communication",
    icon: MessageSquare,
  },
  {
    name: "시안 관리",
    href: "/admin/design-threads",
    icon: Palette,
  },
  {
    name: "광고 자동화",
    href: "/admin/ad-automation",
    icon: Zap,
  },
  {
    name: "홈페이지",
    href: "/admin/homepage",
    icon: Globe,
  },
  {
    name: "마케팅 소식",
    href: "/admin/announcements",
    icon: Megaphone,
  },
  {
    name: "콘텐츠 제작 Tip",
    href: "/admin/content-tips",
    icon: Lightbulb,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // 인증 및 권한 체크 (Middleware 대체)
  useEffect(() => {
    if (status === "loading") return;

    // 인증되지 않은 경우 로그인 페이지로
    if (status === "unauthenticated") {
      router.replace("/admin/login");
      return;
    }

    // 권한 체크: admin 권한이 없는 경우
    const userRole = session?.user?.role;
    if (
      session &&
      userRole &&
      !["super", "designer", "operator"].includes(userRole)
    ) {
      router.replace("/");
      return;
    }
  }, [status, session, router]);

  // 미확인 메시지 개수 가져오기
  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/admin/communication/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadMessageCount(data.unreadCount);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    fetchUnreadCount();

    // 30초마다 갱신
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [status]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  // 인증되지 않았거나 권한이 없는 경우
  if (status === "unauthenticated") {
    return null;
  }

  const userRole = session?.user?.role;
  if (
    session &&
    userRole &&
    !["super", "designer", "operator"].includes(userRole)
  ) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Subtle Pattern Background */}
      <div className="fixed inset-0 pattern-background opacity-50" />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out shadow-lg
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shadow-md">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">ADMIN</h1>
                  <p className="text-xs text-gray-500">관리자 패널</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const showBadge =
                item.href === "/admin/communication" && unreadMessageCount > 0;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative
                    ${
                      isActive
                        ? "bg-red-50 text-red-700 font-medium border border-red-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                  {showBadge && (
                    <span className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
            {/* 사용자 화면 보기 */}
            <a
              href="/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium w-full"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              사용자 화면 보기
            </a>
            <div className="mb-1 px-2">
              <p className="text-xs text-gray-500">로그인 정보</p>
              <p className="text-sm text-gray-900 font-medium mt-1">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar (Mobile) */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">ADMIN</span>
            </div>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </header>

        {/* Page Content */}
        <main className="relative p-3 sm:p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        {/* Footer - Desktop only */}
        <footer className="relative mt-12 border-t border-gray-200 bg-white py-6 hidden lg:block">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500">
            <p>© 비즈액터스쿨 스타트패키지 관리자. All rights reserved.</p>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden shadow-lg">
          <div className="flex items-center justify-around h-16">
            <Link
              href="/admin"
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                pathname === "/admin" ? "text-red-600" : "text-gray-500"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs mt-1">대시보드</span>
            </Link>
            <Link
              href="/admin/workflows"
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                pathname === "/admin/workflows"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              <Workflow className="w-5 h-5" />
              <span className="text-xs mt-1">워크플로우</span>
            </Link>
            <Link
              href="/admin/users"
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                pathname === "/admin/users" ? "text-red-600" : "text-gray-500"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs mt-1">사용자</span>
            </Link>
            <Link
              href="/admin/communication"
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                pathname === "/admin/communication"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              <div className="relative">
                <MessageSquare className="w-5 h-5" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">문의</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                sidebarOpen ? "text-red-600" : "text-gray-500"
              }`}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
              <span className="text-xs mt-1">
                {sidebarOpen ? "닫기" : "더보기"}
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
