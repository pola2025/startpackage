"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WorkflowProgressProps {
  status: string;
  type: string; // 워크플로우 타입 추가
  수정횟수: number;
  자료제출일?: Date | null;
  createdAt: Date;
}

// 타입별 상태 진행률 계산
const getProgressByStatus = (status: string, type: string): number => {
  // 로고 워크플로우 전용 상태
  if (type === "로고") {
    const logoProgressMap: Record<string, number> = {
      대기: 10,
      시안제작중: 40,
      시안컨펌요청: 70,
      최종확정: 100,
    };
    return logoProgressMap[status] ?? 0;
  }

  // 홈페이지 워크플로우 전용 상태
  if (type === "홈페이지") {
    const homepageProgressMap: Record<string, number> = {
      대기: 10,
      "제작 진행 중": 50,
      제작진행중: 50, // 띄어쓰기 없는 버전 호환
      "제작 완료": 80,
      제작완료: 80, // 띄어쓰기 없는 버전 호환
      최종확정: 100,
    };
    return homepageProgressMap[status] ?? 0;
  }

  // 인쇄물 워크플로우 (명함, 명찰, 대봉투, 자문계약서 등)
  const printProgressMap: Record<string, number> = {
    대기: 10,
    시안중: 25,
    발주대기: 40,
    발주요청: 55,
    발주완료: 70,
    제작완료: 85,
    발송완료: 100,
  };
  return printProgressMap[status] ?? 0;
};

// 긴급도 계산 (날짜 + 수정횟수 기반)
const getUrgencyLevel = (
  자료제출일: Date | null | undefined,
  수정횟수: number,
  status: string,
): { level: "low" | "medium" | "high"; label: string } => {
  // 완료 상태 (최종확정 또는 발송완료)는 긴급도 없음
  if (status === "최종확정" || status === "발송완료") {
    return { level: "low", label: "" };
  }

  const now = new Date();
  let daysSinceSubmission = 0;

  if (자료제출일) {
    daysSinceSubmission = Math.floor(
      (now.getTime() - new Date(자료제출일).getTime()) / (1000 * 60 * 60 * 24),
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

// 완료 상태인지 확인
const isCompleted = (status: string, type: string): boolean => {
  if (type === "로고" || type === "홈페이지") {
    return status === "최종확정";
  }
  return status === "발송완료";
};

export default function WorkflowProgress({
  status,
  type,
  수정횟수,
  자료제출일,
  createdAt,
}: WorkflowProgressProps) {
  const progress = getProgressByStatus(status, type);
  const urgency = getUrgencyLevel(자료제출일, 수정횟수, status);
  const completed = isCompleted(status, type);

  // 완료 상태면 녹색, 아니면 긴급도에 따라 색상 결정
  const progressColor = completed
    ? "bg-ok-500"
    : urgency.level === "high"
      ? "bg-terra-500"
      : urgency.level === "medium"
        ? "bg-terra-500"
        : "bg-gold-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {completed ? (
            <div className="flex items-center gap-1 text-ok-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">완료</span>
            </div>
          ) : (
            <>
              <span className="text-xs font-medium text-gray-700">
                진행률 {progress}%
              </span>
              {urgency.label && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    urgency.level === "high"
                      ? "bg-terra-50 text-terra-600"
                      : "bg-terra-50 text-terra-500"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {urgency.label}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Progress
        value={progress}
        className="h-2"
        indicatorClassName={progressColor}
      />
    </div>
  );
}
