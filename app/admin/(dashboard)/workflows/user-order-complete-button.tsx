"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserOrderCompleteButtonProps {
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  workflows: any[];
}

export default function UserOrderCompleteButton({
  userId,
  userName,
  userPhone,
  userEmail,
  workflows,
}: UserOrderCompleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 발주완료 상태인 워크플로우만 필터링
  const orderCompleteWorkflows = workflows.filter(
    (w) => w.status === "발주완료"
  );

  // 발주완료 상태가 없으면 버튼 비활성화
  if (orderCompleteWorkflows.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        <CheckCircle2 className="w-4 h-4 mr-2" />
        발주완료 없음
      </Button>
    );
  }

  const handleSendNotification = async () => {
    setIsSending(true);

    try {
      const response = await fetch("/api/admin/workflows/send-order-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "알림 발송 실패");
      }

      alert(`✅ ${data.message}`);
      setIsOpen(false);
    } catch (error: any) {
      console.error("알림 발송 에러:", error);
      alert(`❌ 알림 발송 실패: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="border-green-300 text-green-700 hover:bg-green-50"
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        발주완료 알림
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>발주완료 알림 발송</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong>{userName}</strong>님의 발주완료 알림을 발송하시겠습니까?
              </p>

              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  발송될 제작물:
                </p>
                {orderCompleteWorkflows.map((workflow, index) => (
                  <div
                    key={workflow.id}
                    className="text-sm text-gray-600 border-l-2 border-green-400 pl-3"
                  >
                    <p className="font-medium">[{workflow.type}]</p>
                    <p className="text-xs text-gray-500">발주완료 - 제작 진행중</p>
                  </div>
                ))}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  이메일: <strong>{userEmail || "미등록"}</strong>
                </p>
                <p>
                  SMS: <strong>{userPhone}</strong>
                </p>
              </div>

              <p className="text-xs text-amber-600">
                * 이메일과 SMS가 동시에 발송됩니다
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSendNotification();
              }}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                "알림 발송"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
