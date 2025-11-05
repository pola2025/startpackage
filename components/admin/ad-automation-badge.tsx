"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface AdAutomationBadgeProps {
  enabled: boolean;
  startDate: Date | null;
  endDate: Date | null;
  marketingSupportEndDate: Date | null;
}

/**
 * 광고자동화 상태 배지
 * 🟢 켜짐 (D-Day 표시)
 * 🔴 꺼짐
 * 🟡 유료 (결제)
 */
export function AdAutomationBadge({
  enabled,
  startDate,
  endDate,
  marketingSupportEndDate,
}: AdAutomationBadgeProps) {
  // 남은 기간 계산
  const calculateDaysRemaining = () => {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining();
  const isExpired = daysRemaining < 0;
  const isPaid = marketingSupportEndDate && endDate && new Date(endDate) > new Date(marketingSupportEndDate);

  if (!enabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-600">자동화</span>
              <Badge variant="outline" className="bg-gray-100 border-gray-300 text-gray-700">
                🔴 꺼짐
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div>광고자동화: 비활성</div>
              {endDate && <div>종료일: {new Date(endDate).toLocaleDateString("ko-KR")}</div>}
              <div className="text-gray-500">상태: 만료됨</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-600">자동화</span>
              <Badge variant="outline" className="bg-red-100 border-red-300 text-red-700">
                🔴 만료됨
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div>광고자동화: 활성 (만료)</div>
              <div>종료일: {endDate && new Date(endDate).toLocaleDateString("ko-KR")}</div>
              <div className="text-red-600">⚠️ {Math.abs(daysRemaining)}일 전 만료</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const badgeColor = isPaid
    ? "bg-yellow-100 border-yellow-300 text-yellow-700"
    : "bg-green-100 border-green-300 text-green-700";

  const badgeIcon = isPaid ? "🟡" : "🟢";
  const badgeText = isPaid ? "유료" : "켜짐";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-600">자동화</span>
            <Badge variant="outline" className={badgeColor}>
              {badgeIcon} {badgeText}
            </Badge>
            <span className="text-xs text-gray-600">
              D-{daysRemaining}일
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>광고자동화: 활성 {isPaid && "(유료)"}</div>
            {startDate && <div>시작일: {new Date(startDate).toLocaleDateString("ko-KR")}</div>}
            {endDate && <div>종료일: {new Date(endDate).toLocaleDateString("ko-KR")}</div>}
            <div className="text-green-600">남은 기간: {daysRemaining}일</div>
            {isPaid && <div className="text-yellow-600">💰 유료 결제 적용</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
