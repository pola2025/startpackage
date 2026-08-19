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
  ChevronDown,
  Hammer,
  GraduationCap,
  Images,
  PenTool,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userName: string;
  isGraduated: boolean;
  unreadCount: number;
  pendingDesignCount: number;
}

interface MenuItem {
  href: string;
  icon: any;
  label: string;
  badge: number | null;
}

interface MenuGroup {
  label: string;
  icon: any;
  defaultOpen: boolean;
  items: MenuItem[];
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

  // 제작진행 그룹의 하위 경로에 있으면 자동으로 열림
  const isInProductionGroup = [
    "/dashboard/submission",
    "/dashboard/homepage",
    "/dashboard/workflows",
  ].some((p) => pathname.startsWith(p));

  // 가이드 그룹의 하위 경로에 있으면 자동으로 열림
  const isInGuideGroup = [
    "/dashboard/guides",
    "/dashboard/meta-ads",
    "/dashboard/design-threads",
    "/dashboard/announcements",
    "/dashboard/content-tips",
  ].some((p) => pathname.startsWith(p));

  const [productionOpen, setProductionOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(isInGuideGroup);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  // 제작진행 그룹 (자료 제출은 위자드 모달로 대체되어 메뉴에서 숨김)
  const productionGroup: MenuGroup = {
    label: "제작진행",
    icon: Hammer,
    defaultOpen: true,
    items: [
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
    ],
  };

  // 가이드 그룹
  const guideGroup: MenuGroup = {
    label: "가이드",
    icon: GraduationCap,
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/guides",
        icon: BookOpen,
        label: "참고가이드",
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
      {
        href: "/dashboard/content-samples",
        icon: Images,
        label: "콘텐츠 제작사례",
        badge: null,
      },
      {
        href: "/dashboard/logo-samples",
        icon: PenTool,
        label: "로고 제작사례",
        badge: null,
      },
    ],
  };

  const renderMenuItem = (item: MenuItem, closeMobile?: () => void) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    return (
      <Link key={item.href} href={item.href} onClick={closeMobile}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start pl-10 h-9 text-sm",
            isActive
              ? "bg-gold-50 text-gold-600 font-semibold hover:bg-gold-100"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          )}
        >
          <Icon className="w-4 h-4 mr-2.5" />
          {item.label}
          {item.badge !== null && item.badge > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </Button>
      </Link>
    );
  };

  const renderGroup = (
    group: MenuGroup,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    closeMobile?: () => void,
  ) => {
    const GroupIcon = group.icon;
    const hasActiveBadge = group.items.some(
      (item) => item.badge !== null && item.badge > 0,
    );

    return (
      <div key={group.label}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <GroupIcon className="w-4 h-4" />
          <span className="flex-1 text-left">{group.label}</span>
          {!isOpen && hasActiveBadge && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        {isOpen && (
          <div className="space-y-0.5 pb-1">
            {group.items.map((item) => renderMenuItem(item, closeMobile))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = ({ closeMobile }: { closeMobile?: () => void }) => (
    <>
      {/* 로고 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-base font-bold text-gray-900">START PACKAGE</h1>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* 대시보드 - 독립 항목 */}
        <Link href="/dashboard" onClick={closeMobile}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-9",
              pathname === "/dashboard"
                ? "bg-gold-50 text-gold-600 font-semibold hover:bg-gold-100"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            )}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            대시보드
          </Button>
        </Link>

        {/* 제작진행 그룹 - 일반 사용자만 */}
        {!isGraduated &&
          renderGroup(
            productionGroup,
            productionOpen || isInProductionGroup,
            setProductionOpen,
            closeMobile,
          )}

        {/* 온라인마케팅 - 독립 항목 */}
        {!isGraduated && (
          <Link href="/dashboard/online-marketing" onClick={closeMobile}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-9",
                pathname.startsWith("/dashboard/online-marketing")
                  ? "bg-gold-50 text-gold-600 font-semibold hover:bg-gold-100"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
              )}
            >
              <Megaphone className="w-5 h-5 mr-3" />
              온라인마케팅(유료)
            </Button>
          </Link>
        )}

        {/* 문의하기 - 독립 항목 */}
        <Link href="/dashboard/communication" onClick={closeMobile}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-9",
              pathname === "/dashboard/communication"
                ? "bg-gold-50 text-gold-600 font-semibold hover:bg-gold-100"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            )}
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            문의하기
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* 가이드 그룹 */}
        {!isGraduated &&
          renderGroup(
            guideGroup,
            guideOpen || isInGuideGroup,
            setGuideOpen,
            closeMobile,
          )}
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-900 truncate flex-1">
            {userName}
          </p>
          {isGraduated && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded flex-shrink-0">
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

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide Menu */}
          <aside className="lg:hidden fixed inset-y-0 right-0 w-72 bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <SidebarContent closeMobile={() => setIsMobileMenuOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
