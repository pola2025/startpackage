"use client";

import { Badge } from "@/components/ui/badge";

interface SmsSettingBadgeProps {
  enabled: boolean;
}

/**
 * SMS 설정 상태 배지
 * 🟢 켜짐
 * 🔴 꺼짐
 */
export function SmsSettingBadge({ enabled }: SmsSettingBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-600">SMS 설정</span>
      <Badge
        variant="outline"
        className={
          enabled
            ? "bg-green-100 border-green-300 text-green-700"
            : "bg-gray-100 border-gray-300 text-gray-700"
        }
      >
        {enabled ? "🟢 켜짐" : "🔴 꺼짐"}
      </Badge>
    </div>
  );
}
