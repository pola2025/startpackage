"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Eye,
  AlertCircle,
  AlertTriangle,
  Info,
  Copy,
  Check,
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
        <Badge className="bg-gold-100 text-gold-700 border-gold-300">
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
          className="border-gold-300 text-gold-700 bg-gold-50"
        >
          안내
        </Badge>
      );
  }
}

// ─── 팝업 미리보기 모달 (유저 화면과 동일한 UI) ───────────────────────────
function AlertPreviewModal({
  alert,
  onClose,
}: {
  alert: SystemAlert;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isCohortAlert = !!alert.cohortId;

  const getIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertCircle className="h-5 w-5 text-white" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-white" />;
      default:
        return <Info className="h-5 w-5 text-white" />;
    }
  };

  const handleCopy = async (phone: string) => {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-[460px] gap-0">
        {/* 관리자 미리보기 배너 */}
        <div className="bg-gray-800 text-white text-xs text-center py-1.5 font-medium tracking-wide">
          👁 관리자 미리보기 — 실제 유저에게 보이는 화면
        </div>

        {/* ── 기수 전용: 오렌지 헤더 ── */}
        {isCohortAlert ? (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              {getIcon(alert.type)}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium">
                기수 전용 안내
              </p>
              <DialogTitle className="text-white font-bold text-lg leading-tight">
                {alert.title}
              </DialogTitle>
            </div>
          </div>
        ) : (
          <DialogHeader className="px-6 pt-6 pb-0">
            <div className="flex items-center gap-2">
              {alert.type === "urgent" && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {alert.type === "warning" && (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              {alert.type === "info" && (
                <Info className="h-5 w-5 text-gold-600" />
              )}
              <DialogTitle>{alert.title}</DialogTitle>
            </div>
          </DialogHeader>
        )}

        <DialogDescription asChild>
          <div className="px-6 py-5 space-y-4">
            {/* 마감일 강조 박스 (기수 전용) */}
            {isCohortAlert && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-500 text-xs font-semibold mb-1">
                  📅 자료제출 마감일
                </p>
                <p className="text-red-700 text-2xl font-bold tracking-tight">
                  {alert.content}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-medium px-3 py-1 rounded-full">
                  <span className="font-bold">{getDday(alert.endDate)}</span>
                </div>
              </div>
            )}

            {/* 일반 알림 내용 */}
            {!isCohortAlert && (
              <div
                className={`p-4 rounded-lg border text-sm whitespace-pre-wrap ${
                  alert.type === "urgent"
                    ? "bg-red-50 border-red-200 text-red-900"
                    : alert.type === "warning"
                      ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                      : "bg-gold-50 border-gold-200 text-navy-900"
                }`}
              >
                {alert.content}
              </div>
            )}

            {/* 기수 전용 안내 문구 */}
            {isCohortAlert && (
              <div className="space-y-2.5">
                {[
                  "마감일 이후에는 인쇄물 및 홈페이지 제작이 불가능합니다.",
                  "마감일 이전에 자료제출 페이지에서 모든 정보를 입력해 주세요.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 text-[10px] font-bold">
                        !
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 전화번호 */}
            {alert.phoneNumber && (
              <div className="space-y-1.5">
                <p className="text-sm text-gray-600">
                  문의사항은 담당자에게 연락해 주세요.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${alert.phoneNumber.replace(/-/g, "")}`}
                    className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 hover:bg-orange-50 hover:border-orange-300 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-orange-600 tracking-wide">
                      {alert.phoneNumber}
                    </span>
                  </a>
                  <button
                    onClick={() => handleCopy(alert.phoneNumber!)}
                    className={`flex items-center gap-1 px-3 py-2.5 text-xs font-medium border rounded-lg transition-colors ${
                      copied
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? "복사됨" : "복사"}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  📱 모바일에서 번호 터치 시 바로 전화 연결
                </p>
              </div>
            )}

            {/* 24시간 숨김 UI (미리보기용 - 비활성) */}
            <div className="border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2.5 cursor-not-allowed opacity-50">
                <input type="checkbox" disabled className="rounded" />
                <span className="text-sm text-gray-500 font-normal">
                  24시간 동안 보지 않기
                </span>
              </label>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="px-6 pb-5 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            닫기
          </Button>
          <Button
            onClick={onClose}
            className={`flex-1 ${isCohortAlert ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0" : ""}`}
          >
            확인했습니다
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function AlertsClient({
  alerts: initialAlerts,
  cohorts,
}: AlertsClientProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [loading, setLoading] = useState<string | null>(null);
  const [previewAlert, setPreviewAlert] = useState<SystemAlert | null>(null);

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
      {/* 미리보기 모달 */}
      {previewAlert && (
        <AlertPreviewModal
          alert={previewAlert}
          onClose={() => setPreviewAlert(null)}
        />
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          <p className="text-sm text-green-600 mt-1">게재중</p>
        </div>
        <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gold-700">{scheduledCount}</p>
          <p className="text-sm text-gold-600 mt-1">게재예정</p>
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
                    {/* 미리보기 버튼 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewAlert(alert)}
                      className="border-purple-200 text-purple-600 hover:bg-purple-50 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      미리보기
                    </Button>
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
                  {alert.phoneNumber && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{alert.phoneNumber}</span>
                    </div>
                  )}
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
                  <div className="flex items-center gap-1">
                    <span>우선순위 {alert.priority}</span>
                  </div>
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
