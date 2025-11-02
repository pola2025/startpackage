"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkflowStatusIconsProps {
  workflows: Array<{
    type: string;
    status: string;
  }>;
}

const WORKFLOW_TYPES = ["로고", "명함", "명찰", "대봉투"];

/**
 * 제작물 완료 현황 아이콘
 * 🟢 = 완료 (로고: 최종확정, 인쇄물: 발송완료)
 * 🔴 = 미완료
 */
export function WorkflowStatusIcons({ workflows }: WorkflowStatusIconsProps) {
  const statusMap = workflows.reduce((acc, w) => {
    acc[w.type] = w.status;
    return acc;
  }, {} as Record<string, string>);

  // 제작물 타입별 완료 기준
  const isCompleted = (type: string, status: string) => {
    if (!status) return false;

    // 로고는 "최종확정"도 완료로 인정
    if (type === "로고") {
      return status === "최종확정" || status === "발송완료";
    }

    // 인쇄물(명함, 명찰, 대봉투)은 "발송완료"만 완료
    return status === "발송완료";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {WORKFLOW_TYPES.map((type) => {
              const status = statusMap[type];
              const completed = isCompleted(type, status);

              return (
                <div key={type} className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-gray-500 font-medium">
                    {type}
                  </span>
                  <span className="text-base">
                    {completed ? "🟢" : "🔴"}
                  </span>
                </div>
              );
            })}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            {WORKFLOW_TYPES.map((type) => {
              const status = statusMap[type];
              const completed = isCompleted(type, status);

              return (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{type}:</span>
                  <span className={completed ? "text-green-600" : "text-gray-500"}>
                    {status || "대기"} {completed ? "✓" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
