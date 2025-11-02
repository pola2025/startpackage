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
import { Package, Truck, Calendar, User, Maximize2, Minimize2, ChevronDown, ChevronRight, Users } from "lucide-react";
import WorkflowActions from "./workflow-actions";
import SubmissionViewButton from "./submission-view-button";
import UserWorkflowSMSButton from "./user-workflow-sms-button";
import UserShippingSMSButton from "./user-shipping-sms-button";
import UserOrderCompleteButton from "./user-order-complete-button";
import WorkflowFilters, { FilterState } from "./workflow-filters";
import WorkflowSort from "./workflow-sort";
import WorkflowViewToggle from "./workflow-view-toggle";
import WorkflowProgress from "./workflow-progress";
import UrgentAlertBanner from "./urgent-alert-banner";
import BulkActions from "./bulk-actions";
import { KanbanBoard, WorkflowStatus } from "@/app/components/workflows/kanban-board";
import { WorkflowStatusIcons } from "@/components/admin/workflow-status-icons";
import { AdAutomationBadge } from "@/components/admin/ad-automation-badge";

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
  workflowTypes
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
  const [viewMode, setViewMode] = useState<"user" | "status" | "kanban">("user");
  const [compactView, setCompactView] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());

  // 기수별/사용자별 접기/펼치기 상태
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; bg: string; label: string }> = {
      "대기": { color: "text-gray-800", bg: "bg-gray-50 border-gray-300", label: "대기" },
      // 로고 워크플로우 상태
      "시안제작중": { color: "text-blue-800", bg: "bg-blue-50 border-blue-300", label: "시안 제작 중" },
      "시안컨펌요청": { color: "text-orange-800", bg: "bg-orange-50 border-orange-300", label: "시안 컨펌 요청" },
      "최종확정": { color: "text-emerald-900", bg: "bg-emerald-50 border-emerald-300", label: "최종 확정" },
      // 인쇄물 워크플로우 상태
      "시안중": { color: "text-blue-800", bg: "bg-blue-50 border-blue-300", label: "시안 작업중" },
      "발주대기": { color: "text-orange-800", bg: "bg-orange-50 border-orange-300", label: "발주 대기" },
      "발주요청": { color: "text-yellow-800", bg: "bg-yellow-50 border-yellow-300", label: "발주 요청" },
      "발주완료": { color: "text-indigo-900", bg: "bg-indigo-50 border-indigo-300", label: "발주 완료" },
      "제작완료": { color: "text-green-800", bg: "bg-green-50 border-green-300", label: "제작 완료" },
      "발송완료": { color: "text-teal-800", bg: "bg-teal-50 border-teal-300", label: "발송 완료" },
    };
    return statusMap[status] || { color: "text-gray-800", bg: "bg-gray-50 border-gray-300", label: status };
  };

  // 긴급도 계산
  const calculateUrgency = (workflow: any): number => {
    let score = 0;
    const now = new Date();

    if (workflow.자료제출일) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(workflow.자료제출일).getTime()) / (1000 * 60 * 60 * 24)
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
      data.workflows.map((w: any) => ({ ...w, user: data.user }))
    );
  }, [workflowsByUser]);

  // useMemo로 필터링 및 정렬 최적화
  const filteredAndSortedData = useMemo(() => {
    // 1. 필터링
    let filtered = Object.entries(workflowsByUser).reduce((acc, [userId, data]) => {
      const filteredWorkflows = data.workflows.filter((w: any) => {
        // 상태 필터
        if (filters.status !== "all" && w.status !== filters.status) return false;

        // 타입 필터
        if (filters.type !== "all" && w.type !== filters.type) return false;

        // 코호트 필터
        if (filters.cohort !== "all" && data.user.cohortId !== filters.cohort) return false;

        // 피드백 필터
        if (filters.hasFeedback === true && !w.feedback) return false;

        // 지연 필터 (14일 이상 경과)
        if (filters.isDelayed === true) {
          const daysSince = w.자료제출일
            ? Math.floor(
                (new Date().getTime() - new Date(w.자료제출일).getTime()) / (1000 * 60 * 60 * 24)
              )
            : 0;
          if (daysSince < 14) return false;
        }

        // 검색 필터 (이름, 연락처)
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const nameMatch = data.user.이름?.toLowerCase().includes(searchLower);
          const phoneMatch = data.user.연락처?.includes(filters.search);
          if (!nameMatch && !phoneMatch) return false;
        }

        return true;
      });

      if (filteredWorkflows.length > 0) {
        acc[userId] = { ...data, workflows: filteredWorkflows };
      }
      return acc;
    }, {} as typeof workflowsByUser);

    // 2. 정렬
    Object.values(filtered).forEach((data) => {
      data.workflows.sort((a: any, b: any) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
      return `${baseClass} bg-yellow-50 hover:bg-yellow-100`;
    }

    // 피드백 있음 (확인 안된 것만)
    if (workflow.feedback && !workflow.feedbackRead) {
      return `${baseClass} border-l-4 border-l-orange-400 hover:bg-orange-50/50`;
    }

    return `${baseClass} hover:bg-blue-50/50`;
  };

  // 기수별 그룹화
  const groupedByCohort = useMemo(() => {
    const groups: Record<string, { cohort: any; userGroups: Record<string, { user: any; workflows: any[] }> }> = {};

    Object.entries(filteredAndSortedData).forEach(([userId, { user, workflows }]) => {
      const cohortId = user.cohortId || "미지정";
      const cohortName = user.cohort?.name || "미지정";

      if (!groups[cohortId]) {
        groups[cohortId] = {
          cohort: { id: cohortId, name: cohortName },
          userGroups: {},
        };
      }

      groups[cohortId].userGroups[userId] = { user, workflows };
    });

    return groups;
  }, [filteredAndSortedData]);

  // 상태별 뷰를 위한 데이터 그룹화
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, any[]> = {
      "대기": [],
      "시안중": [],
      "발주대기": [],
      "발주요청": [],
      "발주완료": [],
      "제작완료": [],
      "발송완료": [],
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

  // 긴급 알림 클릭 핸들러
  const handleAlertClick = (type: string) => {
    if (type === "발주요청") {
      setFilters({
        search: "",
        status: "발주요청",
        type: "all",
        cohort: "all",
        hasFeedback: undefined,
        isDelayed: undefined,
      });
    } else if (type === "피드백") {
      setFilters({
        search: "",
        status: "all",
        type: "all",
        cohort: "all",
        hasFeedback: true,
        isDelayed: undefined,
      });
    } else if (type === "지연") {
      setFilters({
        search: "",
        status: "all",
        type: "all",
        cohort: "all",
        hasFeedback: undefined,
        isDelayed: true,
      });
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
      // TODO: SMS 발송
      console.log("SMS 발송");
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
  const handleUpdateStatus = async (workflowId: string, newStatus: WorkflowStatus) => {
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

  // 워크플로우 테이블 렌더링
  const renderWorkflowTable = (workflows: any[], showUser = false) => (
    <Table>
      <TableHeader>
        <TableRow className="border-gray-200 hover:bg-gray-50">
          <TableHead className="w-12">
            <Checkbox
              checked={selectedWorkflows.size === allWorkflows.length && allWorkflows.length > 0}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {showUser && <TableHead className="text-gray-700 font-semibold">사용자</TableHead>}
          <TableHead className="text-gray-700 font-semibold">제작물</TableHead>
          <TableHead className="text-gray-700 font-semibold">상태</TableHead>
          {!compactView && <TableHead className="text-gray-700 font-semibold">진행률</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">수정횟수</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">피드백</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">자료제출일</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">시안업로드일</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">발주요청일</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">발주완료일</TableHead>}
          {!compactView && <TableHead className="text-gray-700 font-semibold">배송정보</TableHead>}
          <TableHead className="text-gray-700 font-semibold">작업</TableHead>
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
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{workflow.user?.이름}</div>
                      <div className="text-xs text-gray-500">{workflow.user?.연락처}</div>
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
                      수정횟수={workflow.수정횟수}
                      자료제출일={workflow.자료제출일}
                      createdAt={workflow.createdAt}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {workflow.수정횟수 > 2 ? (
                        <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
                          {workflow.수정횟수}회 (유료)
                        </Badge>
                      ) : workflow.수정횟수 === 2 ? (
                        <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                          {workflow.수정횟수}회 (최종)
                        </Badge>
                      ) : (
                        <span className="text-gray-600">{workflow.수정횟수}회</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm max-w-xs">
                    {workflow.feedback ? (
                      <div className="space-y-1">
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                          <p className="line-clamp-2 text-orange-900">{workflow.feedback}</p>
                        </div>
                        {workflow.feedbackDate && (
                          <p className="text-xs text-gray-500">
                            {new Date(workflow.feedbackDate).toLocaleString("ko-KR")}
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
                        {new Date(workflow.자료제출일).toLocaleDateString("ko-KR")}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {workflow.시안업로드일 ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(workflow.시안업로드일).toLocaleDateString("ko-KR")}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {workflow.발주요청일 ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(workflow.발주요청일).toLocaleDateString("ko-KR")}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {workflow.발주승인일 ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(workflow.발주승인일).toLocaleDateString("ko-KR")}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {workflow.택배회사 && workflow.운송장번호 ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-blue-600">
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
                  <WorkflowActions workflow={workflow} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <>
      {/* Urgent Alert Banner */}
      <UrgentAlertBanner workflows={allWorkflows} onAlertClick={handleAlertClick} />

      {/* Stats - 클릭 가능 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className="bg-white border-2 border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("대기")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-700">{stats.대기}</div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("시안중")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              시안 작업중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.시안중}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-orange-50 to-white border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("발주대기")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              발주 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.발주대기}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-purple-50 to-white border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("발주완료")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              제작중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats.제작중}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-green-50 to-white border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatClick("발송완료")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              발송 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {stats.발송완료}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="bg-white border-2 border-gray-200 shadow">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <WorkflowFilters
              onFilterChange={setFilters}
              cohorts={cohorts}
              workflowTypes={workflowTypes}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WorkflowViewToggle
                  currentView={viewMode}
                  onViewChange={setViewMode}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompactView(!compactView)}
                >
                  {compactView ? (
                    <>
                      <Maximize2 className="w-4 h-4 mr-2" />
                      상세 보기
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-4 h-4 mr-2" />
                      간단히 보기
                    </>
                  )}
                </Button>
              </div>
              <WorkflowSort
                currentSort={sortBy}
                onSortChange={setSortBy}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User-Grouped View - 기수별 → 사용자별 */}
      {viewMode === "user" && (
        <div className="space-y-6">
          {Object.entries(groupedByCohort).map(([cohortId, { cohort, userGroups }]) => {
            const isCohortExpanded = expandedCohorts.has(cohortId);
            const totalUsers = Object.keys(userGroups).length;
            const totalWorkflows = Object.values(userGroups).reduce((sum, { workflows }) => sum + workflows.length, 0);

            return (
              <div key={cohortId} className="space-y-3">
                {/* 기수별 헤더 */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
                  <CardHeader className="py-4">
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
                      <div className="flex items-center gap-3">
                        {isCohortExpanded ? (
                          <ChevronDown className="w-6 h-6 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-6 h-6 text-blue-600" />
                        )}
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                            {cohort.name}
                          </CardTitle>
                          <CardDescription className="text-gray-700 text-sm font-medium">
                            수강생 {totalUsers}명 · 워크플로우 {totalWorkflows}개
                          </CardDescription>
                        </div>
                      </div>
                    </button>
                  </CardHeader>
                </Card>

                {/* 사용자별 카드 */}
                {isCohortExpanded && (
                  <div className="ml-8 space-y-3">
                    {Object.entries(userGroups).map(([userId, { user, workflows: userWorkflows }]) => {
                      const isUserExpanded = expandedUsers.has(userId);

                      return (
                        <Card key={userId} className="bg-white border-2 border-gray-200 shadow-lg">
                          <CardHeader className="py-3">
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
                              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center gap-3">
                                {isUserExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-600" />
                                )}
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-left">
                                  <CardTitle className="text-lg text-gray-900">
                                    {user.이름}
                                  </CardTitle>
                                  <CardDescription className="text-gray-600 text-sm">
                                    워크플로우 {userWorkflows.length}개 · 연락처: {user.연락처 || "미등록"}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                <WorkflowStatusIcons workflows={userWorkflows} />
                                <AdAutomationBadge
                                  enabled={user.adAutomationEnabled || false}
                                  startDate={user.adAutomationStartDate}
                                  endDate={user.adAutomationEndDate}
                                  marketingSupportEndDate={user.marketingSupportEndDate}
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
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Status-Grouped View */}
      {viewMode === "status" && (
        <div className="space-y-4">
          {Object.entries(groupedByStatus).map(([status, workflows]) => {
            if (workflows.length === 0) return null;
            const statusInfo = getStatusBadge(status);

            return (
              <Card key={status} className="bg-white border-2 border-gray-200 shadow-lg">
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
        <Card className="bg-white border-2 border-gray-200 shadow-lg">
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
    </>
  );
}
