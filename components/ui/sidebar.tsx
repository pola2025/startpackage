"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Package,
  LayoutDashboard,
  FileText,
  Workflow,
  BookOpen,
  MessageSquare,
  Megaphone,
  Lightbulb,
  Facebook,
  LogOut,
  Menu,
  X,
  Globe,
  Palette,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
  userName: string;
  isGraduated: boolean;
  unreadCount: number;
  pendingDesignCount: number;
}

export function Sidebar({
  userName,
  isGraduated,
  unreadCount,
  pendingDesignCount,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const menuItems = [
    // 일반 사용자 메뉴
    ...(!isGraduated
      ? [
          {
            href: "/dashboard",
            icon: LayoutDashboard,
            label: "대시보드",
            badge: null,
          },
          {
            href: "/dashboard/submission",
            icon: FileText,
            label: "자료 제출",
            badge: null,
          },
          {
            href: "/dashboard/homepage",
            icon: Globe,
            label: "홈페이지 제작요청",
            badge: null,
          },
          {
            href: "/dashboard/workflows",
            icon: Workflow,
            label: "제작 현황",
            badge: pendingDesignCount > 0 ? pendingDesignCount : null,
          },
          {
            href: "/dashboard/guides",
            icon: BookOpen,
            label: "가이드",
            badge: null,
          },
          {
            href: "/dashboard/meta-ads",
            icon: Facebook,
            label: "Meta 광고",
            badge: null,
          },
          {
            href: "/dashboard/design-threads",
            icon: Palette,
            label: "시안 확인",
            badge: null,
          },
        ]
      : []),
    // 모든 사용자 메뉴
    {
      href: "/dashboard/communication",
      icon: MessageSquare,
      label: "문의하기",
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      href: "/dashboard/announcements",
      icon: Megaphone,
      label: "마케팅 소식",
      badge: null,
    },
    {
      href: "/dashboard/content-tips",
      icon: Lightbulb,
      label: "콘텐츠 제작 Tip",
      badge: null,
    },
  ];

  const SidebarContent = () => (
    <>
      {/* 로고 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-900 flex items-center justify-center shadow-sm">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">START PACKAGE</h1>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start relative ${
                  isActive
                    ? "bg-gold-50 text-gold-600 font-semibold hover:bg-gold-100"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
                {item.badge !== null && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">로그인 정보</p>
          <p className="text-sm font-semibold text-gray-900">{userName}</p>
          {isGraduated && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
              수료생
            </span>
          )}
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white border-r border-gray-200 shadow-sm z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900">START PACKAGE</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide Menu */}
          <aside className="lg:hidden fixed inset-y-0 right-0 w-64 bg-white shadow-xl z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
