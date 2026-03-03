"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  User,
  Package,
  CheckCircle,
  Loader2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Workflow {
  id: string;
  type: string;
  status: string;
  feedback?: string | null;
  feedbackRead?: boolean;
  feedbackDate?: string | null;
  자료제출일?: string | null;
  user: {
    id: string;
    이름: string;
    연락처?: string | null;
    cohort?: { name: string } | null;
  };
}

type AlertType = "발주요청" | "피드백" | "지연";

interface UrgentAlertModalProps {
  open: boolean;
  onClose: () => void;
  alertType: AlertType | null;
  workflows: Workflow[];
  onRefresh: () => void;
}

export default function UrgentAlertModal({
  open,
  onClose,
  alertType,
  workflows,
  onRefresh,
}: UrgentAlertModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [markedAsRead, setMarkedAsRead] = useState<Set<string>>(new Set());

  // 알림 타입별 워크플로우 필터링
  const filteredWorkflows = workflows.filter((w) => {
    if (alertType === "발주요청") {
      return w.status === "발주요청";
    }
    if (alertType === "피드백") {
      return w.feedback && !w.feedbackRead && !markedAsRead.has(w.id);
    }
    if (alertType === "지연") {
      if (!w.자료제출일 || w.status === "최종확정" || w.status === "발송완료")
        return false;
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(w.자료제출일).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return daysSince > 14;
    }
    return false;
  });

  // 피드백 확인 처리
  const handleMarkFeedbackRead = async (workflowId: string) => {
    setLoading(workflowId);
    try {
      const response = await fetch("/api/admin/workflows/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          feedbackRead: true,
        }),
      });

      if (response.ok) {
        setMarkedAsRead((prev) => new Set(prev).add(workflowId));
      }
    } catch (error) {
      console.error("피드백 확인 처리 실패:", error);
    } finally {
      setLoading(null);
    }
  };

  // 발주 승인 처리
  const handleApproveOrder = async (workflowId: string) => {
    setLoading(workflowId);
    try {
      const response = await fetch("/api/admin/workflows/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          status: "발주완료",
        }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("발주 승인 실패:", error);
    } finally {
      setLoading(null);
    }
  };

  // 경과 일수 계산
  const getDaysSince = (date: string) => {
    return Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  // 알림 타입별 설정
  const alertConfig = {
    발주요청: {
      title: "발주 요청 대기",
      description:
        "고객이 발주를 요청한 워크플로우입니다. 확인 후 승인해주세요.",
      icon: AlertTriangle,
      color: "text-terra-500",
      bgColor: "bg-terra-50",
      borderColor: "border-terra-100",
    },
    피드백: {
      title: "피드백 확인 필요",
      description: "고객이 남긴 피드백을 확인하고 처리해주세요.",
      icon: MessageSquare,
      color: "text-terra-500",
      bgColor: "bg-terra-50",
      borderColor: "border-terra-100",
    },
    지연: {
      title: "14일 이상 경과",
      description:
        "자료 제출 후 14일 이상 경과된 워크플로우입니다. 진행 상황을 확인해주세요.",
      icon: Clock,
      color: "text-terra-600",
      bgColor: "bg-terra-50",
      borderColor: "border-terra-100",
    },
  };

  const config = alertType ? alertConfig[alertType] : null;
  const Icon = config?.icon || AlertTriangle;

  const handleClose = () => {
    setMarkedAsRead(new Set());
    onClose();
    if (markedAsRead.size > 0) {
      onRefresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${config?.color}`}>
            <Icon className="w-5 h-5" />
            {config?.title}
            <Badge variant="secondary" className="ml-2">
              {filteredWorkflows.length}건
            </Badge>
          </DialogTitle>
          <DialogDescription>{config?.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mb-3 text-ok-500" />
              <p className="text-lg font-medium">모두 처리되었습니다!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`border-2 rounded-lg p-4 ${config?.bgColor} ${config?.borderColor}`}
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {workflow.user.이름}
                        </div>
                        <div className="text-xs text-gray-500">
                          {workflow.user.cohort?.name || "미지정"} ·{" "}
                          {workflow.user.연락처 || "연락처 없음"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-gray-700">
                      <Package className="w-3 h-3 mr-1" />
                      {workflow.type}
                    </Badge>
                  </div>

                  {/* 피드백 내용 (피드백 알림인 경우) */}
                  {alertType === "피드백" && workflow.feedback && (
                    <div className="mb-3 p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-terra-500" />
                        <span className="text-sm font-medium text-gray-700">
                          고객 피드백
                        </span>
                        {workflow.feedbackDate && (
                          <span className="text-xs text-gray-400">
                            {new Date(workflow.feedbackDate).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {workflow.feedback}
                      </p>
                    </div>
                  )}

                  {/* 지연 정보 (지연 알림인 경우) */}
                  {alertType === "지연" && workflow.자료제출일 && (
                    <div className="mb-3 p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">자료제출일:</span>
                          <span className="font-medium">
                            {new Date(workflow.자료제출일).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </div>
                        <Badge variant="destructive">
                          {getDaysSince(workflow.자료제출일)}일 경과
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        현재 상태:{" "}
                        <Badge variant="outline">{workflow.status}</Badge>
                      </div>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex items-center justify-end gap-2">
                    {alertType === "발주요청" && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveOrder(workflow.id)}
                        disabled={loading === workflow.id}
                        className="bg-ok-600 hover:bg-ok-700"
                      >
                        {loading === workflow.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        발주 승인
                      </Button>
                    )}

                    {alertType === "피드백" && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkFeedbackRead(workflow.id)}
                        disabled={loading === workflow.id}
                        className="bg-terra-500 hover:bg-terra-600"
                      >
                        {loading === workflow.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        확인 완료
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // 시안관리 페이지로 이동
                        window.open(
                          `/admin/communication?userId=${workflow.user.id}`,
                          "_blank",
                        );
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      상세보기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
