"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, CheckCircle2 } from "lucide-react";

interface PrintRequestButtonProps {
  completionRate: number;
  hasWorkflows: boolean;
}

export default function PrintRequestButton({
  completionRate,
  hasWorkflows,
}: PrintRequestButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePrintRequest = async () => {
    if (completionRate !== 100) {
      alert("필수 자료를 모두 제출해주세요.");
      return;
    }

    if (
      !confirm(
        "디자인 시안 제작을 요청하시겠습니까?\n\n요청 후에는 제출 자료를 수정할 수 없습니다."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: true }),
      });

      if (res.ok) {
        alert("디자인 시안 제작요청이 완료되었습니다!\n\n영업일 2일 후 시안 전달 예정입니다.");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "제작요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Print request failed:", error);
      alert("제작요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 완성도 100% 미만이면 버튼 숨김
  if (completionRate !== 100) {
    return null;
  }

  // 이미 제작요청이 완료되었으면 버튼 숨김
  if (hasWorkflows) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center text-green-600 text-2xl font-bold">
        <span className="animate-arrow-1">&#x226B;</span>
        <span className="animate-arrow-2">&#x226B;</span>
        <span className="animate-arrow-3">&#x226B;</span>
      </div>
      <Button
        onClick={handlePrintRequest}
        disabled={loading}
        className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 text-lg rounded-lg border-2 border-green-500 shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            제작요청 중...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-6 h-6 mr-2" />
            디자인 시안 제작요청
          </>
        )}
      </Button>
    </div>
  );
}
