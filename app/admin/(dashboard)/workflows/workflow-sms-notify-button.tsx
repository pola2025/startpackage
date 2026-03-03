"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkflowSMSNotifyButtonProps {
  workflows: any[];
}

export default function WorkflowSMSNotifyButton({ workflows }: WorkflowSMSNotifyButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  // 시안이 업로드된 워크플로우만 필터링
  const workflowsWithDesign = workflows.filter(w => w.시안URL);
  const hasAnyDesign = workflowsWithDesign.length > 0;

  const handleSendSMS = async () => {
    if (!hasAnyDesign) return;

    if (!confirm(`시안이 업로드된 ${workflowsWithDesign.length}개의 워크플로우에 대해 SMS를 발송하시겠습니까?`)) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/workflows/send-design-sms-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowIds: workflowsWithDesign.map(w => w.id),
        }),
      });

      if (!response.ok) {
        throw new Error("SMS 발송 실패");
      }

      const result = await response.json();
      alert(`SMS 발송 완료\n성공: ${result.success}건\n실패: ${result.failed}건`);
      router.refresh();
    } catch (error) {
      alert("SMS 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSendSMS}
      disabled={!hasAnyDesign || sending}
      className={`border-gold-300 text-gold-700 hover:bg-gold-50 ${
        !hasAnyDesign ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={!hasAnyDesign ? "시안 업로드된 워크플로우가 없습니다" : `${workflowsWithDesign.length}개 워크플로우에 SMS 발송`}
    >
      {sending ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <MessageSquare className="w-3 h-3 mr-1" />
      )}
      시안완료 SMS 발송
    </Button>
  );
}
