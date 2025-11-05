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
      color: "bg-yellow-50 border-yellow-300 text-yellow-800",
    },
    {
      type: "피드백",
      count: workflows.filter((w) => w.feedback && !w.feedbackRead).length,
      label: "피드백 확인 필요",
      color: "bg-orange-50 border-orange-300 text-orange-800",
    },
    {
      type: "지연",
      count: workflows.filter((w) => {
        // 완료 상태(최종확정 또는 발송완료)는 제외
        if (!w.자료제출일 || w.status === "최종확정" || w.status === "발송완료") return false;
        const daysSince = Math.floor(
          (now.getTime() - new Date(w.자료제출일).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return daysSince > 14;
      }).length,
      label: "14일 이상 경과",
      color: "bg-red-50 border-red-300 text-red-800",
    },
  ];

  const urgentAlerts = alerts.filter((alert) => alert.count > 0);

  if (urgentAlerts.length === 0) return null;

  return (
    <Alert className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-2 border-orange-300">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertDescription className="ml-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-900">긴급 알림</span>
            <div className="flex items-center gap-2">
              {urgentAlerts.map((alert, index) => (
                <Button
                  key={alert.type}
                  variant="outline"
                  size="sm"
                  onClick={() => onAlertClick(alert.type)}
                  className={`${alert.color} hover:opacity-80 transition-all`}
                >
                  {alert.type === "발주요청" && (
                    <AlertTriangle className="w-4 h-4 mr-1" />
                  )}
                  {alert.type === "피드백" && (
                    <MessageSquare className="w-4 h-4 mr-1" />
                  )}
                  {alert.type === "지연" && <Clock className="w-4 h-4 mr-1" />}
                  <span className="font-medium">{alert.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-white text-gray-900"
                  >
                    {alert.count}
                  </Badge>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              ))}
            </div>
          </div>
          <span className="text-sm text-gray-600">
            클릭하여 해당 항목 보기
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
