"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Globe,
  CreditCard,
  BookOpen,
  Facebook,
  MessageSquare,
  Megaphone,
  Lightbulb,
  LogOut,
  User,
  X,
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

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const menuItems = [
    // 일반 사용자 전용 메뉴
    ...(!isGraduated
      ? [
          {
            href: "/dashboard/homepage",
            icon: Globe,
            label: "홈페이지 제작요청",
            badge: null,
          },
          {
            href: "/dashboard/homepage-payment",
            icon: CreditCard,
            label: "홈페이지 결제요청",
            badge: null,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] pb-safe">
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
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
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
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors touch-target",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
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
          })}
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
