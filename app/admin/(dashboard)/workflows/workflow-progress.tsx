"use client";

import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WorkflowProgressProps {
  status: string;
  수정횟수: number;
  자료제출일?: Date | null;
  createdAt: Date;
}

// 상태별 진행률 계산
const getProgressByStatus = (status: string): number => {
  const progressMap: Record<string, number> = {
    // 로고 워크플로우
    "시안제작중": 30,
    "시안컨펌요청": 60,
    "최종확정": 100,
    // 인쇄물 워크플로우
    "대기": 10,
    "시안중": 30,
    "발주대기": 50,
    "발주요청": 60,
    "발주완료": 75,
    "제작완료": 90,
    "발송완료": 100,
  };
  return progressMap[status] || 0;
};

// 긴급도 계산 (날짜 + 수정횟수 기반)
const getUrgencyLevel = (
  자료제출일: Date | null | undefined,
  수정횟수: number,
  status: string
): { level: "low" | "medium" | "high"; label: string } => {
  if (status === "발송완료") {
    return { level: "low", label: "" };
  }

  const now = new Date();
  let daysSinceSubmission = 0;

  if (자료제출일) {
    daysSinceSubmission = Math.floor(
      (now.getTime() - new Date(자료제출일).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // 긴급도 계산 로직
  if (수정횟수 > 2 || daysSinceSubmission > 14) {
    return { level: "high", label: "긴급" };
  } else if (수정횟수 === 2 || daysSinceSubmission > 7) {
    return { level: "medium", label: "주의" };
  }

  return { level: "low", label: "" };
};

export default function WorkflowProgress({
  status,
  수정횟수,
  자료제출일,
  createdAt,
}: WorkflowProgressProps) {
  const progress = getProgressByStatus(status);
  const urgency = getUrgencyLevel(자료제출일, 수정횟수, status);

  const progressColor =
    urgency.level === "high"
      ? "bg-red-500"
      : urgency.level === "medium"
      ? "bg-orange-500"
      : "bg-blue-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            진행률 {progress}%
          </span>
          {urgency.label && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                urgency.level === "high"
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {urgency.label}
            </div>
          )}
        </div>
      </div>
      <Progress value={progress} className="h-2" indicatorClassName={progressColor} />
    </div>
  );
}
