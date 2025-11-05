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
    <div className="flex flex-col items-center gap-1 h-[52px] justify-start">
      <span className="text-xs text-gray-600">홈페이지</span>
      <Badge
        variant="outline"
        className={
          completed
            ? "bg-green-100 border-green-300 text-green-700"
            : "bg-gray-100 border-gray-300 text-gray-700"
        }
      >
        {completed ? "✅ 완료" : "⏳ 미완료"}
      </Badge>
      {completed && completedAt && (
        <span className="text-[10px] text-gray-500">
          {new Date(completedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}
