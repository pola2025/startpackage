"use client";

import { Badge } from "@/components/ui/badge";

interface HomepageBadgeProps {
  completed: boolean;
  completedAt?: Date | null;
}

/**
 * 홈페이지 완료 상태 배지
 * ✅ 완료
 * ⏳ 미완료
 */
export function HomepageBadge({ completed, completedAt }: HomepageBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 h-[28px] justify-center">
      <span className="text-[10px] text-gray-600 leading-tight">홈페이지</span>
      <Badge
        variant="outline"
        className={`h-[18px] text-[10px] px-1.5 leading-none ${
          completed
            ? "bg-green-100 border-green-300 text-green-700"
            : "bg-gray-100 border-gray-300 text-gray-700"
        }`}
      >
        {completed ? "✅ 완료" : "⏳ 미완료"}
      </Badge>
    </div>
  );
}
