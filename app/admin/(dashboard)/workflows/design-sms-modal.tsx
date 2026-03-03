"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, Package, User, CheckCircle2 } from "lucide-react";

interface Workflow {
  id: string;
  type: string;
  status: string;
  시안URL?: string | null;
  user: {
    id: string;
    이름: string;
    연락처?: string | null;
  };
}

interface DesignSMSModalProps {
  open: boolean;
  onClose: () => void;
  workflows: Workflow[];
  onSuccess?: () => void;
}

interface GroupedUser {
  userId: string;
  userName: string;
  userPhone: string | null;
  workflows: Workflow[];
  selectedWorkflowIds: Set<string>;
}

export default function DesignSMSModal({
  open,
  onClose,
  workflows,
  onSuccess,
}: DesignSMSModalProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    details: { userName: string; types: string[]; success: boolean; error?: string }[];
  } | null>(null);

  // 시안이 있는 워크플로우만 필터링
  const workflowsWithDesign = useMemo(() => {
    return workflows.filter((w) => w.시안URL);
  }, [workflows]);

  // 고객별로 그룹화
  const [groupedUsers, setGroupedUsers] = useState<Map<string, GroupedUser>>(new Map());

  // workflows가 변경될 때마다 groupedUsers 재계산
  useEffect(() => {
    const groups = new Map<string, GroupedUser>();

    workflowsWithDesign.forEach((w) => {
      const userId = w.user.id;
      if (!groups.has(userId)) {
        groups.set(userId, {
          userId,
          userName: w.user.이름,
          userPhone: w.user.연락처 || null,
          workflows: [],
          selectedWorkflowIds: new Set(),
        });
      }
      const group = groups.get(userId)!;
      group.workflows.push(w);
      group.selectedWorkflowIds.add(w.id); // 기본적으로 모두 선택
    });

    setGroupedUsers(groups);
  }, [workflowsWithDesign]);

  // 워크플로우 선택/해제
  const toggleWorkflow = (userId: string, workflowId: string) => {
    setGroupedUsers((prev) => {
      const newMap = new Map(prev);
      const user = newMap.get(userId);
      if (user) {
        const newSelected = new Set(user.selectedWorkflowIds);
        if (newSelected.has(workflowId)) {
          newSelected.delete(workflowId);
        } else {
          newSelected.add(workflowId);
        }
        newMap.set(userId, { ...user, selectedWorkflowIds: newSelected });
      }
      return newMap;
    });
  };

  // 고객 전체 선택/해제
  const toggleUserAll = (userId: string, checked: boolean) => {
    setGroupedUsers((prev) => {
      const newMap = new Map(prev);
      const user = newMap.get(userId);
      if (user) {
        const newSelected = checked
          ? new Set(user.workflows.map((w) => w.id))
          : new Set<string>();
        newMap.set(userId, { ...user, selectedWorkflowIds: newSelected });
      }
      return newMap;
    });
  };

  // 전체 선택된 워크플로우 수
  const totalSelected = useMemo(() => {
    let count = 0;
    groupedUsers.forEach((user) => {
      count += user.selectedWorkflowIds.size;
    });
    return count;
  }, [groupedUsers]);

  // 발송할 고객 수 (선택된 워크플로우가 1개 이상인 고객)
  const usersToSend = useMemo(() => {
    let count = 0;
    groupedUsers.forEach((user) => {
      if (user.selectedWorkflowIds.size > 0 && user.userPhone) {
        count++;
      }
    });
    return count;
  }, [groupedUsers]);

  // SMS 발송
  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      // 고객별로 선택된 워크플로우 정리
      const sendData: { userId: string; workflowIds: string[] }[] = [];

      groupedUsers.forEach((user) => {
        if (user.selectedWorkflowIds.size > 0 && user.userPhone) {
          sendData.push({
            userId: user.userId,
            workflowIds: Array.from(user.selectedWorkflowIds),
          });
        }
      });

      if (sendData.length === 0) {
        alert("발송할 대상이 없습니다.");
        setSending(false);
        return;
      }

      const response = await fetch("/api/admin/workflows/send-design-sms-grouped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: sendData }),
      });

      if (!response.ok) {
        throw new Error("SMS 발송 실패");
      }

      const resultData = await response.json();
      setResult(resultData);

      if (resultData.success > 0) {
        onSuccess?.();
      }
    } catch (error) {
      console.error("SMS 발송 에러:", error);
      alert("SMS 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  // 시안이 없는 워크플로우 안내
  const workflowsWithoutDesign = workflows.filter((w) => !w.시안URL);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-600" />
            시안 완료 SMS 발송
          </DialogTitle>
          <DialogDescription>
            발송할 시안을 선택하세요. 같은 고객에게는 선택된 시안 목록을 종합하여 1건의 SMS로 발송됩니다.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // 발송 결과
          <div className="py-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-gray-900">발송 완료</h3>
              <p className="text-gray-600 mt-1">
                성공 {result.success}건 / 실패 {result.failed}건
              </p>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {result.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      detail.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{detail.userName}</span>
                      </div>
                      <Badge variant={detail.success ? "default" : "destructive"}>
                        {detail.success ? "성공" : "실패"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {detail.types.join(", ")}
                    </div>
                    {detail.error && (
                      <div className="mt-1 text-sm text-red-600">{detail.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-6">
              <Button onClick={handleClose}>닫기</Button>
            </DialogFooter>
          </div>
        ) : (
          // 발송 선택
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {Array.from(groupedUsers.values()).map((user) => {
                  const allSelected = user.selectedWorkflowIds.size === user.workflows.length;
                  const someSelected = user.selectedWorkflowIds.size > 0 && !allSelected;
                  const hasPhone = !!user.userPhone;

                  return (
                    <div
                      key={user.userId}
                      className={`border rounded-lg p-4 ${
                        !hasPhone ? "bg-gray-50 opacity-60" : "bg-white"
                      }`}
                    >
                      {/* 고객 헤더 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => {
                              if (el) {
                                (el as any).indeterminate = someSelected;
                              }
                            }}
                            onCheckedChange={(checked) =>
                              toggleUserAll(user.userId, checked as boolean)
                            }
                            disabled={!hasPhone}
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gold-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.userName}</div>
                              <div className="text-xs text-gray-500">
                                {user.userPhone || "연락처 없음"}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {user.selectedWorkflowIds.size}/{user.workflows.length}개 선택
                        </Badge>
                      </div>

                      {/* 워크플로우 목록 */}
                      <div className="ml-8 space-y-2">
                        {user.workflows.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={user.selectedWorkflowIds.has(w.id)}
                              onCheckedChange={() => toggleWorkflow(user.userId, w.id)}
                              disabled={!hasPhone}
                            />
                            <Badge variant="outline" className="text-gray-700">
                              <Package className="w-3 h-3 mr-1" />
                              {w.type}
                            </Badge>
                            <span className="text-sm text-gray-500">{w.status}</span>
                          </div>
                        ))}
                      </div>

                      {!hasPhone && (
                        <div className="mt-2 text-sm text-red-500 ml-8">
                          ⚠️ 연락처가 없어 SMS 발송이 불가합니다.
                        </div>
                      )}
                    </div>
                  );
                })}

                {workflowsWithoutDesign.length > 0 && (
                  <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="text-sm text-gray-500 mb-2">
                      ⚠️ 시안이 업로드되지 않은 워크플로우 ({workflowsWithoutDesign.length}개)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workflowsWithoutDesign.slice(0, 5).map((w) => (
                        <Badge key={w.id} variant="outline" className="text-gray-400">
                          {w.user.이름} - {w.type}
                        </Badge>
                      ))}
                      {workflowsWithoutDesign.length > 5 && (
                        <Badge variant="outline" className="text-gray-400">
                          +{workflowsWithoutDesign.length - 5}개
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                {totalSelected}개 시안 선택 → <strong>{usersToSend}명</strong>에게 SMS 발송
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={sending}>
                  취소
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || usersToSend === 0}
                  className="bg-navy-900 hover:bg-navy-800"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      발송 중...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      SMS 발송 ({usersToSend}명)
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
