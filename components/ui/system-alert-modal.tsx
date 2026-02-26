"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Info,
  AlertTriangle,
  Phone,
  Copy,
  Check,
} from "lucide-react";

interface SystemAlert {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  priority: number;
  cohortId: string | null;
  phoneNumber: string | null;
  endDate: string;
}

interface SystemAlertModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SystemAlertModal({
  isOpen: controlledIsOpen,
  onClose,
}: SystemAlertModalProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SystemAlert | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [hideFor24Hours, setHideFor24Hours] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch("/api/alerts/active");
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.alerts.length > 0) {
        setCurrentAlert(data.alerts[0]);
        setRemainingCount(data.alerts.length - 1);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("알림 조회 실패:", error);
    }
  };

  useEffect(() => {
    if (controlledIsOpen === undefined) fetchActiveAlerts();
  }, [controlledIsOpen]);

  useEffect(() => {
    if (controlledIsOpen !== undefined) setIsOpen(controlledIsOpen);
  }, [controlledIsOpen]);

  const handleDismiss = async () => {
    if (!currentAlert) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/alerts/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: currentAlert.id }),
      });
      if (!response.ok) throw new Error("숨김 처리 실패");
      if (remainingCount > 0) {
        fetchActiveAlerts();
      } else {
        handleClose();
      }
    } catch (error) {
      console.error("모달 숨김 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (hideFor24Hours) {
      handleDismiss();
    } else {
      setIsOpen(false);
      setCurrentAlert(null);
      setRemainingCount(0);
      setHideFor24Hours(false);
      onClose?.();
    }
  };

  const handleConfirm = () => {
    if (hideFor24Hours) {
      handleDismiss();
    } else {
      if (remainingCount > 0) {
        fetchActiveAlerts();
      } else {
        handleClose();
      }
    }
  };

  const handleCopyPhone = async (phone: string) => {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // D-day 계산
  const getDday = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff <= 0) return "D-day";
    return `D-${diff}`;
  };

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

  // 기수 전용 알림 여부
  const isCohortAlert = !!currentAlert?.cohortId;

  if (!currentAlert) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-[460px] gap-0">
        {/* ── 기수 전용: 상단 컬러 헤더 ── */}
        {isCohortAlert ? (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              {getIcon(currentAlert.type)}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium">
                기수 전용 안내
              </p>
              <DialogTitle className="text-white font-bold text-lg leading-tight">
                {currentAlert.title}
              </DialogTitle>
            </div>
          </div>
        ) : (
          /* ── 일반 알림: 기존 헤더 ── */
          <DialogHeader className="px-6 pt-6 pb-0">
            <div className="flex items-center gap-2">
              {currentAlert.type === "urgent" && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {currentAlert.type === "warning" && (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              {currentAlert.type === "info" && (
                <Info className="h-5 w-5 text-blue-600" />
              )}
              <DialogTitle>{currentAlert.title}</DialogTitle>
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
                  {currentAlert.content}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-medium px-3 py-1 rounded-full">
                  <span className="font-bold">
                    {getDday(currentAlert.endDate)}
                  </span>
                </div>
              </div>
            )}

            {/* 일반 알림 내용 */}
            {!isCohortAlert && (
              <div
                className={`p-4 rounded-lg border text-sm whitespace-pre-wrap ${
                  currentAlert.type === "urgent"
                    ? "bg-red-50 border-red-200 text-red-900"
                    : currentAlert.type === "warning"
                      ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                      : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                {currentAlert.content}
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
            {currentAlert.phoneNumber && (
              <div className="space-y-1.5">
                <p className="text-sm text-gray-600">
                  문의사항은 담당자에게 연락해 주세요.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${currentAlert.phoneNumber.replace(/-/g, "")}`}
                    className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 hover:bg-orange-50 hover:border-orange-300 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-orange-600 tracking-wide">
                      {currentAlert.phoneNumber}
                    </span>
                  </a>
                  <button
                    onClick={() => handleCopyPhone(currentAlert.phoneNumber!)}
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

            {remainingCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                외 {remainingCount}개의 알림이 더 있습니다.
              </p>
            )}

            {/* 24시간 숨김 */}
            <div className="border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  id="hide-24h"
                  checked={hideFor24Hours}
                  onCheckedChange={(checked) =>
                    setHideFor24Hours(checked as boolean)
                  }
                />
                <Label
                  htmlFor="hide-24h"
                  className="text-sm text-gray-500 cursor-pointer font-normal"
                >
                  24시간 동안 보지 않기
                </Label>
              </label>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="px-6 pb-5 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            닫기
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 ${isCohortAlert ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0" : ""}`}
          >
            {remainingCount > 0 ? "다음 알림 보기" : "확인했습니다"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
