"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { FileText, Clock } from "lucide-react";

interface PendingWorkflow {
  id: string;
  type: string;
  designUrl: string;
  updatedAt: string;
  adminName: string | null;
}

interface DesignConfirmationModalProps {
  /** 모달 표시 여부 (선택적, 자동으로 관리됨) */
  isOpen?: boolean;
  /** 모달 닫기 콜백 */
  onClose?: () => void;
}

/**
 * 시안 확인 자동 모달
 *
 * - 로그인 시 자동으로 컨펌 대기 중인 시안 확인
 * - 홈페이지 제작 완료는 이 모달에 포함하지 않음
 * - 24시간 숨김 기능
 * - 순차적으로 시안 표시 (하나씩)
 */
export function DesignConfirmationModal({
  isOpen: controlledIsOpen,
  onClose,
}: DesignConfirmationModalProps = {}) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] =
    useState<PendingWorkflow | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [hideFor24Hours, setHideFor24Hours] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 컨펌 대기 시안 조회
  const fetchPendingWorkflows = async () => {
    try {
      const response = await fetch("/api/workflows/pending-confirmation");
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.workflows.length > 0) {
        setCurrentWorkflow(data.workflows[0]); // 첫 번째 시안
        setRemainingCount(data.workflows.length - 1); // 나머지 개수
        setIsOpen(true);
      }
    } catch (error) {
      console.error("시안 조회 실패:", error);
    }
  };

  // 컴포넌트 마운트 시 자동 조회
  useEffect(() => {
    if (controlledIsOpen === undefined) {
      fetchPendingWorkflows();
    }
  }, [controlledIsOpen]);

  // controlled 모드
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  // 시안 확인하기 버튼
  const handleConfirmDesign = () => {
    if (!currentWorkflow) return;

    // 제작현황 페이지로 이동하고 해당 워크플로우 다이얼로그 자동 오픈
    router.push(`/dashboard/workflows?open=${currentWorkflow.id}`);
    handleClose();
  };

  // 24시간 숨김 처리
  const handleDismiss = async () => {
    if (!currentWorkflow) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/workflows/dismiss-modal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: currentWorkflow.id }),
      });

      if (!response.ok) {
        throw new Error("숨김 처리 실패");
      }

      handleClose();
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
      setCurrentWorkflow(null);
      setRemainingCount(0);
      setHideFor24Hours(false);
      onClose?.();
    }
  };

  // 업로드 시간 표시
  const getUploadedTime = (updatedAt: string) => {
    const now = new Date();
    const uploaded = new Date(updatedAt);
    const diffInMinutes = Math.floor(
      (now.getTime() - uploaded.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <DialogTitle>시안이 도착했습니다!</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            {currentWorkflow && (
              <div className="space-y-3">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {currentWorkflow.type}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {getUploadedTime(currentWorkflow.updatedAt)}
                    </div>
                  </div>

                  {currentWorkflow.adminName && (
                    <p className="text-sm text-muted-foreground">
                      담당자: {currentWorkflow.adminName}
                    </p>
                  )}
                </div>

                {remainingCount > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    외 {remainingCount}개의 시안이 더 있습니다.
                  </p>
                )}

                <p className="text-foreground">
                  디자이너가 업로드한 시안을 확인하고 의견을 남겨주세요.
                </p>
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
              오늘 하루 보지 않기
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
              나중에 보기
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDesign}
              disabled={isLoading}
              className="flex-1"
            >
              시안 확인하기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
