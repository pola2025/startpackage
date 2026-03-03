"use client";

import { AlertTriangle, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UrgentAlert {
  type: "발주요청" | "피드백" | "지연";
  count: number;
  label: string;
  color: string;
}

interface UrgentAlertBannerProps {
  workflows: any[];
  onAlertClick: (type: string) => void;
}

export default function UrgentAlertBanner({
  workflows,
  onAlertClick,
}: UrgentAlertBannerProps) {
  const now = new Date();

  // 긴급 알림 계산
  const alerts: UrgentAlert[] = [
    {
      type: "발주요청",
      count: workflows.filter((w) => w.status === "발주요청").length,
      label: "발주 요청 대기",
      color: "bg-terra-50 border-terra-100 text-terra-500",
    },
    {
      type: "피드백",
      count: workflows.filter((w) => w.feedback && !w.feedbackRead).length,
      label: "피드백 확인 필요",
      color: "bg-terra-50 border-terra-100 text-terra-500",
    },
    {
      type: "지연",
      count: workflows.filter((w) => {
        // 완료 상태(최종확정 또는 발송완료)는 제외
        if (!w.자료제출일 || w.status === "최종확정" || w.status === "발송완료")
          return false;
        const daysSince = Math.floor(
          (now.getTime() - new Date(w.자료제출일).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return daysSince > 14;
      }).length,
      label: "14일 이상 경과",
      color: "bg-terra-50 border-terra-100 text-terra-600",
    },
  ];

  const urgentAlerts = alerts.filter((alert) => alert.count > 0);

  if (urgentAlerts.length === 0) return null;

  return (
    <Alert className="bg-terra-50 border-2 border-terra-100">
      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-terra-500 flex-shrink-0" />
      <AlertDescription className="ml-2 flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="font-semibold text-gray-900 text-sm sm:text-base">
              긴급 알림
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {urgentAlerts.map((alert) => (
                <Button
                  key={alert.type}
                  variant="outline"
                  size="sm"
                  onClick={() => onAlertClick(alert.type)}
                  className={`${alert.color} hover:opacity-80 transition-all text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8`}
                >
                  {alert.type === "발주요청" && (
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  )}
                  {alert.type === "피드백" && (
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  )}
                  {alert.type === "지연" && (
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  )}
                  <span className="font-medium hidden sm:inline">
                    {alert.label}
                  </span>
                  <span className="font-medium sm:hidden">
                    {alert.type === "발주요청"
                      ? "발주"
                      : alert.type === "피드백"
                        ? "피드백"
                        : "지연"}
                  </span>
                  <Badge
                    variant="secondary"
                    className="ml-1 sm:ml-2 bg-white text-gray-900 text-xs px-1.5"
                  >
                    {alert.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
            클릭하여 해당 항목 보기
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
