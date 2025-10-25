"use client";

import { useState } from "react";
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
    name: "기수 관리",
    href: "/admin/cohorts",
    icon: GraduationCap,
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
    name: "마케팅 소식",
    href: "/admin/announcements",
    icon: Megaphone,
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

  // Middleware에서 리다이렉트 처리하므로 여기서는 렌더링만
  if (status === "unauthenticated") {
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

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${
                      isActive
                        ? "bg-red-50 text-red-700 font-medium border border-red-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="mb-3 px-2">
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
        <main className="relative p-4 sm:p-6 md:p-8">{children}</main>

        {/* Footer */}
        <footer className="relative mt-12 border-t border-gray-200 bg-white py-6">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500">
            <p>© 비즈액터스쿨 스타트패키지 관리자. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
