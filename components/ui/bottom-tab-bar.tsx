"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Workflow,
  Palette,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabBarProps {
  pendingDesignCount?: number;
  onMoreClick?: () => void;
}

const tabs = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "홈",
    exact: true,
  },
  {
    href: "/dashboard/workflows",
    icon: Workflow,
    label: "제작현황",
    exact: false,
  },
  {
    href: "/dashboard/design-threads",
    icon: Palette,
    label: "시안확인",
    exact: false,
  },
];

export function BottomTabBar({
  pendingDesignCount = 0,
  onMoreClick,
}: BottomTabBarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);
          const showBadge =
            tab.href === "/dashboard/workflows" && pendingDesignCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative",
                "transition-colors duration-200",
                active ? "text-gold-600" : "text-gray-500 hover:text-gray-900",
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {pendingDesignCount > 9 ? "9+" : pendingDesignCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* 더보기 버튼 */}
        <button
          onClick={onMoreClick}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full",
            "text-gray-500 hover:text-gray-900 transition-colors duration-200",
          )}
        >
          <Menu className="w-6 h-6" />
          <span className="text-xs mt-1 font-medium">더보기</span>
        </button>
      </div>
    </nav>
  );
}
