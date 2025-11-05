"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Truck, Loader2 } from "lucide-react";
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

interface UserShippingSMSButtonProps {
  userId: string;
  userName: string;
  userPhone: string;
  workflows: any[];
}

export default function UserShippingSMSButton({
  userId,
  userName,
  userPhone,
  workflows,
}: UserShippingSMSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 배송 정보가 입력된 워크플로우만 필터링
  const shippingWorkflows = workflows.filter(
    (w) => w.택배회사 && w.운송장번호
  );

  // 배송 정보가 없으면 버튼 비활성화
  if (shippingWorkflows.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="h-7 px-1.5 text-[10px]">
        <Truck className="w-3 h-3 mr-0.5" />
        배송정보 없음
      </Button>
    );
  }

  const handleSendSMS = async () => {
    setIsSending(true);

    try {
      const response = await fetch("/api/admin/workflows/send-shipping-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "SMS 발송 실패");
      }

      alert(`✅ ${data.message}`);
      setIsOpen(false);
    } catch (error: any) {
      console.error("SMS 발송 에러:", error);
      alert(`❌ SMS 발송 실패: ${error.message}`);
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
        className="h-7 px-1.5 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-50"
      >
        <Truck className="w-3 h-3 mr-0.5" />
        배송정보
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배송 정보 SMS 발송</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong>{userName}</strong>님의 배송 정보를 SMS로 발송하시겠습니까?
              </p>

              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  발송될 배송 정보:
                </p>
                {shippingWorkflows.map((workflow, index) => (
                  <div
                    key={workflow.id}
                    className="text-sm text-gray-600 border-l-2 border-blue-400 pl-3"
                  >
                    <p className="font-medium">[{workflow.type}]</p>
                    <p>택배: {workflow.택배회사}</p>
                    <p>운송장: {workflow.운송장번호}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-600">
                수신 번호: <strong>{userPhone}</strong>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSendSMS();
              }}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                "SMS 발송"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
