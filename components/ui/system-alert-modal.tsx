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
import { AlertCircle, Info, AlertTriangle } from "lucide-react";

interface SystemAlert {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  priority: number;
}

interface SystemAlertModalProps {
  /** 모달 표시 여부 (선택적, 자동으로 관리됨) */
  isOpen?: boolean;
  /** 모달 닫기 콜백 */
  onClose?: () => void;
}

/**
 * 시스템 알림 자동 모달
 *
 * - 로그인 시 자동으로 활성 알림 확인
 * - 24시간 숨김 기능
 * - 순차적으로 알림 표시 (하나씩)
 * - 우선순위 높은 순서대로 표시
 */
export function SystemAlertModal({
  isOpen: controlledIsOpen,
  onClose,
}: SystemAlertModalProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SystemAlert | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [hideFor24Hours, setHideFor24Hours] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 활성 알림 조회
  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch("/api/alerts/active");
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.alerts.length > 0) {
        setCurrentAlert(data.alerts[0]); // 첫 번째 알림 (우선순위 높은 것)
        setRemainingCount(data.alerts.length - 1); // 나머지 개수
        setIsOpen(true);
      }
    } catch (error) {
      console.error("알림 조회 실패:", error);
    }
  };

  // 컴포넌트 마운트 시 자동 조회
  useEffect(() => {
    if (controlledIsOpen === undefined) {
      fetchActiveAlerts();
    }
  }, [controlledIsOpen]);

  // controlled 모드
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  // 24시간 숨김 처리
  const handleDismiss = async () => {
    if (!currentAlert) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/alerts/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: currentAlert.id }),
      });

      if (!response.ok) {
        throw new Error("숨김 처리 실패");
      }

      // 다음 알림이 있으면 표시
      if (remainingCount > 0) {
        fetchActiveAlerts();
      } else {
        handleClose();
      }
    } catch (error) {
      console.error("모달 숨김 실패:", error);
      alert("숨김 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 닫기
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

  // 확인 버튼
  const handleConfirm = () => {
    if (hideFor24Hours) {
      handleDismiss();
    } else {
      // 다음 알림이 있으면 표시
      if (remainingCount > 0) {
        fetchActiveAlerts();
      } else {
        handleClose();
      }
    }
  };

  // 아이콘 선택
  const getIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "info":
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  // 배경 색상 선택
  const getBgColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-50";
      case "warning":
        return "bg-yellow-50";
      case "info":
      default:
        return "bg-blue-50";
    }
  };

  // 테두리 색상 선택
  const getBorderColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "border-red-200";
      case "warning":
        return "border-yellow-200";
      case "info":
      default:
        return "border-blue-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {currentAlert && getIcon(currentAlert.type)}
            <DialogTitle>{currentAlert?.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            {currentAlert && (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-lg space-y-2 border ${getBgColor(currentAlert.type)} ${getBorderColor(currentAlert.type)}`}
                >
                  <div className="text-foreground whitespace-pre-wrap">
                    {currentAlert.content}
                  </div>
                </div>

                {remainingCount > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    외 {remainingCount}개의 알림이 더 있습니다.
                  </p>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="hide-24h"
              checked={hideFor24Hours}
              onCheckedChange={(checked) =>
                setHideFor24Hours(checked as boolean)
              }
            />
            <Label
              htmlFor="hide-24h"
              className="text-muted-foreground cursor-pointer"
            >
              24시간 동안 보지 않기
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              닫기
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1"
            >
              {remainingCount > 0 ? "다음 알림 보기" : "확인"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
