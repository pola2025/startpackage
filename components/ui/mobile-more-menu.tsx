"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Globe,
  BookOpen,
  Facebook,
  MessageSquare,
  Megaphone,
  Lightbulb,
  LogOut,
  User,
  Palette,
  Hammer,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isGraduated: boolean;
  unreadCount: number;
}

export function MobileMoreMenu({
  open,
  onOpenChange,
  userName,
  isGraduated,
  unreadCount,
}: MobileMoreMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const close = () => onOpenChange(false);

  // 제작진행 중 하단탭에 없는 항목
  const productionItems = !isGraduated
    ? [
        {
          href: "/dashboard/homepage",
          icon: Globe,
          label: "홈페이지 제작요청",
          badge: null,
        },
      ]
    : [];

  // 가이드 그룹
  const guideItems = !isGraduated
    ? [
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
      ]
    : [];

  const renderLink = (item: {
    href: string;
    icon: any;
    label: string;
    badge: number | null;
  }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors touch-target",
          isActive
            ? "bg-gold-50 text-gold-600"
            : "text-gray-700 hover:bg-gray-100",
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="flex-1 font-medium">{item.label}</span>
        {item.badge !== null && item.badge > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[80vh] pb-safe"
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pb-2">
          <div className="w-12 h-1.5 rounded-full bg-gray-300" />
        </div>

        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">메뉴</SheetTitle>
        </SheetHeader>

        {/* 사용자 정보 */}
        <div className="mb-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
              <User className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{userName}</p>
              {isGraduated && (
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                  수료생
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 메뉴 목록 */}
        <nav className="space-y-1 overflow-y-auto max-h-[40vh]">
          {/* 제작진행 - 하단탭에 없는 항목 */}
          {productionItems.length > 0 && (
            <div className="pb-1">
              <p className="px-4 py-1.5 text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5" />
                제작진행
              </p>
              {productionItems.map(renderLink)}
            </div>
          )}

          {/* 문의하기 */}
          {renderLink({
            href: "/dashboard/communication",
            icon: MessageSquare,
            label: "문의하기",
            badge: unreadCount > 0 ? unreadCount : null,
          })}

          {/* 가이드 그룹 */}
          {guideItems.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setGuideOpen(!guideOpen)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">가이드</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    guideOpen ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>
              {guideOpen && (
                <div className="space-y-0.5">{guideItems.map(renderLink)}</div>
              )}
            </div>
          )}
        </nav>

        {/* 로그아웃 버튼 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12"
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
