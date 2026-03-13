"use client";

import { Progress } from "./progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionProgressProps {
  percentage: number;
  status: "작성중" | "검토중" | "보완필요" | "완료";
  requiredFields: {
    label: string;
    completed: boolean;
  }[];
}

export function SubmissionProgress({
  percentage,
  status,
  requiredFields,
}: SubmissionProgressProps) {
  const statusConfig = {
    작성중: {
      color: "text-gold-700",
      bgColor: "bg-gold-50",
      borderColor: "border-gold-200",
      icon: Circle,
      label: "작성 중",
    },
    검토중: {
      color: "text-navy-700",
      bgColor: "bg-gold-50",
      borderColor: "border-gold-200",
      icon: Circle,
      label: "검토 중",
    },
    보완필요: {
      color: "text-terra-500",
      bgColor: "bg-terra-50",
      borderColor: "border-terra-100",
      icon: AlertCircle,
      label: "보완 필요",
    },
    완료: {
      color: "text-ok-700",
      bgColor: "bg-ok-50",
      borderColor: "border-ok-100",
      icon: CheckCircle2,
      label: "제출 완료",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const completedCount = requiredFields.filter((f) => f.completed).length;
  const totalCount = requiredFields.length;

  return (
    <div className="space-y-4 w-full">
      {/* Status Badge */}
      <div
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border",
          config.bgColor,
          config.borderColor,
        )}
      >
        <StatusIcon className={cn("w-5 h-5", config.color)} />
        <span className={cn("text-sm font-bold", config.color)}>
          {config.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-900">전체 진행률</span>
          <span className="font-bold text-navy-700">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-3" />
        <p className="text-xs text-gray-500">
          {completedCount}/{totalCount} 항목 완료
        </p>
      </div>

      {/* Required Fields Checklist - Mobile Optimized */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">필수 제출 항목</h3>
        <div className="grid grid-cols-1 gap-2">
          {requiredFields.map((field, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                field.completed
                  ? "bg-ok-50 border-ok-100"
                  : "bg-white border-gray-200 animate-pulse",
              )}
            >
              {field.completed ? (
                <CheckCircle2 className="w-5 h-5 text-ok-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  field.completed ? "text-ok-700" : "text-gray-700",
                )}
              >
                {field.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
