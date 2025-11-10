"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkflowStatusIconsProps {
  workflows: Array<{
    type: string;
    status: string;
  }>;
}

const WORKFLOW_TYPES = ["로고", "명함", "명찰", "대봉투", "홈페이지"];

/**
 * 제작물 완료 현황 아이콘
 * 🟢 = 완료 (최종확정, 제작완료, 또는 발송완료)
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

    // 모든 디자인 항목은 "최종확정", "제작완료" 또는 "발송완료"를 완료로 인정
    return status === "최종확정" || status === "제작완료" || status === "발송완료";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 h-[28px]">
            {WORKFLOW_TYPES.map((type) => {
              const status = statusMap[type];
              const completed = isCompleted(type, status);

              return (
                <div key={type} className="flex flex-col items-center gap-0.5 h-[28px] justify-center">
                  <span className="text-[10px] text-gray-500 font-medium leading-tight">
                    {type}
                  </span>
                  <span className="text-sm leading-none">
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
