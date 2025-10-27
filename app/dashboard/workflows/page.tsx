"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Clock, CheckCircle2, FileText, AlertTriangle, Truck, Calendar } from "lucide-react";
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
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

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
    if (!confirm("발주를 요청하시겠습니까?\n\n⚠️ 발주 후에는 정보 변경이 불가능합니다!\n⚠️ 오탈자 발견 시 재발주 비용은 본인 부담입니다.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/order`, {
        method: "POST",
      });

      if (res.ok) {
        alert("발주 요청이 완료되었습니다!");
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
      "시안제작중": { variant: "outline", color: "text-blue-700 border-blue-300 bg-blue-50", label: "시안 제작 중" },
      "시안컨펌요청": { variant: "outline", color: "text-orange-700 border-orange-300 bg-orange-50", label: "시안 컨펌 요청" },
      "최종확정": { variant: "outline", color: "text-emerald-800 border-emerald-300 bg-emerald-50", label: "최종 확정" },
      // 홈페이지 워크플로우 상태
      "제작 진행 중": { variant: "outline", color: "text-blue-700 border-blue-300 bg-blue-50", label: "제작 진행 중" },
      "제작 완료": { variant: "outline", color: "text-green-800 border-green-300 bg-green-50", label: "제작 완료" },
      // 인쇄물 워크플로우 상태
      "시안중": { variant: "outline", color: "text-blue-700 border-blue-300 bg-blue-50", label: "시안 작업 중" },
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
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "시안컨펌요청":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "최종확정":
        return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
      // 홈페이지 워크플로우
      case "제작 진행 중":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "제작 완료":
        return <CheckCircle2 className="w-5 h-5 text-green-700" />;
      // 인쇄물 워크플로우
      case "시안중":
        return <FileText className="w-5 h-5 text-blue-600" />;
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

      {workflows.length === 0 ? (
        <Card className="bg-white border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-500">워크플로우가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="bg-white border-2 border-gray-200 hover:border-blue-300 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {getStatusIcon(workflow.status, workflow.type)}
                    {workflow.type}
                  </CardTitle>
                  {getStatusBadge(workflow.status, workflow.type)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 진행 상태 */}
                <div className="space-y-2">
                  {workflow.시안업로드일 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span className="text-gray-600">시안 업로드:</span>
                      <span className="text-gray-900">{formatDate(workflow.시안업로드일)}</span>
                    </div>
                  )}
                  {workflow.발주요청일 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span className="text-gray-600">발주 요청:</span>
                      <span className="text-gray-900">{formatDate(workflow.발주요청일)}</span>
                    </div>
                  )}
                  {workflow.발주승인일 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span className="text-gray-600">발주 승인:</span>
                      <span className="text-gray-900">{formatDate(workflow.발주승인일)}</span>
                    </div>
                  )}
                  {workflow.예상도착일 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">
                        {workflow.type === "홈페이지" ? "제작 완료 예정일:" : "예상 도착:"}
                      </span>
                      <span className="text-blue-700 font-medium">{formatArrivalDate(workflow.예상도착일)}</span>
                    </div>
                  )}
                  {workflow.제작완료일 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span className="text-gray-600">제작 완료:</span>
                      <span className="text-gray-900">{formatDate(workflow.제작완료일)}</span>
                    </div>
                  )}
                  {workflow.발송일 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">발송일:</span>
                      <span className="text-gray-900">{formatDate(workflow.발송일)}</span>
                    </div>
                  )}
                </div>

                {/* 택배 정보 */}
                {workflow.운송장번호 && (
                  <div className="p-3 rounded-lg bg-blue-50 border-2 border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">택배 정보</p>
                    <p className="text-blue-600 font-medium">
                      {workflow.택배회사} - {workflow.운송장번호}
                    </p>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  {/* 로고는 시안컨펌요청, 인쇄물은 발주대기, 홈페이지는 제작 완료 상태에서 확인 가능 */}
                  {((workflow.type === "로고" && workflow.status === "시안컨펌요청") ||
                    workflow.status === "발주대기" ||
                    (workflow.type === "홈페이지" && workflow.status === "제작 완료")) && workflow.시안URL && (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => setSelectedWorkflow(workflow)}
                          >
                            시안 확인
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
                                      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

                            {/* 버튼 섹션 - 홈페이지가 아닌 경우만 표시 */}
                            {workflow.type !== "홈페이지" && (
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => window.open(workflow.시안URL!, "_blank")}
                                  >
                                    새 탭에서 보기
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = workflow.시안URL!;
                                      link.download = `${workflow.type}_시안_${new Date().toLocaleDateString("ko-KR")}.png`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                  >
                                    원본 다운로드
                                  </Button>
                                </div>
                                {workflow.type === "로고" ? (
                                  <Button
                                    onClick={async () => {
                                      if (!confirm("로고 시안을 최종 승인하시겠습니까?\n승인 후에는 수정이 어려울 수 있습니다.")) {
                                        return;
                                      }

                                      setLoading(true);
                                      try {
                                        const res = await fetch(`/api/workflows/${workflow.id}/approve`, {
                                          method: "POST",
                                        });

                                        if (res.ok) {
                                          alert("로고 시안이 최종 승인되었습니다!");
                                          await fetchWorkflows();
                                        } else {
                                          const error = await res.json();
                                          alert(error.error || "승인에 실패했습니다");
                                        }
                                      } catch (error) {
                                        console.error("Failed to approve:", error);
                                        alert("승인 중 오류가 발생했습니다");
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    disabled={loading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    로고 시안 승인하기
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleOrderRequest(workflow.id)}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    발주 요청
                                  </Button>
                                )}
                              </div>
                            )}

                            {workflow.type !== "홈페이지" && (
                              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-gray-700">
                                    <p className="font-bold text-orange-600 mb-1">발주 전 필독!</p>
                                    <ul className="space-y-0.5 list-disc list-inside">
                                      <li>발주 후 정보 변경 불가</li>
                                      <li>오탈자 발견 시 재발주 비용 본인 부담</li>
                                      <li>디자인 수정은 최대 2회까지 가능</li>
                                      <li>3회 이상 수정 시 건당 1만원 추가 비용 발생</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 피드백 섹션 */}
                            <div className="space-y-2">
                              {workflow.feedback && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">제출한 피드백:</p>
                                  <p className="text-xs text-blue-800 whitespace-pre-wrap">{workflow.feedback}</p>
                                  {workflow.feedbackDate && (
                                    <p className="text-[10px] text-blue-600 mt-1">
                                      {new Date(workflow.feedbackDate).toLocaleString("ko-KR")}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">
                                  수정 요청사항 {workflow.feedback ? "(추가 피드백)" : "(선택사항)"}
                                </label>
                                <textarea
                                  value={feedbackText}
                                  onChange={(e) => setFeedbackText(e.target.value)}
                                  placeholder="예: 로고 색상을 파란색으로 변경해주세요"
                                  className="w-full h-20 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-500"
                                />
                                {feedbackText.trim() && (
                                  <Button
                                    onClick={() => handleFeedbackSubmit(workflow.id)}
                                    disabled={submittingFeedback}
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                                  >
                                    {submittingFeedback ? "저장 중..." : "피드백 저장"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                  {workflow.status === "대기" && (
                    <div className="flex-1 text-center text-sm text-gray-500 py-2">
                      {workflow.type === "로고"
                        ? "로고 시안이 영업일 기준 1~2일 내 전달됩니다"
                        : "시안 작업 중입니다"}
                    </div>
                  )}
                  {workflow.status === "시안중" && (
                    <div className="flex-1 text-center text-sm text-gray-500 py-2">
                      {workflow.type === "로고"
                        ? "로고 시안이 영업일 기준 1~2일 내 전달됩니다"
                        : "시안 작업 중입니다"}
                    </div>
                  )}
                  {workflow.status === "발주완료" && (
                    <div className="flex-1 text-center text-sm text-gray-500 py-2">
                      제작 중입니다
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
