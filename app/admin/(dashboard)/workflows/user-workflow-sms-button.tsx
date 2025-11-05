"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserWorkflowSMSButtonProps {
  userId: string;
  userName: string;
  userPhone: string;
  workflows: any[];
}

export default function UserWorkflowSMSButton({
  userId,
  userName,
  userPhone,
  workflows,
}: UserWorkflowSMSButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  // 시안이 업로드된 워크플로우만 필터링
  const workflowsWithDesign = workflows.filter(w => w.시안URL);
  const hasAnyDesign = workflowsWithDesign.length > 0;

  const handleSendSMS = async () => {
    if (!hasAnyDesign || !userPhone) return;

    if (!confirm(`${userName}님에게 시안 완료 SMS를 발송하시겠습니까?\n(시안 업로드 ${workflowsWithDesign.length}개)`)) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/workflows/send-user-design-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("SMS 발송 실패");
      }

      alert("시안 완료 SMS가 발송되었습니다.");
      router.refresh();
    } catch (error) {
      alert("SMS 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!userPhone) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="h-[28px] px-1.5 text-[10px] border-gray-300 text-gray-400 opacity-50 cursor-not-allowed leading-none"
        title="연락처가 등록되지 않았습니다"
      >
        <MessageSquare className="w-3 h-3 mr-0.5" />
        연락처 없음
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSendSMS}
      disabled={!hasAnyDesign || sending}
      className={`h-[28px] px-1.5 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-50 leading-none ${
        !hasAnyDesign ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={!hasAnyDesign ? "시안 업로드된 워크플로우가 없습니다" : `${workflowsWithDesign.length}개 시안 SMS 발송`}
    >
      {sending ? (
        <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />
      ) : (
        <MessageSquare className="w-3 h-3 mr-0.5" />
      )}
      시안완료
    </Button>
  );
}
