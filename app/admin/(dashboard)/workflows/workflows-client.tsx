"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Package,
  Truck,
  Calendar,
  User,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import WorkflowActions from "./workflow-actions";
import SubmissionViewButton from "./submission-view-button";
import DesignThreadButton from "./design-thread-button";
import UserWorkflowSMSButton from "./user-workflow-sms-button";
import UserShippingSMSButton from "./user-shipping-sms-button";
import UserOrderCompleteButton from "./user-order-complete-button";
import WorkflowFilters, { FilterState } from "./workflow-filters";
import WorkflowSort from "./workflow-sort";
import WorkflowViewToggle from "./workflow-view-toggle";
import WorkflowProgress from "./workflow-progress";
import UrgentAlertBanner from "./urgent-alert-banner";
import BulkActions from "./bulk-actions";
import DesignSMSModal from "./design-sms-modal";
import UrgentAlertModal from "./urgent-alert-modal";
import {
  KanbanBoard,
  WorkflowStatus,
} from "@/app/components/workflows/kanban-board";
import { WorkflowStatusIcons } from "@/components/admin/workflow-status-icons";
import { AdAutomationBadge } from "@/components/admin/ad-automation-badge";
import { SmsSettingBadge } from "@/components/admin/sms-setting-badge";
import { NaverAdSettingBadge } from "@/components/admin/naver-ad-setting-badge";
import { HomepageBadge } from "@/components/admin/homepage-badge";

interface WorkflowsClientProps {
  workflowsByUser: Record<string, { user: any; workflows: any[] }>;
  stats: {
    대기: number;
    시안중: number;
    발주대기: number;
    제작중: number;
    발송완료: number;
  };
  cohorts: { id: string; name: string }[];
  workflowTypes: string[];
}

export default function WorkflowsClient({
  workflowsByUser,
  stats,
  cohorts,
  workflowTypes,
}: WorkflowsClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    type: "all",
    cohort: "all",
    hasFeedback: undefined,
    isDelayed: undefined,
  });
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"user" | "status" | "kanban">(
    "user",
  );
  const [compactView, setCompactView] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(
    new Set(),
  );
  const [showDesignSMSModal, setShowDesignSMSModal] = useState(false);
  const [urgentAlertType, setUrgentAlertType] = useState<
    "발주요청" | "피드백" | "지연" | null
  >(null);

  // 기수별/사용자별 접기/펼치기 상태
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(
    new Set(),
  );
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { color: string; bg: string; label: string }
    > = {
      대기: {
        color: "text-navy-300",
        bg: "bg-navy-50 border-navy-200",
        label: "대기",
      },
      // 로고 워크플로우 상태
      시안제작중: {
        color: "text-navy-600",
        bg: "bg-navy-50 border-navy-200",
        label: "시안 제작 중",
      },
      시안컨펌요청: {
        color: "text-terra-500",
        bg: "bg-terra-50 border-terra-100",
        label: "시안 컨펌 요청",
      },
      최종확정: {
        color: "text-ok-700",
        bg: "bg-ok-50 border-ok-100",
        label: "최종 확정",
      },
      // 인쇄물 워크플로우 상태
      시안중: {
        color: "text-navy-600",
        bg: "bg-navy-50 border-navy-200",
        label: "시안 작업중",
      },
      발주대기: {
        color: "text-terra-500",
        bg: "bg-terra-50 border-terra-100",
        label: "발주 대기",
      },
      발주요청: {
        color: "text-terra-500",
        bg: "bg-terra-50 border-terra-100",
        label: "발주 요청",
      },
      발주완료: {
        color: "text-ok-700",
        bg: "bg-ok-50 border-ok-100",
        label: "발주 완료",
      },
      제작완료: {
        color: "text-ok-700",
        bg: "bg-ok-50 border-ok-100",
        label: "제작 완료",
      },
      발송완료: {
        color: "text-ok-700",
        bg: "bg-ok-50 border-ok-100",
        label: "발송 완료",
      },
    };
    return (
      statusMap[status] || {
        color: "text-gray-800",
        bg: "bg-gray-50 border-gray-300",
        label: status,
      }
    );
  };

  // 긴급도 계산
  const calculateUrgency = (workflow: any): number => {
    let score = 0;
    const now = new Date();

    if (workflow.자료제출일) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(workflow.자료제출일).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      score += daysSince * 2;
    }

    score += workflow.수정횟수 * 10;

    if (workflow.status === "발주요청") score += 50;
    if (workflow.feedback && !workflow.feedbackRead) score += 20;

    return score;
  };

  // 전체 워크플로우 배열 생성
  const allWorkflows = useMemo(() => {
    return Object.values(workflowsByUser).flatMap((data) =>
      data.workflows.map((w: any) => ({ ...w, user: data.user })),
    );
  }, [workflowsByUser]);

  // useMemo로 필터링 및 정렬 최적화
  const filteredAndSortedData = useMemo(() => {
    // 1. 필터링
    let filtered = Object.entries(workflowsByUser).reduce(
      (acc, [userId, data]) => {
        const filteredWorkflows = data.workflows.filter((w: any) => {
          // 상태 필터
          if (filters.status !== "all" && w.status !== filters.status)
            return false;

          // 타입 필터
          if (filters.type !== "all" && w.type !== filters.type) return false;

          // 코호트 필터
          if (filters.cohort !== "all" && data.user.cohortId !== filters.cohort)
            return false;

          // 피드백 필터
          if (filters.hasFeedback === true && !w.feedback) return false;

          // 지연 필터 (14일 이상 경과)
          if (filters.isDelayed === true) {
            const daysSince = w.자료제출일
              ? Math.floor(
                  (new Date().getTime() - new Date(w.자료제출일).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;
            if (daysSince < 14) return false;
          }

          // 검색 필터 (이름, 연락처)
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const nameMatch = data.user.이름
              ?.toLowerCase()
              .includes(searchLower);
            const phoneMatch = data.user.연락처?.includes(filters.search);
            if (!nameMatch && !phoneMatch) return false;
          }

          return true;
        });

        if (filteredWorkflows.length > 0) {
          acc[userId] = { ...data, workflows: filteredWorkflows };
        }
        return acc;
      },
      {} as typeof workflowsByUser,
    );

    // 2. 정렬
    Object.values(filtered).forEach((data) => {
      data.workflows.sort((a: any, b: any) => {
        switch (sortBy) {
          case "newest":
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          case "oldest":
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          case "urgent":
            return calculateUrgency(b) - calculateUrgency(a);
          case "status":
            return a.status.localeCompare(b.status);
          case "modifications":
            return b.수정횟수 - a.수정횟수;
          default:
            return 0;
        }
      });
    });

    return filtered;
  }, [workflowsByUser, filters, sortBy]);

  // 행 배경색 결정
  const getRowClassName = (workflow: any) => {
    const baseClass = "border-gray-200 transition-colors";

    // 발주 요청 (최우선)
    if (workflow.status === "발주요청") {
      return `${baseClass} bg-terra-50 hover:bg-terra-50/80`;
    }

    // 피드백 있음 (확인 안된 것만)
    if (workflow.feedback && !workflow.feedbackRead) {
      return `${baseClass} border-l-4 border-l-terra-500 hover:bg-terra-50/50`;
    }

    return `${baseClass} hover:bg-gold-50/50`;
  };

  // 기수별 그룹화
  const groupedByCohort = useMemo(() => {
    const groups: Record<
      string,
      {
        cohort: any;
        userGroups: Record<string, { user: any; workflows: any[] }>;
      }
    > = {};

    Object.entries(filteredAndSortedData).forEach(
      ([userId, { user, workflows }]) => {
        const cohortId = user.cohortId || "미지정";
        const cohortName = user.cohort?.name || "미지정";

        if (!groups[cohortId]) {
          groups[cohortId] = {
            cohort: { id: cohortId, name: cohortName },
            userGroups: {},
          };
        }

        groups[cohortId].userGroups[userId] = { user, workflows };
      },
    );

    return groups;
  }, [filteredAndSortedData]);

  // 상태별 뷰를 위한 데이터 그룹화
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, any[]> = {
      대기: [],
      시안중: [],
      발주대기: [],
      발주요청: [],
      발주완료: [],
      제작완료: [],
      발송완료: [],
    };

    Object.values(filteredAndSortedData).forEach((data) => {
      data.workflows.forEach((workflow: any) => {
        if (groups[workflow.status]) {
          groups[workflow.status].push({ ...workflow, user: data.user });
        }
      });
    });

    return groups;
  }, [filteredAndSortedData]);

  // 통계 카드 클릭 핸들러
  const handleStatClick = (status: string) => {
    setFilters({ ...filters, status });
  };

  // 긴급 알림 클릭 핸들러 - 모달로 표시
  const handleAlertClick = (type: string) => {
    if (type === "발주요청" || type === "피드백" || type === "지연") {
      setUrgentAlertType(type as "발주요청" | "피드백" | "지연");
    }
  };

  // 체크박스 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(allWorkflows.map((w) => w.id));
      setSelectedWorkflows(allIds);
    } else {
      setSelectedWorkflows(new Set());
    }
  };

  const handleSelectWorkflow = (workflowId: string, checked: boolean) => {
    const newSelected = new Set(selectedWorkflows);
    if (checked) {
      newSelected.add(workflowId);
    } else {
      newSelected.delete(workflowId);
    }
    setSelectedWorkflows(newSelected);
  };

  // 대량 작업 핸들러
  const handleBulkAction = async (action: string) => {
    console.log("대량 작업:", action, "선택된 항목:", selectedWorkflows.size);

    if (action.startsWith("status:")) {
      const newStatus = action.replace("status:", "");
      // TODO: API 호출하여 상태 변경
      console.log("상태 변경:", newStatus);
    } else if (action === "sms") {
      // SMS 발송 모달 열기
      setShowDesignSMSModal(true);
      return; // 선택 해제하지 않음
    } else if (action === "export") {
      // TODO: 엑셀 다운로드
      console.log("엑셀 다운로드");
    } else if (action === "delete") {
      // TODO: 삭제
      console.log("삭제");
    }

    // 선택 해제
    setSelectedWorkflows(new Set());
  };

  // 칸반 보드 상태 업데이트 핸들러
  const handleUpdateStatus = async (
    workflowId: string,
    newStatus: WorkflowStatus,
  ) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("상태 업데이트 실패");
      }

      // 페이지 새로고침으로 데이터 갱신
      window.location.reload();
    } catch (error) {
      console.error("상태 업데이트 오류:", error);
      alert("상태 업데이트에 실패했습니다.");
    }
  };

  // 워크플로우 모바일 카드 렌더링
  const renderWorkflowMobileCards = (workflows: any[], showUser = false) => (
    <div className="space-y-3">
      {workflows.map((workflow) => {
        const statusInfo = getStatusBadge(workflow.status);
        const isSelected = selectedWorkflows.has(workflow.id);

        return (
          <div
            key={workflow.id}
            className={`p-3 rounded-lg border ${
              workflow.status === "발주요청"
                ? "bg-terra-50 border-terra-100"
                : workflow.feedback && !workflow.feedbackRead
                  ? "bg-terra-50 border-terra-100"
                  : "bg-white border-gray-200"
            }`}
          >
            {/* Header: 체크박스 + 제작물 + 상태 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    handleSelectWorkflow(workflow.id, checked as boolean)
                  }
                />
                <Badge
                  variant="outline"
                  className="border-gray-300 text-gray-700 bg-gray-50 text-xs"
                >
                  <Package className="w-3 h-3 mr-1" />
                  {workflow.type}
                </Badge>
              </div>
              <Badge
                variant="outline"
                className={`${statusInfo.bg} ${statusInfo.color} text-xs`}
              >
                {statusInfo.label}
              </Badge>
            </div>

            {/* 사용자 정보 (showUser일 때) */}
            {showUser && workflow.user && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center">
                  <User className="w-3 h-3 text-gold-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {workflow.user?.이름}
                </span>
                <span className="text-xs text-gray-500">
                  {workflow.user?.연락처}
                </span>
              </div>
            )}

            {/* 주요 정보 */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <span className="text-gray-500">수정횟수: </span>
                {workflow.수정횟수 > 2 ? (
                  <span className="text-red-600 font-medium">
                    {workflow.수정횟수}회 (유료)
                  </span>
                ) : workflow.수정횟수 === 2 ? (
                  <span className="text-amber-600 font-medium">
                    {workflow.수정횟수}회 (최종)
                  </span>
                ) : (
                  <span className="text-gray-700">{workflow.수정횟수}회</span>
                )}
              </div>
              {workflow.자료제출일 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-3 h-3" />
                  {new Date(workflow.자료제출일).toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>

            {/* 피드백 (있을 때만) */}
            {workflow.feedback && (
              <div className="p-2 bg-terra-50 border border-terra-100 rounded text-xs mb-2">
                <p className="line-clamp-2 text-terra-600">
                  {workflow.feedback}
                </p>
              </div>
            )}

            {/* 배송정보 (있을 때만) */}
            {workflow.택배회사 && workflow.운송장번호 && (
              <div className="flex items-center gap-2 text-xs text-gold-600 mb-2">
                <Truck className="w-3 h-3" />
                <span>{workflow.택배회사}</span>
                <span className="text-gray-500">{workflow.운송장번호}</span>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <SubmissionViewButton workflow={workflow} />
              <DesignThreadButton
                workflowId={workflow.id}
                status={workflow.status}
                type={workflow.type}
              />
              <WorkflowActions workflow={workflow} />
            </div>
          </div>
        );
      })}
    </div>
  );

  // 워크플로우 테이블 렌더링 (데스크탑)
  const renderWorkflowTable = (workflows: any[], showUser = false) => (
    <>
      {/* 모바일: 카드 레이아웃 */}
      <div className="lg:hidden">
        {renderWorkflowMobileCards(workflows, showUser)}
      </div>

      {/* 데스크탑: 테이블 레이아웃 */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 hover:bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedWorkflows.size === allWorkflows.length &&
                    allWorkflows.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {showUser && (
                <TableHead className="text-gray-700 font-semibold">
                  사용자
                </TableHead>
              )}
              <TableHead className="text-gray-700 font-semibold">
                제작물
              </TableHead>
              <TableHead className="text-gray-700 font-semibold">
                상태
              </TableHead>
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  진행률
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  수정횟수
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  피드백
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  자료제출일
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  시안업로드일
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  발주요청일
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  발주완료일
                </TableHead>
              )}
              {!compactView && (
                <TableHead className="text-gray-700 font-semibold">
                  배송정보
                </TableHead>
              )}
              <TableHead className="text-gray-700 font-semibold">
                작업
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => {
              const statusInfo = getStatusBadge(workflow.status);

              return (
                <TableRow
                  key={workflow.id}
                  className={getRowClassName(workflow)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedWorkflows.has(workflow.id)}
                      onCheckedChange={(checked) =>
                        handleSelectWorkflow(workflow.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  {showUser && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gold-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {workflow.user?.이름}
                          </div>
                          <div className="text-xs text-gray-500">
                            {workflow.user?.연락처}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-gray-300 text-gray-700 bg-gray-50"
                    >
                      <Package className="w-3 h-3 mr-1" />
                      {workflow.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusInfo.bg} ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  {!compactView && (
                    <>
                      <TableCell>
                        <WorkflowProgress
                          status={workflow.status}
                          type={workflow.type}
                          수정횟수={workflow.수정횟수}
                          자료제출일={workflow.자료제출일}
                          createdAt={workflow.createdAt}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {workflow.수정횟수 > 2 ? (
                            <Badge
                              variant="outline"
                              className="bg-terra-50 border-terra-100 text-terra-600"
                            >
                              {workflow.수정횟수}회 (유료)
                            </Badge>
                          ) : workflow.수정횟수 === 2 ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 border-amber-300 text-amber-700"
                            >
                              {workflow.수정횟수}회 (최종)
                            </Badge>
                          ) : (
                            <span className="text-gray-600">
                              {workflow.수정횟수}회
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm max-w-xs">
                        {workflow.feedback ? (
                          <div className="space-y-1">
                            <div className="p-2 bg-terra-50 border border-terra-100 rounded text-xs">
                              <p className="line-clamp-2 text-terra-600">
                                {workflow.feedback}
                              </p>
                            </div>
                            {workflow.feedbackDate && (
                              <p className="text-xs text-gray-500">
                                {new Date(workflow.feedbackDate).toLocaleString(
                                  "ko-KR",
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {workflow.자료제출일 ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(workflow.자료제출일).toLocaleDateString(
                              "ko-KR",
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {workflow.시안업로드일 ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(workflow.시안업로드일).toLocaleDateString(
                              "ko-KR",
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {workflow.발주요청일 ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(workflow.발주요청일).toLocaleDateString(
                              "ko-KR",
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {workflow.발주승인일 ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(workflow.발주승인일).toLocaleDateString(
                              "ko-KR",
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {workflow.택배회사 && workflow.운송장번호 ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gold-600">
                              <Truck className="w-3 h-3" />
                              {workflow.택배회사}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {workflow.운송장번호}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex gap-2">
                      <SubmissionViewButton workflow={workflow} />
                      <DesignThreadButton
                        workflowId={workflow.id}
                        status={workflow.status}
                        type={workflow.type}
                      />
                      <WorkflowActions workflow={workflow} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );

  return (
    <>
      {/* Urgent Alert Banner */}
      <UrgentAlertBanner
        workflows={allWorkflows}
        onAlertClick={handleAlertClick}
      />

      {/* Stats - 클릭 가능 */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-3 md:grid-cols-5">
        <Card
          className="bg-white border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("대기")}
        >
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              대기
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-700">
              {stats.대기}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("시안중")}
        >
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              <span className="hidden sm:inline">시안 작업중</span>
              <span className="sm:hidden">시안중</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gold-600">
              {stats.시안중}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("발주대기")}
        >
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              <span className="hidden sm:inline">발주 대기</span>
              <span className="sm:hidden">발주대기</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-terra-500">
              {stats.발주대기}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("발주완료")}
        >
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              제작중
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-terra-500">
              {stats.제작중}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("발송완료")}
        >
          <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              <span className="hidden sm:inline">발송 완료</span>
              <span className="sm:hidden">완료</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-ok-700">
              {stats.발송완료}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="bg-white border border-gray-200 shadow">
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <WorkflowFilters
              onFilterChange={setFilters}
              cohorts={cohorts}
              workflowTypes={workflowTypes}
            />
            {/* 모바일: 세로 스택 / 데스크탑: 가로 배치 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <WorkflowViewToggle
                  currentView={viewMode}
                  onViewChange={setViewMode}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompactView(!compactView)}
                  className="whitespace-nowrap text-xs sm:text-sm"
                >
                  {compactView ? (
                    <>
                      <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">상세 보기</span>
                      <span className="sm:hidden">상세</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">간단히 보기</span>
                      <span className="sm:hidden">간단</span>
                    </>
                  )}
                </Button>
              </div>
              <WorkflowSort currentSort={sortBy} onSortChange={setSortBy} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User-Grouped View - 기수별 → 사용자별 */}
      {viewMode === "user" && (
        <div className="space-y-6">
          {Object.entries(groupedByCohort).map(
            ([cohortId, { cohort, userGroups }]) => {
              const isCohortExpanded = expandedCohorts.has(cohortId);
              const totalUsers = Object.keys(userGroups).length;
              const totalWorkflows = Object.values(userGroups).reduce(
                (sum, { workflows }) => sum + workflows.length,
                0,
              );

              return (
                <div key={cohortId} className="space-y-3">
                  {/* 기수별 헤더 */}
                  <Card className="bg-white border border-gray-200 shadow-md">
                    <CardHeader className="py-3 sm:py-4 px-3 sm:px-6">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedCohorts);
                          if (isCohortExpanded) {
                            newExpanded.delete(cohortId);
                          } else {
                            newExpanded.add(cohortId);
                          }
                          setExpandedCohorts(newExpanded);
                        }}
                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          {isCohortExpanded ? (
                            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gold-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gold-600 flex-shrink-0" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-base sm:text-xl text-gray-900 flex items-center gap-2">
                              {cohort.name}
                            </CardTitle>
                            <CardDescription className="text-gray-700 text-xs sm:text-sm font-medium">
                              {totalUsers}명 · {totalWorkflows}개
                            </CardDescription>
                          </div>
                        </div>
                      </button>
                    </CardHeader>
                  </Card>

                  {/* 사용자별 카드 */}
                  {isCohortExpanded && (
                    <div className="ml-2 sm:ml-8 space-y-3">
                      {Object.entries(userGroups).map(
                        ([userId, { user, workflows: userWorkflows }]) => {
                          const isUserExpanded = expandedUsers.has(userId);

                          return (
                            <Card
                              key={userId}
                              className="bg-white border border-gray-200 shadow-lg"
                            >
                              <CardHeader className="py-3 px-3 sm:px-6">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedUsers);
                                    if (isUserExpanded) {
                                      newExpanded.delete(userId);
                                    } else {
                                      newExpanded.add(userId);
                                    }
                                    setExpandedUsers(newExpanded);
                                  }}
                                  className="w-full hover:opacity-80 transition-opacity"
                                >
                                  {/* 모바일: 세로 레이아웃 */}
                                  <div className="lg:hidden space-y-2">
                                    <div className="flex items-center gap-2">
                                      {isUserExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                      )}
                                      <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-gold-600" />
                                      </div>
                                      <div className="text-left min-w-0 flex-1">
                                        <CardTitle className="text-base text-gray-900 truncate">
                                          {user.이름}
                                        </CardTitle>
                                        <CardDescription className="text-gray-600 text-xs truncate">
                                          {userWorkflows.length}개 ·{" "}
                                          {user.연락처 || "미등록"}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    {/* 모바일 뱃지/버튼 그룹 */}
                                    <div
                                      className="flex flex-wrap items-center gap-1 pl-6"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <WorkflowStatusIcons
                                        workflows={userWorkflows}
                                        homepageCompleted={
                                          user.homepageCompleted || false
                                        }
                                      />
                                      <AdAutomationBadge
                                        enabled={
                                          user.adAutomationEnabled || false
                                        }
                                        startDate={user.adAutomationStartDate}
                                        endDate={user.adAutomationEndDate}
                                        marketingSupportEndDate={
                                          user.marketingSupportEndDate
                                        }
                                      />
                                      <SmsSettingBadge
                                        enabled={
                                          user.smsSettingEnabled || false
                                        }
                                      />
                                      <NaverAdSettingBadge
                                        enabled={
                                          user.naverAdSettingEnabled || false
                                        }
                                      />
                                      <UserWorkflowSMSButton
                                        userId={userId}
                                        userName={user.이름}
                                        userPhone={user.연락처}
                                        workflows={userWorkflows}
                                      />
                                      <UserOrderCompleteButton
                                        userId={userId}
                                        userName={user.이름}
                                        userPhone={user.연락처}
                                        userEmail={user.email}
                                        workflows={userWorkflows}
                                      />
                                      <UserShippingSMSButton
                                        userId={userId}
                                        userName={user.이름}
                                        userPhone={user.연락처}
                                        workflows={userWorkflows}
                                      />
                                    </div>
                                  </div>

                                  {/* 데스크탑: 가로 레이아웃 */}
                                  <div className="hidden lg:grid grid-cols-[1fr_auto] gap-4 items-center">
                                    <div className="flex items-center gap-3">
                                      {isUserExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                      )}
                                      <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
                                        <User className="w-5 h-5 text-gold-600" />
                                      </div>
                                      <div className="text-left">
                                        <CardTitle className="text-lg text-gray-900">
                                          {user.이름}
                                        </CardTitle>
                                        <CardDescription className="text-gray-600 text-sm">
                                          워크플로우 {userWorkflows.length}개 ·
                                          연락처: {user.연락처 || "미등록"}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <div
                                      className="flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <WorkflowStatusIcons
                                        workflows={userWorkflows}
                                        homepageCompleted={
                                          user.homepageCompleted || false
                                        }
                                      />
                                      <AdAutomationBadge
                                        enabled={
                                          user.adAutomationEnabled || false
                                        }
                                        startDate={user.adAutomationStartDate}
                                        endDate={user.adAutomationEndDate}
                                        marketingSupportEndDate={
                                          user.marketingSupportEndDate
                                        }
                                      />
                                      <SmsSettingBadge
                                        enabled={
                                          user.smsSettingEnabled || false
                                        }
                                      />
                                      <NaverAdSettingBadge
                                        enabled={
                                          user.naverAdSettingEnabled || false
                                        }
                                      />
                                      <UserWorkflowSMSButton
                                        userId={userId}
                                        userName={user.이름}
                                        userPhone={user.연락처}
                                        workflows={userWorkflows}
                                      />
                                      <UserOrderCompleteButton
                                        userId={userId}
                                        userName={user.이름}
                                        userPhone={user.연락처}
                                        userEmail={user.email}
                                        workflows={userWorkflows}
                                      />
                                      <UserShippingSMSButton
                                        userId={userId}
                                        userName={user.이름}
                                        userPhone={user.연락처}
                                        workflows={userWorkflows}
                                      />
                                    </div>
                                  </div>
                                </button>
                              </CardHeader>

                              {/* 워크플로우 상세 테이블 */}
                              {isUserExpanded && (
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    {renderWorkflowTable(userWorkflows, false)}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Status-Grouped View */}
      {viewMode === "status" && (
        <div className="space-y-4">
          {Object.entries(groupedByStatus).map(([status, workflows]) => {
            if (workflows.length === 0) return null;
            const statusInfo = getStatusBadge(status);

            return (
              <Card
                key={status}
                className="bg-white border border-gray-200 shadow-lg"
              >
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${statusInfo.bg} ${statusInfo.color} text-base px-3 py-1`}
                    >
                      {statusInfo.label}
                    </Badge>
                    <span className="text-gray-500 text-sm font-normal">
                      {workflows.length}개
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {renderWorkflowTable(workflows, true)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === "kanban" && (
        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardContent className="p-0">
            <KanbanBoard
              workflows={allWorkflows}
              onUpdateStatus={handleUpdateStatus}
            />
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedWorkflows.size}
        onClearSelection={() => setSelectedWorkflows(new Set())}
        onBulkAction={handleBulkAction}
      />

      {/* 시안 SMS 발송 모달 */}
      <DesignSMSModal
        open={showDesignSMSModal}
        onClose={() => {
          setShowDesignSMSModal(false);
          setSelectedWorkflows(new Set());
        }}
        workflows={allWorkflows.filter((w) => selectedWorkflows.has(w.id))}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* 긴급 알림 모달 */}
      <UrgentAlertModal
        open={urgentAlertType !== null}
        onClose={() => setUrgentAlertType(null)}
        alertType={urgentAlertType}
        workflows={allWorkflows}
        onRefresh={() => window.location.reload()}
      />
    </>
  );
}
