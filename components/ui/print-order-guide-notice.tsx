"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

// 가이드 화면이 열리면서 인쇄물 발주 탭이 바로 선택된다.
export const PRINT_ORDER_GUIDE_HREF = "/dashboard/guides?tab=design";

// 본문 맨 위 얇은 띠. 어느 화면에서든 한 번에 안내로 들어간다.
export function PrintOrderGuideStrip() {
  return (
    <Link
      href={PRINT_ORDER_GUIDE_HREF}
      className="flex items-center gap-2 bg-navy-900 px-3 py-2 text-white outline-none hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 sm:px-4 md:px-6"
    >
      <FileText className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
      <span className="shrink-0 text-xs font-bold sm:text-sm">
        인쇄물 발주 안내
      </span>
      <span className="min-w-0 truncate text-xs text-white/70">
        <span className="sm:hidden">발주 전 꼭 확인하세요</span>
        <span className="hidden sm:inline">
          발주 전 주의사항·제작 기간·사양을 확인하세요
        </span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 opacity-70"
        aria-hidden="true"
      />
    </Link>
  );
}

// PC 사이드바의 문의·자료 전달 카드 위에 두는 배너
export function PrintOrderGuideBanner({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href={PRINT_ORDER_GUIDE_HREF}
      onClick={onClick}
      className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl bg-navy-900 p-3 text-white outline-none hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <FileText className="h-4 w-4 text-gold-300" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold">인쇄물 발주 안내</span>
        <span className="block text-[11px] text-white/70">
          발주 전 꼭 확인하세요
        </span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 opacity-70"
        aria-hidden="true"
      />
    </Link>
  );
}
