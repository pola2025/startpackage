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
 * 🟢 = 발송완료
 * 🔴 = 그 외
 */
export function WorkflowStatusIcons({ workflows }: WorkflowStatusIconsProps) {
  const statusMap = workflows.reduce((acc, w) => {
    acc[w.type] = w.status;
    return acc;
  }, {} as Record<string, string>);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {WORKFLOW_TYPES.map((type) => {
              const status = statusMap[type];
              const isCompleted = status === "발송완료";

              return (
                <span key={type} className="text-base">
                  {isCompleted ? "🟢" : "🔴"}
                </span>
              );
            })}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            {WORKFLOW_TYPES.map((type) => {
              const status = statusMap[type];
              const isCompleted = status === "발송완료";

              return (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{type}:</span>
                  <span className={isCompleted ? "text-green-600" : "text-gray-500"}>
                    {status || "대기"} {isCompleted ? "✓" : ""}
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
