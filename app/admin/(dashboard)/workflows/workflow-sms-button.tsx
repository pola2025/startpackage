"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkflowSMSButtonProps {
  workflow: any;
}

export default function WorkflowSMSButton({ workflow }: WorkflowSMSButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const hasDesign = !!workflow.시안URL;

  const handleSendSMS = async () => {
    if (!hasDesign) return;

    setSending(true);
    try {
      const response = await fetch("/api/admin/workflows/send-design-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
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

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSendSMS}
      disabled={!hasDesign || sending}
      className={`border-gray-300 text-gray-700 hover:bg-gray-100 ${
        !hasDesign ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={!hasDesign ? "시안 업로드 후 발송 가능" : "시안 완료 SMS 발송"}
    >
      {sending ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <MessageSquare className="w-3 h-3 mr-1" />
      )}
      SMS 발송
    </Button>
  );
}
