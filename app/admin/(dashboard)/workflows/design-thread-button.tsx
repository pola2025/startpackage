"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Palette, Loader2 } from "lucide-react";

interface DesignThreadButtonProps {
  workflowId: string;
  status: string;
  type: string;
}

export default function DesignThreadButton({
  workflowId,
  status,
  type,
}: DesignThreadButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 시안중 상태이고, 로고/홈페이지가 아닌 인쇄물 워크플로우만 표시
  const shouldShow =
    status === "시안중" && type !== "로고" && type !== "홈페이지";

  if (!shouldShow) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      // DesignThread 생성 (이미 있으면 기존 것 반환)
      const response = await fetch("/api/design-threads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "시안 쓰레드 생성 실패");
      }

      // 시안관리 페이지로 이동
      router.push("/admin/design-threads");
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="border-purple-300 text-purple-700 hover:bg-purple-50"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Palette className="w-3 h-3 mr-1" />
      )}
      시안관리
    </Button>
  );
}
