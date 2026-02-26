"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  Users,
  Globe,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  Phone,
} from "lucide-react";

interface SystemAlert {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  cohortId: string | null;
  phoneNumber: string | null;
  createdByName: string;
  createdAt: string;
}

interface Cohort {
  id: string;
  name: string;
}

interface AlertsClientProps {
  alerts: SystemAlert[];
  cohorts: Cohort[];
}

function getStatus(
  alert: SystemAlert,
): "active" | "scheduled" | "expired" | "inactive" {
  if (!alert.isActive) return "inactive";
  const now = new Date();
  const start = new Date(alert.startDate);
  const end = new Date(alert.endDate);
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}

function getDday(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return `D+${Math.abs(diff)}`;
  if (diff === 0) return "D-day";
  return `D-${diff}`;
}

function statusBadge(status: ReturnType<typeof getStatus>) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          게재중
        </Badge>
      );
    case "scheduled":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          게재예정
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300">
          종료
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">비활성</Badge>
      );
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "urgent":
      return (
        <Badge
          variant="outline"
          className="border-red-300 text-red-700 bg-red-50"
        >
          긴급
        </Badge>
      );
    case "warning":
      return (
        <Badge
          variant="outline"
          className="border-orange-300 text-orange-700 bg-orange-50"
        >
          경고
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-blue-300 text-blue-700 bg-blue-50"
        >
          안내
        </Badge>
      );
  }
}

export default function AlertsClient({
  alerts: initialAlerts,
  cohorts,
}: AlertsClientProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [loading, setLoading] = useState<string | null>(null);

  const cohortMap = Object.fromEntries(cohorts.map((c) => [c.id, c.name]));

  const handleToggle = async (item: SystemAlert) => {
    setLoading(item.id);
    try {
      const res = await fetch(`/api/admin/alerts/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === item.id ? { ...a, isActive: !a.isActive } : a,
          ),
        );
      } else {
        window.alert("수정 실패");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 팝업을 삭제하시겠습니까?`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/alerts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        window.alert("삭제 실패");
      }
    } finally {
      setLoading(null);
    }
  };

  const activeCount = alerts.filter((a) => getStatus(a) === "active").length;
  const scheduledCount = alerts.filter(
    (a) => getStatus(a) === "scheduled",
  ).length;

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          <p className="text-sm text-green-600 mt-1">게재중</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{scheduledCount}</p>
          <p className="text-sm text-blue-600 mt-1">게재예정</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">
            {alerts.filter((a) => getStatus(a) === "expired").length}
          </p>
          <p className="text-sm text-gray-500 mt-1">종료</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
          <p className="text-sm text-gray-500 mt-1">전체</p>
        </div>
      </div>

      {/* 팝업 목록 */}
      {alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>등록된 팝업이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const status = getStatus(alert);
            const isExpired = status === "expired";

            return (
              <div
                key={alert.id}
                className={`border rounded-xl p-4 sm:p-5 bg-white shadow-sm transition-opacity ${
                  isExpired ? "opacity-60" : ""
                }`}
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(status)}
                    {typeBadge(alert.type)}
                    <span className="font-semibold text-gray-900">
                      {alert.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(alert)}
                      disabled={loading === alert.id}
                      className={
                        alert.isActive
                          ? "border-red-200 text-red-600 hover:bg-red-50 text-xs"
                          : "border-green-200 text-green-600 hover:bg-green-50 text-xs"
                      }
                    >
                      {loading === alert.id ? (
                        <Clock className="w-3 h-3 animate-spin" />
                      ) : alert.isActive ? (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          비활성화
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          활성화
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(alert.id, alert.title)}
                      disabled={loading === alert.id}
                      className="border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 내용 */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {alert.content}
                </p>

                {/* 메타 정보 */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {/* 타겟 기수 */}
                  <div className="flex items-center gap-1">
                    {alert.cohortId ? (
                      <>
                        <Users className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-purple-700 font-medium">
                          {cohortMap[alert.cohortId] ?? alert.cohortId}
                        </span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span>전체 공개</span>
                      </>
                    )}
                  </div>

                  {/* 연락처 */}
                  {alert.phoneNumber && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{alert.phoneNumber}</span>
                    </div>
                  )}

                  {/* 게재 기간 */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {new Date(alert.startDate).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
                      {" ~ "}
                      {new Date(alert.endDate).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                    {!isExpired && (
                      <span
                        className={`ml-1 font-semibold ${
                          getDday(alert.endDate) === "D-day"
                            ? "text-red-600"
                            : getDday(alert.endDate).startsWith("D+")
                              ? "text-gray-400"
                              : "text-orange-600"
                        }`}
                      >
                        {getDday(alert.endDate)}
                      </span>
                    )}
                  </div>

                  {/* 우선순위 */}
                  <div className="flex items-center gap-1">
                    <span>우선순위 {alert.priority}</span>
                  </div>

                  {/* 등록자 */}
                  <div className="ml-auto text-gray-400">
                    {alert.createdByName} 등록 ·{" "}
                    {new Date(alert.createdAt).toLocaleDateString("ko-KR")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
