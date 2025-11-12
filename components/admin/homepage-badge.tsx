"use client";

import { Badge } from "@/components/ui/badge";

interface HomepageBadgeProps {
  completed: boolean;
  completedAt?: Date | null;
}

/**
 * 홈페이지 완료 상태 배지
 * 🟢 켜짐 (완료)
 * 🔴 꺼짐 (미완료)
 */
export function HomepageBadge({ completed, completedAt }: HomepageBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={
        completed
          ? "bg-green-100 border-green-300 text-green-700"
          : "bg-gray-100 border-gray-300 text-gray-700"
      }
    >
      {completed ? "🟢 켜짐" : "🔴 꺼짐"}
    </Badge>
  );
}
