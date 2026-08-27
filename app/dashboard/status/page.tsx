"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusTimeline, TimelineEvent } from "@/components/ui/status-timeline";
import { SubmissionProgress } from "@/components/ui/submission-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Truck,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCcw,
  MessageSquare,
  Calendar,
  Palette,
  Globe,
  CreditCard,
  Tag,
  Mail,
  BookOpen,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatArrivalDate } from "@/lib/utils/businessDays";
import DesignConfirmDialog, {
  type DesignConfirmPayload,
} from "@/components/design/design-confirm-dialog";

interface Workflow {
  id: string;
  type: string;
  status: string;
  시안URL?: string;
  택배회사?: string;
  운송장번호?: string;
  자료제출일?: Date;
  시안업로드일?: Date;
  발주승인일?: Date;
  예상도착일?: string;
  제작완료일?: Date;
  발송일?: Date;
  feedback?: string;
  feedbackDate?: Date;
  수정횟수?: number;
  다운로드횟수?: number;
}

const REVISION_LIMIT = 2;
const DOWNLOAD_LIMIT = 100;

export default function StatusDashboardPage() {
  const { data: session } = useSession();

  const [submission, setSubmission] = useState<any>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    workflowId: string | null;
  }>({
    open: false,
    workflowId: null,
  });
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 로고 시안 승인도 시안 대화방과 같은 확정 게이트를 거친다
  const [approveTarget, setApproveTarget] = useState<{
    id: string;
    type: string;
  } | null>(null);
  const [approving, setApproving] = useState(false);

  const handleApprove = async (payload: DesignConfirmPayload) => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/workflows/${approveTarget.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping: payload.shipping,
          agreements: payload.agreements,
        }),
      });

      if (res.ok) {
        setApproveTarget(null);
        alert(`${approveTarget.type} 시안이 최종 확정되었습니다.`);
        fetchData();
      } else {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "확정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("확정 중 오류가 발생했습니다.");
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [submissionRes, workflowsRes] = await Promise.all([
        fetch("/api/submission"),
        fetch("/api/workflows"),
      ]);

      if (submissionRes.ok) {
        const data = await submissionRes.json();
        setSubmission(data);
      }

      if (workflowsRes.ok) {
        const data = await workflowsRes.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackModal.workflowId || !feedbackText.trim()) {
      alert("피드백 내용을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/workflows/${feedbackModal.workflowId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackText }),
        },
      );

      if (res.ok) {
        alert("피드백이 전송되었습니다!");
        setFeedbackModal({ open: false, workflowId: null });
        setFeedbackText("");
        fetchData(); // 데이터 새로고침
      } else {
        const error = await res.json();
        alert(error.error || "피드백 전송에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("피드백 전송 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const getWorkflowTimeline = (workflow: Workflow): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 로고 워크플로우는 별도 처리
    if (workflow.type === "로고") {
      // 자료 제출
      if (workflow.자료제출일) {
        events.push({
          id: "submitted",
          title: "로고 제작 요청",
          description: "로고 디자인 작업을 시작합니다",
          status: "completed",
          timestamp: new Date(workflow.자료제출일),
          icon: "file",
        });
      }

      // 시안 제작 중
      if (workflow.status === "시안제작중") {
        events.push({
          id: "design",
          title: "시안 제작 중",
          description: "로고 시안을 제작하고 있습니다",
          status: "current",
          icon: "clock",
        });
      }

      // 시안 컨펌 요청 (시안 완료)
      if (workflow.시안URL && workflow.status === "시안컨펌요청") {
        events.push({
          id: "design",
          title: "시안 컨펌 요청",
          description: "로고 시안을 확인하고 승인해주세요",
          status: "current",
          timestamp: workflow.시안업로드일
            ? new Date(workflow.시안업로드일)
            : undefined,
          icon: "alert",
        });
      } else if (workflow.시안URL && workflow.status === "최종확정") {
        events.push({
          id: "design",
          title: "시안 확인 완료",
          description: "로고 시안이 승인되었습니다",
          status: "completed",
          timestamp: workflow.시안업로드일
            ? new Date(workflow.시안업로드일)
            : undefined,
          icon: "check",
        });
      }

      // 최종 확정
      if (workflow.status === "최종확정") {
        events.push({
          id: "confirmed",
          title: "로고 최종 확정",
          description: "로고 디자인이 최종 확정되었습니다",
          status: "completed",
          icon: "check",
        });
      } else if (workflow.시안URL) {
        events.push({
          id: "confirmed",
          title: "최종 확정 대기",
          description: "시안 승인 후 최종 확정됩니다",
          status: "pending",
          icon: "package",
        });
      }

      return events;
    }

    // 인쇄물 워크플로우
    // 자료 제출
    if (workflow.자료제출일) {
      events.push({
        id: "submitted",
        title: "자료 제출 완료",
        description: "제출하신 자료를 확인 중입니다",
        status: "completed",
        timestamp: new Date(workflow.자료제출일),
        icon: "file",
      });
    }

    // 시안 업로드
    if (workflow.시안업로드일) {
      events.push({
        id: "design",
        title: "시안 완료",
        description: "시안을 확인하고 발주를 요청해주세요",
        status: workflow.발주승인일 ? "completed" : "current",
        timestamp: new Date(workflow.시안업로드일),
        icon: "check",
      });
    } else if (workflow.status === "시안중") {
      events.push({
        id: "design",
        title: "시안 작업 중",
        description: "디자인 시안이 영업일 기준 1-2일 내 완료됩니다",
        status: "current",
        icon: "clock",
      });
    }

    // 발주 승인
    if (workflow.발주승인일) {
      events.push({
        id: "order",
        title: "발주 완료",
        description: "인쇄소에 발주가 완료되었습니다",
        status: "completed",
        timestamp: new Date(workflow.발주승인일),
        icon: "package",
      });
    } else if (workflow.시안업로드일 && !workflow.발주승인일) {
      events.push({
        id: "order",
        title: "발주 대기",
        description: "시안 확인 후 발주를 진행해주세요",
        status: "warning",
        icon: "alert",
      });
    } else {
      events.push({
        id: "order",
        title: "발주 예정",
        description: "시안 완료 후 발주가 진행됩니다",
        status: "pending",
        icon: "package",
      });
    }

    // 제작 완료
    if (workflow.제작완료일) {
      events.push({
        id: "production",
        title: "제작 완료",
        description: "인쇄물 제작이 완료되었습니다",
        status: "completed",
        timestamp: new Date(workflow.제작완료일),
        icon: "check",
      });
    } else if (workflow.발주승인일) {
      const description = workflow.예상도착일
        ? `인쇄소에서 제작 진행 중입니다 (예상 도착일: ${formatArrivalDate(workflow.예상도착일)})`
        : "인쇄소에서 제작 진행 중입니다";
      events.push({
        id: "production",
        title: "제작 중",
        description,
        status: "current",
        icon: "clock",
      });
    } else {
      events.push({
        id: "production",
        title: "제작 예정",
        description: "발주 후 제작이 시작됩니다",
        status: "pending",
        icon: "package",
      });
    }

    // 발송
    if (workflow.발송일) {
      events.push({
        id: "shipped",
        title: "발송 완료",
        description: workflow.운송장번호
          ? `${workflow.택배회사} ${workflow.운송장번호}`
          : "발송이 완료되었습니다",
        status: "completed",
        timestamp: new Date(workflow.발송일),
        icon: "truck",
      });
    } else {
      events.push({
        id: "shipped",
        title: "발송 예정",
        description: "제작 완료 후 발송됩니다",
        status: "pending",
        icon: "truck",
      });
    }

    return events;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "대기":
        return "bg-navy-50 text-navy-300 border-navy-200";
      // 로고 워크플로우 상태
      case "시안제작중":
        return "bg-navy-50 text-navy-600 border-navy-200";
      case "시안컨펌요청":
        return "bg-terra-50 text-terra-500 border-terra-100";
      case "최종확정":
        return "bg-ok-50 text-ok-700 border-ok-100";
      // 인쇄물 워크플로우 상태
      case "시안중":
        return "bg-navy-50 text-navy-600 border-navy-200";
      case "발주대기":
        return "bg-terra-50 text-terra-500 border-terra-100";
      case "발주요청":
        return "bg-terra-50 text-terra-500 border-terra-100";
      case "발주완료":
        return "bg-ok-50 text-ok-700 border-ok-100";
      case "제작완료":
        return "bg-ok-50 text-ok-700 border-ok-100";
      case "발송완료":
        return "bg-ok-50 text-ok-700 border-ok-100";
      default:
        return "bg-navy-50 text-navy-300 border-navy-200";
    }
  };

  const getWorkflowIcon = (type: string) => {
    const iconClass = "w-7 h-7 sm:w-8 sm:h-8";
    const icons: Record<string, React.ReactNode> = {
      로고: <Palette className={`${iconClass} text-gold-600`} />,
      홈페이지: <Globe className={`${iconClass} text-navy-600`} />,
      명함: <CreditCard className={`${iconClass} text-navy-600`} />,
      명찰: <Tag className={`${iconClass} text-navy-600`} />,
      대봉투: <Mail className={`${iconClass} text-navy-600`} />,
      자문계약서: <FileText className={`${iconClass} text-navy-600`} />,
      "자문계약서 표지": <BookOpen className={`${iconClass} text-navy-600`} />,
      "자문계약서 내지": <FileText className={`${iconClass} text-navy-600`} />,
    };
    return icons[type] || <Package className={`${iconClass} text-gray-500`} />;
  };

  // 필수 항목 체크
  const requiredFields = [
    { label: "브랜드명", completed: !!submission?.브랜드명 },
    { label: "업종", completed: !!submission?.업종 },
    { label: "주소", completed: !!submission?.주소 },
    { label: "사업자등록증", completed: !!submission?.사업자등록증URL },
    { label: "프로필사진", completed: !!submission?.프로필사진URL },
    { label: "홈페이지 컬러컨셉", completed: !!submission?.홈페이지컬러컨셉 },
  ];

  const completedCount = requiredFields.filter((f) => f.completed).length;
  const progressPercentage = Math.round(
    (completedCount / requiredFields.length) * 100,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <RefreshCcw className="w-8 h-8 animate-spin text-gold-600 mx-auto" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              진행 상황
            </h1>
            <p className="text-sm text-gray-600">
              자료 제출 및 제작 진행 상황을 확인하세요
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="flex-shrink-0"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>

        {/* 전체 진행 상황 */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">전체 제출 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <SubmissionProgress
              percentage={progressPercentage}
              status={submission?.submissionStatus || "작성중"}
              requiredFields={requiredFields}
            />
          </CardContent>
        </Card>

        {/* 디자인 제작 현황 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">디자인 제작 현황</h2>

          {workflows.filter((w) => w.type === "로고" || w.type === "홈페이지")
            .length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="py-6">
                <div className="text-center space-y-3">
                  <Package className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    아직 디자인 제작이 시작되지 않았습니다
                  </p>
                  <p className="text-sm text-gray-500">
                    자료 제출이 완료되면 제작이 시작됩니다
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            workflows
              .filter((w) => w.type === "로고" || w.type === "홈페이지")
              .map((workflow) => (
                <Card key={workflow.id} className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
                          {getWorkflowIcon(workflow.type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {workflow.type}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            제작 진행 상황을 확인하세요
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "px-3 py-1 text-sm font-bold border",
                          getStatusColor(workflow.status),
                        )}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 시안 보기 & 피드백 버튼 */}
                    {workflow.시안URL && (
                      <div className="space-y-3">
                        <a
                          href={workflow.시안URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button
                            className="w-full h-9 md:h-10 bg-navy-900 hover:bg-navy-800 text-white font-semibold"
                            size="lg"
                          >
                            <FileCheck className="w-5 h-5 mr-2" />
                            시안 확인하기
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </a>

                        {/* 로고 승인 버튼 (시안컨펌요청 상태일 때만) */}
                        {workflow.type === "로고" &&
                          workflow.status === "시안컨펌요청" && (
                            <Button
                              className="w-full h-9 md:h-10 bg-ok-600 hover:bg-ok-700 text-white font-semibold"
                              size="lg"
                              onClick={() =>
                                setApproveTarget({
                                  id: workflow.id,
                                  type: workflow.type,
                                })
                              }
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              로고 시안 승인하기
                            </Button>
                          )}

                        {/* 피드백 버튼 (로고 최종확정 전, 홈페이지는 발주 전) */}
                        {((workflow.type === "로고" &&
                          workflow.status !== "최종확정") ||
                          (workflow.type === "홈페이지" &&
                            !workflow.발주승인일)) &&
                          (() => {
                            const revCount = workflow.수정횟수 ?? 0;
                            const limitReached = revCount >= REVISION_LIMIT;
                            return (
                              <div className="space-y-1.5">
                                <Button
                                  variant="outline"
                                  disabled={limitReached}
                                  className="w-full h-9 md:h-10 border border-terra-100 text-terra-500 hover:bg-terra-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  size="lg"
                                  onClick={() => {
                                    setFeedbackModal({
                                      open: true,
                                      workflowId: workflow.id,
                                    });
                                    setFeedbackText(workflow.feedback || "");
                                  }}
                                >
                                  <MessageSquare className="w-5 h-5 mr-2" />
                                  {limitReached
                                    ? `수정 한도 도달 (${revCount}/${REVISION_LIMIT}회)`
                                    : workflow.feedback
                                      ? `피드백 수정하기 (${revCount}/${REVISION_LIMIT}회 사용)`
                                      : `수정 요청하기 (${revCount}/${REVISION_LIMIT}회 사용)`}
                                </Button>
                                {limitReached && (
                                  <a
                                    href="/dashboard/communication"
                                    className="block text-xs text-center text-navy-700 underline hover:text-navy-900"
                                  >
                                    추가 수정이 필요하시면 관리자에게 변경
                                    요청하기 →
                                  </a>
                                )}
                              </div>
                            );
                          })()}

                        {/* 기존 피드백 표시 */}
                        {workflow.feedback && (
                          <div className="p-4 rounded-lg bg-terra-50 border border-terra-100">
                            <p className="text-sm font-semibold text-terra-600 mb-2">
                              제출한 피드백:
                            </p>
                            <p className="text-sm text-terra-600 whitespace-pre-wrap">
                              {workflow.feedback}
                            </p>
                            {workflow.feedbackDate && (
                              <p className="text-xs text-terra-500 mt-2">
                                {new Date(workflow.feedbackDate).toLocaleString(
                                  "ko-KR",
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 타임라인 */}
                    <StatusTimeline
                      events={getWorkflowTimeline(workflow)}
                      orientation="vertical"
                    />
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* 인쇄물 제작 현황 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">인쇄물 제작 현황</h2>

          {workflows.filter((w) => w.type !== "로고" && w.type !== "홈페이지")
            .length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="py-6">
                <div className="text-center space-y-3">
                  <Package className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    아직 인쇄물 제작이 시작되지 않았습니다
                  </p>
                  <p className="text-sm text-gray-500">
                    자료 제출이 완료되면 제작이 시작됩니다
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            workflows
              .filter((w) => w.type !== "로고" && w.type !== "홈페이지")
              .map((workflow) => (
                <Card key={workflow.id} className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
                          {getWorkflowIcon(workflow.type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {workflow.type}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            제작 진행 상황을 확인하세요
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "px-3 py-1 text-sm font-bold border",
                          getStatusColor(workflow.status),
                        )}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 시안 보기 & 피드백 버튼 */}
                    {workflow.시안URL && (
                      <div className="space-y-3">
                        <a
                          href={workflow.시안URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button
                            className="w-full h-9 md:h-10 bg-navy-900 hover:bg-navy-800 text-white font-semibold"
                            size="lg"
                          >
                            <FileCheck className="w-5 h-5 mr-2" />
                            시안 확인하기
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </a>

                        {/* 피드백 버튼 (발주 전에만 표시) */}
                        {!workflow.발주승인일 &&
                          (() => {
                            const revCount = workflow.수정횟수 ?? 0;
                            const limitReached = revCount >= REVISION_LIMIT;
                            return (
                              <div className="space-y-1.5">
                                <Button
                                  variant="outline"
                                  disabled={limitReached}
                                  className="w-full h-9 md:h-10 border border-terra-100 text-terra-500 hover:bg-terra-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  size="lg"
                                  onClick={() => {
                                    setFeedbackModal({
                                      open: true,
                                      workflowId: workflow.id,
                                    });
                                    setFeedbackText(workflow.feedback || "");
                                  }}
                                >
                                  <MessageSquare className="w-5 h-5 mr-2" />
                                  {limitReached
                                    ? `수정 한도 도달 (${revCount}/${REVISION_LIMIT}회)`
                                    : workflow.feedback
                                      ? `피드백 수정하기 (${revCount}/${REVISION_LIMIT}회 사용)`
                                      : `수정 요청하기 (${revCount}/${REVISION_LIMIT}회 사용)`}
                                </Button>
                                {limitReached && (
                                  <a
                                    href="/dashboard/communication"
                                    className="block text-xs text-center text-navy-700 underline hover:text-navy-900"
                                  >
                                    추가 수정이 필요하시면 관리자에게 변경
                                    요청하기 →
                                  </a>
                                )}
                              </div>
                            );
                          })()}

                        {/* 기존 피드백 표시 */}
                        {workflow.feedback && (
                          <div className="p-4 rounded-lg bg-terra-50 border border-terra-100">
                            <p className="text-sm font-semibold text-terra-600 mb-2">
                              제출한 피드백:
                            </p>
                            <p className="text-sm text-terra-600 whitespace-pre-wrap">
                              {workflow.feedback}
                            </p>
                            {workflow.feedbackDate && (
                              <p className="text-xs text-terra-500 mt-2">
                                {new Date(workflow.feedbackDate).toLocaleString(
                                  "ko-KR",
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 타임라인 */}
                    <StatusTimeline
                      events={getWorkflowTimeline(workflow)}
                      orientation="vertical"
                    />

                    {/* 택배 추적 */}
                    {workflow.운송장번호 && (
                      <div className="p-4 rounded-xl bg-white border border-gray-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Truck className="w-6 h-6 text-navy-600 flex-shrink-0 mt-1" />
                            <div>
                              <p className="font-semibold text-navy-900">
                                배송 정보
                              </p>
                              <p className="text-sm text-navy-700 mt-1">
                                {workflow.택배회사}
                              </p>
                              <p className="text-sm text-navy-700 font-mono">
                                {workflow.운송장번호}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0 border-navy-200 text-navy-700 hover:bg-navy-50"
                            onClick={() => {
                              // 택배 추적 링크로 이동 (실제로는 택배사별 링크 생성)
                              window.open(
                                `https://www.doortodoor.co.kr/parcel/doortodoor.do?fsp_action=PARC_ACT_002&fsp_cmd=retrieveInvNoACT&invc_no=${workflow.운송장번호}`,
                                "_blank",
                              );
                            }}
                          >
                            배송 조회
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* 도움말 */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-navy-900 py-2">
            <AlertCircle className="w-4 h-4" />
            안내사항
            <span className="ml-auto text-xs text-gray-400 group-open:rotate-90 transition-transform">
              ▶
            </span>
          </summary>
          <Card className="border border-gray-200 bg-white mt-2">
            <CardContent className="space-y-2 text-sm text-navy-800 pt-4">
              <p>• 시안은 영업일 기준 1-2일 내에 완료됩니다</p>
              <p>• 시안 확인 후 발주를 진행해주세요</p>
              <p>• 발주 후에는 정보 변경이 불가능합니다</p>
              <p>• 제작 기간은 인쇄물 종류에 따라 다릅니다</p>
              <p className="pt-2 border-t border-gold-200 font-semibold">
                문의사항이 있으시면 관리자에게 연락해주세요
              </p>
            </CardContent>
          </Card>
        </details>
      </div>

      {/* 피드백 모달 */}
      {feedbackModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">시안 피드백</h3>
              <button
                onClick={() => {
                  setFeedbackModal({ open: false, workflowId: null });
                  setFeedbackText("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600">
              수정이 필요한 부분을 상세하게 작성해주세요. 피드백은 관리자에게
              즉시 전달됩니다.
            </p>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="예: 로고 색상을 파란색으로 변경해주세요"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-terra-500"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFeedbackModal({ open: false, workflowId: null });
                  setFeedbackText("");
                }}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-terra-500 hover:bg-terra-600"
                onClick={handleFeedbackSubmit}
                disabled={submitting || !feedbackText.trim()}
              >
                {submitting ? "전송 중..." : "피드백 전송"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 시안 확정 3단계 게이트 (시안 대화방과 같은 컴포넌트) */}
      {approveTarget && (
        <DesignConfirmDialog
          open={!!approveTarget}
          onOpenChange={(open) => {
            if (!open) setApproveTarget(null);
          }}
          workflowType={approveTarget.type}
          confirming={approving}
          onConfirm={handleApprove}
        />
      )}
    </div>
  );
}
