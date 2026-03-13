"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Truck,
  Calendar,
  Info,
  Palette,
  RefreshCcw,
  Globe,
  CreditCard,
  Tag,
  Mail,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { formatArrivalDate } from "@/lib/utils/businessDays";

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
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [orderConfirmChecked, setOrderConfirmChecked] = useState(false);
  // URL ?open= 파라미터로 자동 펼칠 아코디언 ID
  const [autoOpenId, setAutoOpenId] = useState<string | null>(null);
  const accordionRefs = useRef<Record<string, HTMLDetailsElement | null>>({});

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // URL 파라미터로 특정 워크플로우 아코디언 자동 오픈
  useEffect(() => {
    const openWorkflowId = searchParams.get("open");
    if (openWorkflowId && workflows.length > 0) {
      const workflow = workflows.find((w) => w.id === openWorkflowId);
      if (workflow) {
        setAutoOpenId(openWorkflowId);
        // URL 파라미터 제거 (깔끔하게)
        router.replace("/dashboard/workflows", { scroll: false });
        // 해당 아코디언으로 스크롤
        setTimeout(() => {
          const el = accordionRefs.current[openWorkflowId];
          if (el) {
            el.open = true;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
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

    const statusMap: Record<
      string,
      { variant: any; color: string; label: string }
    > = {
      대기: { variant: "secondary", color: "text-navy-300", label: "대기" },
      // 로고 워크플로우 상태
      시안제작중: {
        variant: "outline",
        color: "text-navy-600 border-navy-200 bg-navy-50",
        label: "시안 제작 중",
      },
      시안컨펌요청: {
        variant: "outline",
        color: "text-terra-500 border-terra-100 bg-terra-50",
        label: "시안 컨펌 요청",
      },
      최종확정: {
        variant: "outline",
        color: "text-ok-700 border-ok-100 bg-ok-50",
        label: "최종 확정",
      },
      // 홈페이지 워크플로우 상태
      "제작 진행 중": {
        variant: "outline",
        color: "text-navy-600 border-navy-200 bg-navy-50",
        label: "제작 진행 중",
      },
      "제작 완료": {
        variant: "outline",
        color: "text-ok-700 border-ok-100 bg-ok-50",
        label: "제작 완료",
      },
      // 인쇄물 워크플로우 상태
      시안중: {
        variant: "outline",
        color: "text-navy-600 border-navy-200 bg-navy-50",
        label: "시안 작업 중",
      },
      발주대기: {
        variant: "outline",
        color: "text-terra-500 border-terra-100 bg-terra-50",
        label: "발주 대기 (확인 필요!)",
      },
      발주요청: {
        variant: "outline",
        color: "text-terra-500 border-terra-100 bg-terra-50",
        label: "발주 요청",
      },
      발주완료: {
        variant: "outline",
        color: "text-ok-700 border-ok-100 bg-ok-50",
        label: "발주 완료",
      },
      제작완료: {
        variant: "outline",
        color: "text-ok-700 border-ok-100 bg-ok-50",
        label: "제작 완료",
      },
      발송완료: {
        variant: "outline",
        color: "text-ok-700 border-ok-100 bg-ok-50",
        label: "발송 완료",
      },
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
        return <AlertTriangle className="w-5 h-5 text-terra-500" />;
      case "최종확정":
        return <CheckCircle2 className="w-5 h-5 text-ok-700" />;
      // 홈페이지 워크플로우
      case "제작 진행 중":
        return <FileText className="w-5 h-5 text-gold-600" />;
      case "제작 완료":
        return <CheckCircle2 className="w-5 h-5 text-ok-700" />;
      // 인쇄물 워크플로우
      case "시안중":
        return <FileText className="w-5 h-5 text-gold-600" />;
      case "발주대기":
        return <AlertTriangle className="w-5 h-5 text-terra-500" />;
      case "발주완료":
      case "제작완료":
        return <Package className="w-5 h-5 text-ok-700" />;
      case "발송완료":
        return <Truck className="w-5 h-5 text-ok-700" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getWorkflowIcon = (type: string) => {
    const cls = "w-4 h-4";
    const icons: Record<string, React.ReactNode> = {
      로고: <Palette className={`${cls} text-gold-600`} />,
      홈페이지: <Globe className={`${cls} text-navy-600`} />,
      명함: <CreditCard className={`${cls} text-navy-600`} />,
      명찰: <Tag className={`${cls} text-navy-600`} />,
      대봉투: <Mail className={`${cls} text-navy-600`} />,
      자문계약서: <FileText className={`${cls} text-navy-600`} />,
      "자문계약서 표지": <BookOpen className={`${cls} text-navy-600`} />,
      "자문계약서 내지": <FileText className={`${cls} text-navy-600`} />,
    };
    return icons[type] || <Package className={`${cls} text-gray-500`} />;
  };

  // 액션이 필요한 상태(기본 펼침 대상)
  const needsAction = (workflow: Workflow) =>
    workflow.status === "발주대기" ||
    workflow.status === "시안컨펌요청" ||
    workflow.id === autoOpenId;

  // Step 넘버 컴포넌트
  const StepNum = ({ n }: { n: number }) => (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );

  const designWorkflows = workflows.filter(
    (w) => w.type === "로고" || w.type === "홈페이지",
  );
  const printWorkflows = workflows.filter(
    (w) => w.type !== "로고" && w.type !== "홈페이지",
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">제작 현황</h1>
          <p className="text-gray-600 text-sm">
            인쇄물 및 홈페이지 제작 진행 상황을 확인하세요
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchWorkflows}
          className="flex-shrink-0 mt-0.5"
        >
          <RefreshCcw className="w-4 h-4 mr-1.5" />
          새로고침
        </Button>
      </div>

      {/* 안내 아코디언 (기본 접힘) */}
      <details className="border border-gray-200 rounded-lg bg-gray-50 group">
        <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none text-sm font-semibold text-navy-900 select-none">
          <Info className="w-4 h-4 text-navy-700 flex-shrink-0" />
          <span>제작 안내</span>
          <span className="ml-auto flex items-center gap-3 text-xs font-normal text-gray-500">
            <span className="hidden sm:inline">
              명함 2~3일 | 대봉투 4~5일 | 계약서 7일
            </span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="px-3 pb-3 pt-1 space-y-2 text-sm text-gray-700 border-t border-gray-200">
          <div className="flex items-start gap-2 pt-2">
            <Truck className="w-4 h-4 text-terra-500 flex-shrink-0 mt-0.5" />
            <p>
              인쇄물(명함, 대봉투, 계약서)은{" "}
              <span className="font-bold text-terra-500">
                각각의 제작 일정에 따라 개별 배송
              </span>
              됩니다. 합배송되지 않으니 참고해 주세요.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-navy-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-navy-800 mb-1">
                제품별 제작 소요 기간 (발주요청 후, 영업일 기준)
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">
                  명함 / 명찰: <strong className="text-navy-700">2~3일</strong>
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">
                  대봉투: <strong className="text-terra-500">4~5일</strong>
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">
                  자문계약서 내지: <strong className="text-ok-700">7일</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-xs text-navy-800 bg-white border border-gray-200 px-2 py-1.5 rounded">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              주말 및 공휴일은 제외되며, 실제 도착일은 제작 완료 후 안내됩니다.
            </span>
          </div>
        </div>
      </details>

      {workflows.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Package className="w-8 h-8 text-gray-400 mb-4" />
            <p className="text-gray-500">워크플로우가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── 디자인 제작 섹션 ── */}
          {designWorkflows.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-gold-600" />
                디자인 제작
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {designWorkflows.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className="bg-white border border-gray-200 hover:border-gold-300 transition-all"
                  >
                    <CardHeader className="p-3 md:p-5 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-1.5">
                          {getStatusIcon(workflow.status, workflow.type)}
                          {workflow.type}
                        </CardTitle>
                        {getStatusBadge(workflow.status, workflow.type)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 md:p-5 pt-0 space-y-3">
                      {/* 진행 날짜 정보 */}
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-1 text-[11px] md:text-sm">
                        {workflow.시안업로드일 && (
                          <div className="flex items-center gap-1 md:gap-2">
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-ok-700 flex-shrink-0" />
                            <span className="text-gray-600 hidden md:inline">
                              시안 업로드:
                            </span>
                            <span className="text-gray-900 truncate">
                              {formatDate(workflow.시안업로드일)}
                            </span>
                          </div>
                        )}
                        {workflow.예상도착일 && (
                          <div className="flex items-center gap-1 md:gap-2 col-span-2 md:col-span-1">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-navy-600 flex-shrink-0" />
                            <span className="text-gray-600 text-[10px] md:text-sm">
                              완료예정:
                            </span>
                            <span className="text-navy-700 font-medium truncate">
                              {formatArrivalDate(workflow.예상도착일)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 액션 버튼 영역 */}
                      <div className="flex gap-1.5">
                        {workflow.시안URL && (
                          <Dialog
                            open={
                              selectedWorkflow?.id === workflow.id && dialogOpen
                            }
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
                            <DialogContent className="bg-white border border-gray-200 max-w-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-gray-900">
                                  {workflow.type} 시안
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                  시안을 확인하고 발주를 진행해주세요
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3">
                                {workflow.시안URL &&
                                  (workflow.type === "홈페이지" ? (
                                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                                      <div className="text-center space-y-4">
                                        <p className="text-sm text-gray-600">
                                          홈페이지가 완성되었습니다!
                                        </p>
                                        <a
                                          href={workflow.시안URL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-block px-6 py-3 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
                                        >
                                          홈페이지 방문하기
                                        </a>
                                        <p className="text-xs text-gray-500 break-all">
                                          {workflow.시안URL}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center max-h-[35vh]">
                                      <img
                                        src={workflow.시안URL}
                                        alt={`${workflow.type} 시안`}
                                        className="max-w-full max-h-[35vh] object-contain"
                                      />
                                    </div>
                                  ))}

                                <div className="flex flex-col gap-1.5 md:gap-2">
                                  {/* 로고와 홈페이지: 시안 확정 버튼 */}
                                  {(workflow.type === "로고" ||
                                    workflow.type === "홈페이지") &&
                                    workflow.status !== "최종확정" && (
                                      <Button
                                        size="sm"
                                        onClick={async () => {
                                          if (
                                            !confirm(
                                              `${workflow.type} 시안을 최종 확정하시겠습니까?\n확정 후에는 수정이 어려울 수 있습니다.`,
                                            )
                                          ) {
                                            return;
                                          }
                                          setLoading(true);
                                          try {
                                            const res = await fetch(
                                              `/api/workflows/${workflow.id}/approve`,
                                              { method: "POST" },
                                            );
                                            if (res.ok) {
                                              alert(
                                                `${workflow.type} 시안이 최종 확정되었습니다!`,
                                              );
                                              await fetchWorkflows();
                                            } else {
                                              const error = await res.json();
                                              alert(
                                                error.error ||
                                                  "확정에 실패했습니다",
                                              );
                                            }
                                          } catch (error) {
                                            console.error(
                                              "Failed to approve:",
                                              error,
                                            );
                                            alert(
                                              "확정 중 오류가 발생했습니다",
                                            );
                                          } finally {
                                            setLoading(false);
                                          }
                                        }}
                                        disabled={loading}
                                        className="w-full h-9 md:h-10 text-sm bg-ok-600 hover:bg-ok-700 text-white"
                                      >
                                        시안 확정
                                      </Button>
                                    )}
                                </div>

                                {/* 로고 확정 전 주의사항 */}
                                {workflow.type === "로고" &&
                                  workflow.status !== "최종확정" && (
                                    <div className="bg-terra-50 border border-terra-100 rounded-lg p-2 md:p-3">
                                      <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-terra-500 mt-0.5 flex-shrink-0" />
                                        <div className="text-[11px] md:text-xs text-gray-700">
                                          <p className="font-bold text-terra-500 mb-0.5 md:mb-1">
                                            확정 전 필독!
                                          </p>
                                          <p>
                                            확정 후 수정 불가 · 수정 최대 2회 ·
                                            3회 이상 건당 1만원
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                {/* 피드백 섹션 */}
                                <div className="space-y-1.5 md:space-y-2">
                                  {workflow.feedback && (
                                    <div className="bg-white border border-gray-200 rounded-lg p-2 md:p-3">
                                      <p className="text-[11px] md:text-xs font-semibold text-navy-900 mb-0.5 md:mb-1">
                                        제출한 피드백:
                                      </p>
                                      <p className="text-[11px] md:text-xs text-navy-800 whitespace-pre-wrap line-clamp-2 md:line-clamp-none">
                                        {workflow.feedback}
                                      </p>
                                    </div>
                                  )}
                                  {(workflow.type === "로고" ||
                                    workflow.type === "홈페이지") &&
                                    workflow.status !== "최종확정" && (
                                      <div className="space-y-1">
                                        <label className="text-[11px] md:text-xs font-semibold text-gray-700">
                                          수정 요청
                                          {workflow.feedback ? " (추가)" : ""}
                                        </label>
                                        <textarea
                                          value={feedbackText}
                                          onChange={(e) =>
                                            setFeedbackText(e.target.value)
                                          }
                                          placeholder="예: 색상 변경"
                                          className="w-full h-14 md:h-20 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-gold-500"
                                        />
                                        {feedbackText.trim() && (
                                          <Button
                                            onClick={() =>
                                              handleFeedbackSubmit(workflow.id)
                                            }
                                            disabled={submittingFeedback}
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 md:h-9 text-xs border-terra-100 text-terra-500 hover:bg-terra-50"
                                          >
                                            {submittingFeedback
                                              ? "저장 중..."
                                              : "피드백 저장"}
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {(workflow.status === "대기" ||
                          (workflow.status === "시안중" && !workflow.시안URL) ||
                          workflow.status === "시안제작중") && (
                          <div className="flex-1 text-center text-[11px] md:text-sm text-gray-500 py-1 md:py-2">
                            {workflow.type === "로고"
                              ? "로고 시안 1~2일 내 전달"
                              : "제작 진행 중"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ── 인쇄물 제작 섹션 ── */}
          {printWorkflows.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-navy-700" />
                인쇄물 제작
              </h2>
              <div className="space-y-2">
                {printWorkflows.map((workflow) => {
                  const isActionNeeded = needsAction(workflow);
                  const isCompleted = workflow.status === "발송완료";

                  return (
                    <details
                      key={workflow.id}
                      ref={(el) => {
                        accordionRefs.current[workflow.id] = el;
                      }}
                      open={isActionNeeded}
                      className="border border-gray-200 rounded-lg bg-white group/card overflow-hidden hover:border-gold-300 transition-colors"
                    >
                      {/* Summary: 아이콘 + 타입명 + 상태 Badge (한 줄) */}
                      <summary className="flex items-center gap-2 px-3 py-3 cursor-pointer list-none select-none">
                        <span className="flex items-center gap-1.5 flex-1 min-w-0">
                          {getWorkflowIcon(workflow.type)}
                          <span className="font-semibold text-sm text-gray-900">
                            {workflow.type}
                          </span>
                          {isCompleted && workflow.운송장번호 && (
                            <span className="text-[11px] text-gray-400 ml-1 truncate hidden sm:inline">
                              {workflow.택배회사} {workflow.운송장번호}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(workflow.status, workflow.type)}
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 transition-transform group-open/card:rotate-180" />
                        </span>
                      </summary>

                      {/* 아코디언 내부 콘텐츠 */}
                      <div className="border-t border-gray-100 px-3 pb-3 pt-3 space-y-3">
                        {/* 진행 날짜 정보 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[11px] md:text-sm">
                          {workflow.시안업로드일 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-ok-700 flex-shrink-0" />
                              <span className="text-gray-500">시안:</span>
                              <span className="text-gray-900 truncate">
                                {formatDate(workflow.시안업로드일)}
                              </span>
                            </div>
                          )}
                          {workflow.발주요청일 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-ok-700 flex-shrink-0" />
                              <span className="text-gray-500">발주요청:</span>
                              <span className="text-gray-900 truncate">
                                {formatDate(workflow.발주요청일)}
                              </span>
                            </div>
                          )}
                          {workflow.발주승인일 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-ok-700 flex-shrink-0" />
                              <span className="text-gray-500">발주승인:</span>
                              <span className="text-gray-900 truncate">
                                {formatDate(workflow.발주승인일)}
                              </span>
                            </div>
                          )}
                          {workflow.예상도착일 && (
                            <div className="flex items-center gap-1 col-span-2 md:col-span-1">
                              <Calendar className="w-3 h-3 text-navy-600 flex-shrink-0" />
                              <span className="text-gray-500">도착예정:</span>
                              <span className="text-navy-700 font-medium truncate">
                                {formatArrivalDate(workflow.예상도착일)}
                              </span>
                            </div>
                          )}
                          {workflow.제작완료일 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-ok-700 flex-shrink-0" />
                              <span className="text-gray-500">제작완료:</span>
                              <span className="text-gray-900 truncate">
                                {formatDate(workflow.제작완료일)}
                              </span>
                            </div>
                          )}
                          {workflow.발송일 && (
                            <div className="flex items-center gap-1">
                              <Truck className="w-3 h-3 text-gold-600 flex-shrink-0" />
                              <span className="text-gray-500">발송일:</span>
                              <span className="text-gray-900 truncate">
                                {formatDate(workflow.발송일)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 택배 정보 */}
                        {workflow.운송장번호 && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200">
                            <Truck className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
                            <span className="text-[11px] md:text-sm text-navy-700 font-medium truncate">
                              {workflow.택배회사} {workflow.운송장번호}
                            </span>
                          </div>
                        )}

                        {/* Step 영역 (시안URL 있거나 시안중 상태) */}
                        {(workflow.시안URL ||
                          workflow.status === "시안중" ||
                          workflow.status === "발주대기") && (
                          <div className="space-y-2 pt-1">
                            {/* Step 1: 시안 확인 */}
                            {(workflow.status === "시안중" ||
                              workflow.status === "발주대기" ||
                              workflow.시안URL) && (
                              <div className="flex items-start gap-2">
                                <StepNum n={1} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">
                                    시안 확인
                                  </p>
                                  {workflow.status === "시안중" &&
                                  !workflow.시안URL ? (
                                    <p className="text-xs text-gray-500">
                                      시안 작업 중입니다
                                    </p>
                                  ) : workflow.시안URL ? (
                                    <div className="flex gap-1.5">
                                      {workflow.status === "시안중" && (
                                        <Link
                                          href="/dashboard/design-threads"
                                          className="flex-1"
                                        >
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-xs border-terra-100 text-terra-500 hover:bg-terra-50"
                                          >
                                            <Palette className="w-3.5 h-3.5 mr-1" />
                                            시안확인
                                          </Button>
                                        </Link>
                                      )}
                                      {workflow.시안URL &&
                                        workflow.status !== "시안중" && (
                                          <Dialog
                                            open={
                                              selectedWorkflow?.id ===
                                                workflow.id && dialogOpen
                                            }
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
                                                className="flex-1 h-8 text-xs border-gold-500 text-gold-600 hover:bg-gold-50"
                                                onClick={() => {
                                                  setSelectedWorkflow(workflow);
                                                  setDialogOpen(true);
                                                }}
                                              >
                                                시안확인
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-white border border-gray-200 max-w-3xl">
                                              <DialogHeader>
                                                <DialogTitle className="text-gray-900">
                                                  {workflow.type} 시안
                                                </DialogTitle>
                                                <DialogDescription className="text-gray-600">
                                                  시안을 확인하고 발주를
                                                  진행해주세요
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="space-y-3">
                                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center max-h-[35vh]">
                                                  <img
                                                    src={workflow.시안URL!}
                                                    alt={`${workflow.type} 시안`}
                                                    className="max-w-full max-h-[35vh] object-contain"
                                                  />
                                                </div>

                                                <div className="flex gap-1.5 md:gap-2">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                                                    onClick={() =>
                                                      window.open(
                                                        workflow.시안URL!,
                                                        "_blank",
                                                      )
                                                    }
                                                  >
                                                    새 탭에서 보기
                                                  </Button>
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                                                    onClick={async () => {
                                                      try {
                                                        const fileExtension =
                                                          workflow.시안URL
                                                            ?.split(".")
                                                            .pop()
                                                            ?.toLowerCase() ||
                                                          "png";
                                                        const filename = `${workflow.type}_시안_${new Date().toLocaleDateString("ko-KR")}.${fileExtension}`;
                                                        const downloadUrl = `/api/workflows/download?url=${encodeURIComponent(workflow.시안URL!)}&filename=${encodeURIComponent(filename)}`;
                                                        const link =
                                                          document.createElement(
                                                            "a",
                                                          );
                                                        link.href = downloadUrl;
                                                        link.download =
                                                          filename;
                                                        document.body.appendChild(
                                                          link,
                                                        );
                                                        link.click();
                                                        document.body.removeChild(
                                                          link,
                                                        );
                                                      } catch (error) {
                                                        console.error(
                                                          "다운로드 실패:",
                                                          error,
                                                        );
                                                        alert(
                                                          "다운로드에 실패했습니다.",
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    다운로드
                                                  </Button>
                                                </div>

                                                {/* 발주대기 상태: 발주 요청 버튼 */}
                                                {workflow.status ===
                                                  "발주대기" && (
                                                  <Button
                                                    size="sm"
                                                    onClick={() =>
                                                      handleOrderRequest(
                                                        workflow.id,
                                                      )
                                                    }
                                                    disabled={loading}
                                                    className="w-full h-9 md:h-10 text-sm bg-navy-900 hover:bg-navy-800 text-white"
                                                  >
                                                    발주 요청
                                                  </Button>
                                                )}

                                                {/* 발주 전 주의사항 */}
                                                {workflow.status ===
                                                  "발주대기" && (
                                                  <div className="bg-terra-50 border border-terra-100 rounded-lg p-2.5 md:p-4">
                                                    <div className="flex items-start gap-2">
                                                      <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-terra-500 mt-0.5 flex-shrink-0" />
                                                      <div className="text-xs md:text-sm text-gray-800">
                                                        <p className="font-bold text-terra-500 mb-1 md:mb-2 text-xs md:text-sm">
                                                          발주 요청 전 필독!
                                                        </p>
                                                        <p className="text-gray-700 leading-relaxed text-[11px] md:text-sm">
                                                          발주요청 이후{" "}
                                                          <strong className="text-terra-500">
                                                            디자인 변경 불가
                                                          </strong>
                                                          합니다.
                                                          <span className="hidden md:inline">
                                                            {" "}
                                                            확인되지 않은 오탈자
                                                            및 변심으로 재제작
                                                            시 본인 부담입니다.
                                                          </span>
                                                        </p>
                                                        <label className="flex items-center gap-2 mt-2 md:mt-3 cursor-pointer bg-white border border-terra-100 rounded-lg p-2 md:p-3">
                                                          <input
                                                            type="checkbox"
                                                            checked={
                                                              orderConfirmChecked
                                                            }
                                                            onChange={(e) =>
                                                              setOrderConfirmChecked(
                                                                e.target
                                                                  .checked,
                                                              )
                                                            }
                                                            className="w-4 h-4 text-terra-500 border-terra-100 rounded focus:ring-terra-500"
                                                          />
                                                          <span className="text-xs md:text-sm font-medium text-gray-900">
                                                            확인 후 발주 요청
                                                          </span>
                                                        </label>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 피드백 섹션 */}
                                                <div className="space-y-1.5 md:space-y-2">
                                                  {workflow.feedback && (
                                                    <div className="bg-white border border-gray-200 rounded-lg p-2 md:p-3">
                                                      <p className="text-[11px] md:text-xs font-semibold text-navy-900 mb-0.5 md:mb-1">
                                                        제출한 피드백:
                                                      </p>
                                                      <p className="text-[11px] md:text-xs text-navy-800 whitespace-pre-wrap line-clamp-2 md:line-clamp-none">
                                                        {workflow.feedback}
                                                      </p>
                                                    </div>
                                                  )}
                                                  {workflow.status ===
                                                    "발주대기" && (
                                                    <div className="space-y-1">
                                                      <label className="text-[11px] md:text-xs font-semibold text-gray-700">
                                                        수정 요청
                                                        {workflow.feedback
                                                          ? " (추가)"
                                                          : ""}
                                                      </label>
                                                      <textarea
                                                        value={feedbackText}
                                                        onChange={(e) =>
                                                          setFeedbackText(
                                                            e.target.value,
                                                          )
                                                        }
                                                        placeholder="예: 색상 변경"
                                                        className="w-full h-14 md:h-20 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-gold-500"
                                                      />
                                                      {feedbackText.trim() && (
                                                        <Button
                                                          onClick={() =>
                                                            handleFeedbackSubmit(
                                                              workflow.id,
                                                            )
                                                          }
                                                          disabled={
                                                            submittingFeedback
                                                          }
                                                          variant="outline"
                                                          size="sm"
                                                          className="w-full h-8 md:h-9 text-xs border-terra-100 text-terra-500 hover:bg-terra-50"
                                                        >
                                                          {submittingFeedback
                                                            ? "저장 중..."
                                                            : "피드백 저장"}
                                                        </Button>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* Step 2: 발주 / 확정 */}
                            {(workflow.status === "발주대기" ||
                              workflow.시안URL) && (
                              <div className="flex items-start gap-2">
                                <StepNum n={2} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">
                                    발주 요청
                                  </p>
                                  {workflow.status === "발주대기" ? (
                                    <p className="text-xs text-terra-500 font-medium">
                                      시안 확인 후 발주를 요청하세요
                                    </p>
                                  ) : workflow.발주요청일 ? (
                                    <p className="text-xs text-ok-700">
                                      발주 완료
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-400">
                                      시안 확인 후 진행
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 3: 피드백 */}
                            {(workflow.status === "발주대기" ||
                              (workflow.시안URL && !workflow.발주요청일)) && (
                              <div className="flex items-start gap-2">
                                <StepNum n={3} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">
                                    수정 요청 (선택)
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {workflow.feedback
                                      ? "피드백 제출됨 — 시안 확인 다이얼로그에서 수정 가능"
                                      : "발주 전 수정이 필요하면 시안 확인에서 피드백을 남기세요"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 대기/시안중(URL 없음)/발주완료 상태 안내 */}
                        {workflow.status === "대기" && (
                          <p className="text-[11px] md:text-sm text-gray-500 text-center py-1">
                            시안 작업 중
                          </p>
                        )}
                        {workflow.status === "발주완료" && (
                          <p className="text-[11px] md:text-sm text-gray-500 text-center py-1">
                            제작 중
                          </p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
