"use client";

import { Badge } from "@/components/ui/badge";

interface NaverAdSettingBadgeProps {
  enabled: boolean;
}

/**
 * 네이버 광고 설정 상태 배지
 * 🟢 켜짐
 * 🔴 꺼짐
 */
export function NaverAdSettingBadge({ enabled }: NaverAdSettingBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 h-[28px] justify-center">
      <span className="text-[10px] text-gray-600 leading-tight">네이버</span>
      <Badge
        variant="outline"
        className={`h-[18px] text-[10px] px-1.5 leading-none ${
          enabled
            ? "bg-green-100 border-green-300 text-green-700"
            : "bg-gray-100 border-gray-300 text-gray-700"
        }`}
      >
        {enabled ? "🟢 켜짐" : "🔴 꺼짐"}
      </Badge>
    </div>
  );
}
