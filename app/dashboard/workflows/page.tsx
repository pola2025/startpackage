"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Clock, CheckCircle2, FileText, AlertTriangle, Truck, Calendar, Info, Palette } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { formatArrivalDate } from "@/lib/utils/businessDays";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Workflow {
  id: string;
  type: string;
  status: string;
  시안URL?: string | null;
  시안업로드일?: Date | null;
  발주요청일?: Date | null;
  발주승인일?: Date | null;
  예상도착일?: string | null;
  제작완료일?: Date | null;
  발송일?: Date | null;
  택배회사?: string | null;
  운송장번호?: string | null;
  수정횟수: number;
  feedback?: string | null;
  feedbackDate?: Date | null;
}

export default function WorkflowsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [orderConfirmChecked, setOrderConfirmChecked] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // URL 파라미터로 특정 워크플로우 다이얼로그 자동 오픈
  useEffect(() => {
    const openWorkflowId = searchParams.get("open");
    if (openWorkflowId && workflows.length > 0) {
      const workflow = workflows.find((w) => w.id === openWorkflowId);
      if (workflow) {
        setSelectedWorkflow(workflow);
        setDialogOpen(true);
        // URL 파라미터 제거 (깔끔하게)
        router.replace("/dashboard/workflows", { scroll: false });
      }
    }
  }, [searchParams, workflows, router]);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    }
  };

  const handleOrderRequest = async (workflowId: string) => {
    if (!orderConfirmChecked) {
      alert("발주 요청 전 주의사항을 확인하고 체크박스에 동의해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/order`, {
        method: "POST",
      });

      if (res.ok) {
        alert("발주 요청이 완료되었습니다!");
        setOrderConfirmChecked(false); // 체크박스 초기화
        setDialogOpen(false);
        await fetchWorkflows();
      } else {
        alert("발주 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Order request failed:", error);
      alert("발주 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (workflowId: string) => {
    if (!feedbackText.trim()) {
      alert("피드백 내용을 입력해주세요");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText }),
      });

      if (res.ok) {
        alert("피드백이 저장되었습니다!");
        setFeedbackText("");
        await fetchWorkflows();
      } else {
        const error = await res.json();
        alert(error.error || "피드백 저장에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("피드백 저장 중 오류가 발생했습니다");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusBadge = (status: string, workflowType?: string) => {
    // 홈페이지 타입의 경우 "시안중" 상태를 "제작 진행 중"으로 매핑
    let displayStatus = status;
    if (workflowType === "홈페이지" && status === "시안중") {
      displayStatus = "제작 진행 중";
    }

    const statusMap: Record<string, { variant: any; color: string; label: string }> = {
      "대기": { variant: "secondary", color: "text-gray-500", label: "대기" },
      // 로고 워크플로우 상태
      "시안제작중": { variant: "outline", color: "text-navy-700 border-gold-300 bg-gold-50", label: "시안 제작 중" },
      "시안컨펌요청": { variant: "outline", color: "text-orange-700 border-orange-300 bg-orange-50", label: "시안 컨펌 요청" },
      "최종확정": { variant: "outline", color: "text-emerald-800 border-emerald-300 bg-emerald-50", label: "최종 확정" },
      // 홈페이지 워크플로우 상태
      "제작 진행 중": { variant: "outline", color: "text-navy-700 border-gold-300 bg-gold-50", label: "제작 진행 중" },
      "제작 완료": { variant: "outline", color: "text-green-800 border-green-300 bg-green-50", label: "제작 완료" },
      // 인쇄물 워크플로우 상태
      "시안중": { variant: "outline", color: "text-navy-700 border-gold-300 bg-gold-50", label: "시안 작업 중" },
      "발주대기": { variant: "outline", color: "text-orange-700 border-orange-300 bg-orange-50", label: "발주 대기 (확인 필요!)" },
      "발주요청": { variant: "outline", color: "text-yellow-700 border-yellow-300 bg-yellow-50", label: "발주 요청" },
      "발주완료": { variant: "outline", color: "text-green-800 border-green-300 bg-green-50", label: "발주 완료" },
      "제작완료": { variant: "outline", color: "text-green-800 border-green-300 bg-green-50", label: "제작 완료" },
      "발송완료": { variant: "outline", color: "text-teal-800 border-teal-300 bg-teal-50", label: "발송 완료" },
    };

    const config = statusMap[displayStatus] || statusMap["대기"];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string, workflowType?: string) => {
    // 홈페이지 타입의 경우 "시안중" 상태를 "제작 진행 중"으로 매핑
    let displayStatus = status;
    if (workflowType === "홈페이지" && status === "시안중") {
      displayStatus = "제작 진행 중";
    }

    switch (displayStatus) {
      case "대기":
        return <Clock className="w-5 h-5 text-gray-400" />;
      // 로고 워크플로우
      case "시안제작중":
        return <FileText className="w-5 h-5 text-gold-600" />;
      case "시안컨펌요청":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "최종확정":
        return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
      // 홈페이지 워크플로우
      case "제작 진행 중":
        return <FileText className="w-5 h-5 text-gold-600" />;
      case "제작 완료":
        return <CheckCircle2 className="w-5 h-5 text-green-700" />;
      // 인쇄물 워크플로우
      case "시안중":
        return <FileText className="w-5 h-5 text-gold-600" />;
      case "발주대기":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "발주완료":
      case "제작완료":
        return <Package className="w-5 h-5 text-green-700" />;
      case "발송완료":
        return <Truck className="w-5 h-5 text-green-700" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">제작 현황</h1>
        <p className="text-gray-600">
          인쇄물 및 홈페이지 제작 진행 상황을 확인하세요
        </p>
      </div>

      {/* 인쇄물 배송 안내 */}
      <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg">
        <Truck className="h-5 w-5 text-orange-700" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="text-orange-900 font-bold text-base">📦 인쇄물 배송 안내</p>
            <div className="bg-white border border-orange-200 rounded-lg p-3">
              <p className="text-gray-800 text-sm leading-relaxed">
                인쇄물(명함, 대봉투, 계약서)은 <span className="font-bold text-orange-700">각각의 제작 일정에 따라 개별 배송</span>됩니다.<br />
                합배송되지 않으니 참고해 주세요.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* 제작 소요 기간 안내 */}
      <Alert className="bg-gradient-to-r from-gold-50 to-gold-100 border-2 border-gold-300 shadow-lg">
        <Info className="h-5 w-5 text-navy-700" />
        <AlertDescription>
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-1 md:space-y-2">
              <p className="text-navy-900 font-bold text-sm md:text-base">
                📦 제품별 제작 소요 기간<br className="md:hidden" />
                <span className="text-navy-700 font-medium text-xs md:text-sm">(영업일 기준)</span>
              </p>
              <div className="inline-block bg-orange-100 border border-orange-400 md:border-2 px-2 py-1 md:px-4 md:py-2 rounded-lg">
                <p className="text-orange-900 font-bold text-xs md:text-sm">⚠️ 발주요청 후 제작기간입니다</p>
              </div>
            </div>
            {/* 모바일: 세로 컴팩트, 데스크탑: 가로 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
              {/* 명함/명찰 */}
              <div className="flex items-center justify-between p-2.5 md:p-4 bg-white border border-gold-200 md:border-2 rounded-lg shadow-sm md:shadow-md md:flex-col md:items-start">
                <div className="flex items-center gap-2 md:gap-3 md:mb-2">
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 md:w-5 md:h-5 text-gold-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xs md:text-lg whitespace-nowrap">명함 / 명찰</h3>
                </div>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className="text-lg md:text-3xl font-bold text-navy-700">2~3일</span>
                </div>
              </div>

              {/* 대봉투 */}
              <div className="flex items-center justify-between p-2.5 md:p-4 bg-white border border-orange-200 md:border-2 rounded-lg shadow-sm md:shadow-md md:flex-col md:items-start">
                <div className="flex items-center gap-2 md:gap-3 md:mb-2">
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xs md:text-lg whitespace-nowrap">대봉투</h3>
                </div>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className="text-lg md:text-3xl font-bold text-orange-700">4~5일</span>
                </div>
              </div>

              {/* 자문계약서 내지 */}
              <div className="flex items-center justify-between p-2.5 md:p-4 bg-white border border-green-200 md:border-2 rounded-lg shadow-sm md:shadow-md md:flex-col md:items-start">
                <div className="flex items-center gap-2 md:gap-3 md:mb-2">
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 md:w-5 md:h-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xs md:text-lg whitespace-nowrap">자문계약서 내지</h3>
                </div>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className="text-lg md:text-3xl font-bold text-green-700">7일</span>
                </div>
              </div>
            </div>
            <div className="flex items-start md:items-center gap-2 text-xs text-navy-800 bg-gold-100 px-2 py-1.5 md:px-3 md:py-2 rounded-md">
              <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 mt-0.5 md:mt-0" />
              <span className="font-medium leading-tight">주말 및 공휴일은 제외되며, 실제 도착일은 제작 완료 후 안내됩니다.</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {workflows.length === 0 ? (
        <Card className="bg-white border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-500">워크플로우가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="bg-white border border-gray-200 md:border-2 hover:border-gold-300 transition-all">
              {/* 헤더 - 모바일에서 컴팩트하게 */}
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-xl flex items-center gap-1.5 md:gap-2">
                    {getStatusIcon(workflow.status, workflow.type)}
                    {workflow.type}
                  </CardTitle>
                  {getStatusBadge(workflow.status, workflow.type)}
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-2 md:space-y-4">
                {/* 진행 상태 - 모바일에서 2열 그리드, 중요 정보만 표시 */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-1 md:gap-2 text-[11px] md:text-sm">
                  {workflow.시안업로드일 && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-700 flex-shrink-0" />
                      <span className="text-gray-600 hidden md:inline">시안 업로드:</span>
                      <span className="text-gray-900 truncate">{formatDate(workflow.시안업로드일)}</span>
                    </div>
                  )}
                  {workflow.발주요청일 && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-700 flex-shrink-0" />
                      <span className="text-gray-600 hidden md:inline">발주 요청:</span>
                      <span className="text-gray-900 truncate">{formatDate(workflow.발주요청일)}</span>
                    </div>
                  )}
                  {workflow.발주승인일 && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-700 flex-shrink-0" />
                      <span className="text-gray-600 hidden md:inline">발주 승인:</span>
                      <span className="text-gray-900 truncate">{formatDate(workflow.발주승인일)}</span>
                    </div>
                  )}
                  {workflow.예상도착일 && (
                    <div className="flex items-center gap-1 md:gap-2 col-span-2 md:col-span-1 bg-gold-50 md:bg-transparent rounded px-1 md:px-0 py-0.5 md:py-0">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gold-600 flex-shrink-0" />
                      <span className="text-gray-600 text-[10px] md:text-sm">
                        {workflow.type === "홈페이지" ? "완료예정:" : "도착예정:"}
                      </span>
                      <span className="text-navy-700 font-medium truncate">{formatArrivalDate(workflow.예상도착일)}</span>
                    </div>
                  )}
                  {workflow.제작완료일 && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-700 flex-shrink-0" />
                      <span className="text-gray-600 hidden md:inline">제작 완료:</span>
                      <span className="text-gray-900 truncate">{formatDate(workflow.제작완료일)}</span>
                    </div>
                  )}
                  {workflow.발송일 && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <Truck className="w-3 h-3 md:w-4 md:h-4 text-gold-600 flex-shrink-0" />
                      <span className="text-gray-600 hidden md:inline">발송일:</span>
                      <span className="text-gray-900 truncate">{formatDate(workflow.발송일)}</span>
                    </div>
                  )}
                </div>

                {/* 택배 정보 - 모바일에서 한 줄로 */}
                {workflow.운송장번호 && (
                  <div className="flex items-center gap-2 p-2 md:p-3 rounded-lg bg-gold-50 border border-gold-200 md:border-2">
                    <Truck className="w-3.5 h-3.5 md:w-4 md:h-4 text-gold-600 flex-shrink-0" />
                    <span className="text-[11px] md:text-sm text-navy-700 font-medium truncate">
                      {workflow.택배회사} {workflow.운송장번호}
                    </span>
                  </div>
                )}

                {/* 액션 버튼 - 모바일에서 컴팩트하게 */}
                <div className="flex gap-1.5 md:gap-2">
                  {/* 시안중 상태이고 인쇄물 타입이면 시안관리 버튼 표시 */}
                  {workflow.status === "시안중" &&
                    workflow.type !== "로고" &&
                    workflow.type !== "홈페이지" && (
                      <Link href="/dashboard/design-threads" className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 md:h-9 text-xs md:text-sm border-purple-400 text-purple-600 hover:bg-purple-50"
                        >
                          <Palette className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
                          <span className="hidden md:inline">시안 확인하기</span>
                          <span className="md:hidden">시안확인</span>
                        </Button>
                      </Link>
                    )}
                  {/* 시안URL이 있으면 시안 확인 버튼 표시 */}
                  {workflow.시안URL && (
                    <>
                      <Dialog
                        open={selectedWorkflow?.id === workflow.id && dialogOpen}
                        onOpenChange={(open) => {
                          if (!open) {
                            setDialogOpen(false);
                            setSelectedWorkflow(null);
                            setFeedbackText("");
                            setOrderConfirmChecked(false);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 md:h-9 text-xs md:text-sm border-gold-500 text-gold-600 hover:bg-gold-50"
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setDialogOpen(true);
                            }}
                          >
                            시안확인
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-2 border-gray-200 max-w-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-gray-900">{workflow.type} 시안</DialogTitle>
                            <DialogDescription className="text-gray-600">
                              시안을 확인하고 발주를 진행해주세요
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            {workflow.시안URL && (
                              workflow.type === "홈페이지" ? (
                                <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
                                  <div className="text-center space-y-4">
                                    <p className="text-sm text-gray-600">홈페이지가 완성되었습니다!</p>
                                    <a
                                      href={workflow.시안URL}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block px-6 py-3 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
                                    >
                                      홈페이지 방문하기
                                    </a>
                                    <p className="text-xs text-gray-500 break-all">{workflow.시안URL}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center max-h-[35vh]">
                                  <img
                                    src={workflow.시안URL}
                                    alt={`${workflow.type} 시안`}
                                    className="max-w-full max-h-[35vh] object-contain"
                                  />
                                </div>
                              )
                            )}

                            {/* 버튼 섹션 - 모바일에서 컴팩트하게 */}
                            <div className="flex flex-col gap-1.5 md:gap-2">
                              {/* 인쇄물만 새 탭에서 보기/다운로드 버튼 표시 (시안URL 있을 때만) */}
                              {workflow.type !== "홈페이지" && workflow.시안URL && (
                                <div className="flex gap-1.5 md:gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                                    onClick={() => window.open(workflow.시안URL!, "_blank")}
                                  >
                                    새 탭에서 보기
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                                    onClick={async () => {
                                      try {
                                        // 파일 확장자 추출
                                        const fileExtension = workflow.시안URL?.split('.').pop()?.toLowerCase() || 'png';
                                        const filename = `${workflow.type}_시안_${new Date().toLocaleDateString("ko-KR")}.${fileExtension}`;

                                        // 프록시 API를 통해 다운로드
                                        const downloadUrl = `/api/workflows/download?url=${encodeURIComponent(workflow.시안URL!)}&filename=${encodeURIComponent(filename)}`;

                                        const link = document.createElement("a");
                                        link.href = downloadUrl;
                                        link.download = filename;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      } catch (error) {
                                        console.error("다운로드 실패:", error);
                                        alert("다운로드에 실패했습니다.");
                                      }
                                    }}
                                  >
                                    다운로드
                                  </Button>
                                </div>
                              )}

                              {/* 로고와 홈페이지: 시안 확정 버튼 (미확정 상태일 때만) */}
                              {(workflow.type === "로고" || workflow.type === "홈페이지") ? (
                                workflow.status !== "최종확정" && (
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (!confirm(`${workflow.type} 시안을 최종 확정하시겠습니까?\n확정 후에는 수정이 어려울 수 있습니다.`)) {
                                        return;
                                      }

                                      setLoading(true);
                                      try {
                                        const res = await fetch(`/api/workflows/${workflow.id}/approve`, {
                                          method: "POST",
                                        });

                                        if (res.ok) {
                                          alert(`${workflow.type} 시안이 최종 확정되었습니다!`);
                                          await fetchWorkflows();
                                        } else {
                                          const error = await res.json();
                                          alert(error.error || "확정에 실패했습니다");
                                        }
                                      } catch (error) {
                                        console.error("Failed to approve:", error);
                                        alert("확정 중 오류가 발생했습니다");
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    disabled={loading}
                                    className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    시안 확정
                                  </Button>
                                )
                              ) : (
                                // 인쇄물: 발주 요청 버튼 (발주대기 상태일 때만)
                                workflow.status === "발주대기" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOrderRequest(workflow.id)}
                                    disabled={loading}
                                    className="w-full h-9 md:h-10 text-sm bg-navy-900 hover:bg-navy-800 text-white"
                                  >
                                    발주 요청
                                  </Button>
                                )
                              )}
                            </div>

                            {/* 발주 전 주의사항 - 인쇄물 발주대기 상태일 때만 */}
                            {workflow.type !== "홈페이지" && workflow.type !== "로고" && workflow.status === "발주대기" && (
                              <div className="bg-red-50 border border-red-300 md:border-2 rounded-lg p-2.5 md:p-4">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs md:text-sm text-gray-800">
                                    <p className="font-bold text-red-600 mb-1 md:mb-2 text-xs md:text-sm">⚠️ 발주 요청 전 필독!</p>
                                    <p className="text-gray-700 leading-relaxed text-[11px] md:text-sm">
                                      발주요청 이후 <strong className="text-red-600">디자인 변경 불가</strong>합니다.
                                      <span className="hidden md:inline"> 확인되지 않은 오탈자 및 변심으로 재제작 시 본인 부담입니다.</span>
                                    </p>
                                    <label className="flex items-center gap-2 mt-2 md:mt-3 cursor-pointer bg-white border border-red-200 rounded-lg p-2 md:p-3">
                                      <input
                                        type="checkbox"
                                        checked={orderConfirmChecked}
                                        onChange={(e) => setOrderConfirmChecked(e.target.checked)}
                                        className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                                      />
                                      <span className="text-xs md:text-sm font-medium text-gray-900">
                                        확인 후 발주 요청
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 로고 확정 전 주의사항 */}
                            {workflow.type === "로고" && workflow.status !== "최종확정" && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 md:p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-[11px] md:text-xs text-gray-700">
                                    <p className="font-bold text-orange-600 mb-0.5 md:mb-1">확정 전 필독!</p>
                                    <p>확정 후 수정 불가 · 수정 최대 2회 · 3회 이상 건당 1만원</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 피드백 섹션 */}
                            <div className="space-y-1.5 md:space-y-2">
                              {workflow.feedback && (
                                <div className="bg-gold-50 border border-gold-200 rounded-lg p-2 md:p-3">
                                  <p className="text-[11px] md:text-xs font-semibold text-navy-900 mb-0.5 md:mb-1">제출한 피드백:</p>
                                  <p className="text-[11px] md:text-xs text-navy-800 whitespace-pre-wrap line-clamp-2 md:line-clamp-none">{workflow.feedback}</p>
                                </div>
                              )}

                              {/* 피드백 입력 - 확정/발주 전에만 표시 */}
                              {((workflow.type === "로고" && workflow.status !== "최종확정") ||
                                (workflow.type === "홈페이지" && workflow.status !== "최종확정") ||
                                (workflow.type !== "로고" && workflow.type !== "홈페이지" && workflow.status === "발주대기")) && (
                                <div className="space-y-1">
                                  <label className="text-[11px] md:text-xs font-semibold text-gray-700">
                                    수정 요청 {workflow.feedback ? "(추가)" : ""}
                                  </label>
                                  <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="예: 색상 변경"
                                    className="w-full h-14 md:h-20 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 md:border-2 rounded-lg resize-none focus:outline-none focus:border-gold-500"
                                  />
                                  {feedbackText.trim() && (
                                    <Button
                                      onClick={() => handleFeedbackSubmit(workflow.id)}
                                      disabled={submittingFeedback}
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-8 md:h-9 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                                    >
                                      {submittingFeedback ? "저장 중..." : "피드백 저장"}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                  {workflow.status === "대기" && (
                    <div className="flex-1 text-center text-[11px] md:text-sm text-gray-500 py-1 md:py-2">
                      {workflow.type === "로고"
                        ? "로고 시안 1~2일 내 전달"
                        : "시안 작업 중"}
                    </div>
                  )}
                  {workflow.status === "시안중" && !workflow.시안URL && (
                    <div className="flex-1 text-center text-[11px] md:text-sm text-gray-500 py-1 md:py-2">
                      {workflow.type === "로고"
                        ? "로고 시안 1~2일 내 전달"
                        : "시안 작업 중"}
                    </div>
                  )}
                  {workflow.status === "발주완료" && (
                    <div className="flex-1 text-center text-[11px] md:text-sm text-gray-500 py-1 md:py-2">
                      제작 중
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
