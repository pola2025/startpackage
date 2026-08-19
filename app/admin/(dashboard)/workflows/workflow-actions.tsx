"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Truck,
  CheckCircle2,
  Upload,
  Loader2,
  Clock,
  MessageSquare,
  ExternalLink,
  Globe,
  Trash2,
} from "lucide-react";
import { resolveAdminWorkflowStatus } from "@/lib/workflow/homepage-status";

interface DesignHistory {
  id: string;
  version: number;
  fileUrl: string;
  uploadedByName: string;
  createdAt: string;
}

interface WorkflowActionsProps {
  workflow: any;
}

export default function WorkflowActions({ workflow }: WorkflowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [designHistory, setDesignHistory] = useState<DesignHistory[]>([]);

  const [status, setStatus] = useState(workflow.status);
  const [택배회사, set택배회사] = useState(workflow.택배회사 || "");
  const [운송장번호, set운송장번호] = useState(workflow.운송장번호 || "");
  const [시안파일, set시안파일] = useState<File | null>(null);
  const [홈페이지URL, set홈페이지URL] = useState(workflow.시안URL || "");
  const [submission, setSubmission] = useState<any>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  // 시안 이력 불러오기
  useEffect(() => {
    if (open) {
      fetchDesignHistory();
      if (workflow.type === "홈페이지") {
        fetchSubmission();
      }
    }
  }, [open]);

  const fetchDesignHistory = async () => {
    try {
      const response = await fetch(
        `/api/admin/workflows/${workflow.id}/design-history`,
      );
      if (response.ok) {
        const data = await response.json();
        setDesignHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch design history:", error);
    }
  };

  const handleDeleteDesign = async (historyId: string, version: number) => {
    if (
      !confirm(
        `${version}차 시안을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    setDeleting(historyId);
    try {
      const response = await fetch(
        `/api/admin/workflows/${workflow.id}/design-history?historyId=${historyId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "삭제 실패");
      }

      // 이력 다시 불러오기
      await fetchDesignHistory();
      router.refresh();
    } catch (error: any) {
      alert(error.message || "시안 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(null);
    }
  };

  const fetchSubmission = async () => {
    setLoadingSubmission(true);
    try {
      const response = await fetch(
        `/api/admin/users/${workflow.userId}/submission`,
      );
      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    } finally {
      setLoadingSubmission(false);
    }
  };

  const handleFileUpload = async () => {
    if (!시안파일) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", 시안파일);
      formData.append("workflowId", workflow.id);

      const response = await fetch("/api/admin/upload-design", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("업로드 실패");

      const data = await response.json();
      return data.url;
    } catch (error) {
      alert("시안 업로드에 실패했습니다.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFeedbackRead = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/workflows/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          status: workflow.status,
          feedbackRead: true,
        }),
      });

      if (!response.ok) {
        throw new Error("피드백 확인 처리 실패");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      alert("피드백 확인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let 시안URL = workflow.시안URL;

      // 홈페이지 타입이면 URL 사용
      if (workflow.type === "홈페이지") {
        시안URL = 홈페이지URL;
      } else if (시안파일) {
        // 새 시안 파일이 있으면 업로드
        const uploadedUrl = await handleFileUpload();
        if (!uploadedUrl) {
          setLoading(false);
          return;
        }
        시안URL = uploadedUrl;
      }

      const nextStatus = resolveAdminWorkflowStatus(
        workflow.type,
        status,
        시안URL,
      );

      const response = await fetch("/api/admin/workflows/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          status: nextStatus,
          택배회사: 택배회사 || null,
          운송장번호: 운송장번호 || null,
          시안URL: 시안URL || null,
        }),
      });

      if (!response.ok) {
        throw new Error("업데이트 실패");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      alert("업데이트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <Edit className="w-3 h-3 mr-1" />
          수정
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200 max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl text-gray-900">
            워크플로우 수정
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {workflow.user.이름} - {workflow.type}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 mt-4">
          {/* Revision Count Warning */}
          {workflow.수정횟수 >= 2 && (
            <div
              className={`p-3 rounded-lg border ${workflow.수정횟수 > 2 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
            >
              <p
                className={`text-sm font-medium ${workflow.수정횟수 > 2 ? "text-red-700" : "amber-700"}`}
              >
                {workflow.수정횟수 > 2
                  ? `⚠️ 수정 ${workflow.수정횟수}회 - 유료 작업으로 진행됩니다`
                  : "⚠️ 수정 2회 완료 - 다음 수정부터는 유료 작업으로 진행됩니다"}
              </p>
            </div>
          )}

          {/* 홈페이지 선택 정보 */}
          {workflow.type === "홈페이지" && (
            <div className="p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-gold-600" />
                <Label className="text-navy-900 font-semibold text-base">
                  홈페이지 선택 정보
                </Label>
              </div>
              {loadingSubmission ? (
                <p className="text-sm text-navy-700">정보를 불러오는 중...</p>
              ) : submission ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-navy-900">
                      선택한 스타일:
                    </span>
                    {submission.홈페이지스타일 ? (
                      <a
                        href={submission.홈페이지스타일}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 mt-1 text-gold-600 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm">
                          {(() => {
                            const styles = [
                              {
                                url: "https://www.jnipartners.co.kr",
                                name: "스타일 1",
                              },
                              {
                                url: "https://bizcoaching.co.kr/",
                                name: "스타일 2",
                              },
                              {
                                url: "https://startpackage-demo-style3.vercel.app/",
                                name: "스타일 3",
                              },
                              {
                                url: "https://biznuri.co.kr/",
                                name: "스타일 4",
                              },
                              {
                                url: "https://www.wiztion.com/",
                                name: "스타일 5",
                              },
                              {
                                url: "https://brpartners.kr/",
                                name: "스타일 6",
                              },
                              {
                                url: "https://startpackagedemo.vercel.app/",
                                name: "스타일 7",
                              },
                              {
                                url: "https://hopebizgroup.com/",
                                name: "스타일 8",
                              },
                              {
                                url: "https://gopartners.cc/",
                                name: "스타일 9",
                              },
                              // 레거시 (이전 데이터 호환용)
                              {
                                url: "https://startpackage-demo2.vercel.app/",
                                name: "스타일 8",
                              },
                              {
                                url: "https://startpackage-demo3.vercel.app/",
                                name: "스타일 9",
                              },
                            ];
                            return (
                              styles.find(
                                (s) => s.url === submission.홈페이지스타일,
                              )?.name || submission.홈페이지스타일
                            );
                          })()}
                        </span>
                      </a>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">선택 안됨</p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-navy-900">
                      컬러 컨셉:
                    </span>
                    {submission.홈페이지컬러컨셉 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-10 h-10 rounded-lg border border-gray-300 shadow-sm"
                          style={{
                            backgroundColor: submission.홈페이지컬러컨셉,
                          }}
                        />
                        <span className="text-sm font-mono text-navy-800">
                          {submission.홈페이지컬러컨셉}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">선택 안됨</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-navy-700">제출 정보 없음</p>
              )}
            </div>
          )}

          {/* Feedback */}
          {workflow.feedback && (
            <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <Label className="text-orange-900 font-semibold">
                      사용자 피드백
                      {workflow.feedbackRead && (
                        <span className="ml-2 text-xs font-normal text-orange-700">
                          (확인 완료)
                        </span>
                      )}
                    </Label>
                  </div>
                  <p className="text-sm text-orange-800 whitespace-pre-wrap">
                    {workflow.feedback}
                  </p>
                  {workflow.feedbackDate && (
                    <p className="text-xs text-orange-600 mt-2">
                      작성일:{" "}
                      {new Date(workflow.feedbackDate).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
                {!workflow.feedbackRead && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFeedbackRead}
                    disabled={loading}
                    className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    확인 완료
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Design History */}
          {designHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-700">시안 업로드 이력</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {designHistory.map((history) => (
                  <div
                    key={history.id}
                    className="p-3 rounded bg-gray-50 border border-gray-200 text-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <a
                        href={history.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold-600 hover:underline font-medium"
                      >
                        {history.version}차시안
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteDesign(history.id, history.version)
                        }
                        disabled={deleting === history.id}
                        className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === history.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          제공일:{" "}
                          {new Date(history.createdAt).toLocaleDateString(
                            "ko-KR",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              weekday: "short",
                            },
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>
                          업로드 시간:{" "}
                          {new Date(history.createdAt).toLocaleTimeString(
                            "ko-KR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                      <div>업로드: {history.uploadedByName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Design Upload - 홈페이지는 URL 입력, 나머지는 파일 업로드 */}
          {workflow.type === "홈페이지" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <Label className="text-gray-700">홈페이지 URL</Label>
              </div>
              {workflow.시안URL && (
                <div className="p-2 rounded bg-green-50 border border-green-200 text-sm">
                  <a
                    href={workflow.시안URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    현재 홈페이지 보기
                  </a>
                </div>
              )}
              <Input
                value={홈페이지URL}
                onChange={(e) => set홈페이지URL(e.target.value)}
                placeholder="https://example.com"
                className="bg-white border-gray-300"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-gray-600" />
                  <Label className="text-gray-700">새 시안 업로드</Label>
                </div>
                <span className="text-xs text-gray-500">
                  수정 {workflow.수정횟수}/2회 (무료)
                </span>
              </div>
              {workflow.시안URL && !시안파일 && (
                <div className="p-2 rounded bg-green-50 border border-green-200 text-sm">
                  <a
                    href={workflow.시안URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    현재 시안 보기 (
                    {designHistory.length > 0
                      ? `${designHistory.length}차시안`
                      : "최초 시안"}
                    )
                  </a>
                </div>
              )}
              <label className="block">
                <input
                  type="file"
                  accept=".ai,.jpeg,.jpg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      set시안파일(e.target.files[0]);
                    }
                  }}
                  disabled={uploading || loading}
                />
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-all">
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                      <span className="text-gray-600">업로드 중...</span>
                    </>
                  ) : 시안파일 ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-green-600">{시안파일.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-600">
                        시안 파일 업로드 (AI, JPEG, PNG)
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-gray-700">상태</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {workflow.type === "홈페이지" ? (
                  <>
                    <SelectItem value="제작 진행 중">제작 진행 중</SelectItem>
                    <SelectItem value="제작 완료">제작 완료</SelectItem>
                  </>
                ) : workflow.type === "로고" ? (
                  <>
                    <SelectItem value="대기">대기</SelectItem>
                    <SelectItem value="시안제작중">시안제작 중</SelectItem>
                    <SelectItem value="시안컨펌요청">시안컨펌요청</SelectItem>
                    <SelectItem value="최종확정">
                      최종확정 (로고 확정)
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="대기">대기</SelectItem>
                    <SelectItem value="시안중">시안 작업중</SelectItem>
                    <SelectItem value="발주대기">
                      발주대기 (시안완료)
                    </SelectItem>
                    <SelectItem value="발주완료">발주완료</SelectItem>
                    <SelectItem value="발송완료">발송완료</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Shipping Info - 로고와 홈페이지는 배송 정보 불필요 */}
          {workflow.type !== "로고" && workflow.type !== "홈페이지" && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-gray-600" />
                <Label className="text-gray-700">배송 정보</Label>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="courier" className="text-sm text-gray-600">
                    택배회사
                  </Label>
                  <Select value={택배회사} onValueChange={set택배회사}>
                    <SelectTrigger
                      id="courier"
                      className="bg-white border-gray-300"
                    >
                      <SelectValue placeholder="택배회사 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="CJ대한통운">CJ대한통운</SelectItem>
                      <SelectItem value="우체국택배">우체국택배</SelectItem>
                      <SelectItem value="로젠택배">로젠택배</SelectItem>
                      <SelectItem value="한진택배">한진택배</SelectItem>
                      <SelectItem value="롯데택배">롯데택배</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking" className="text-sm text-gray-600">
                    운송장번호
                  </Label>
                  <Input
                    id="tracking"
                    value={운송장번호}
                    onChange={(e) => set운송장번호(e.target.value)}
                    placeholder="운송장번호 입력"
                    className="bg-white border-gray-300 focus:border-gray-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-gray-300 hover:bg-gray-100"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-navy-900 text-white hover:bg-navy-800"
            >
              {loading ? "처리 중..." : "저장"}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
