"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const EXTENSION_MONTHS = 3;
const MONTHLY_PRICE = 220000;
const TOTAL_PRICE = MONTHLY_PRICE * EXTENSION_MONTHS;

interface MarketingExtensionDialogProps {
  currentEndDate: Date;
  newEndDate?: Date;
}

export default function MarketingExtensionDialog({
  currentEndDate,
}: MarketingExtensionDialogProps) {
  const [open, setOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 연장 후 종료일 계산 (3개월 고정)
  const calculatedEndDate = new Date(currentEndDate);
  calculatedEndDate.setMonth(calculatedEndDate.getMonth() + EXTENSION_MONTHS);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/marketing-extension/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestMessage, months: EXTENSION_MONTHS }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          "연장 신청이 완료되었습니다. 관리자 검토 후 결과를 안내드립니다.",
        );
        setOpen(false);
        setRequestMessage("");
        window.location.reload();
      } else {
        alert(data.error || "연장 신청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Extension request error:", error);
      alert("연장 신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-navy-900 hover:bg-navy-800">연장 신청</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">마케팅 지원 연장 신청</DialogTitle>
          <DialogDescription className="text-sm">
            마케팅 지원은 3개월 단위로 연장됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 연장 상품 안내 */}
          <div className="rounded-lg border-2 border-gold-500 bg-gold-50 p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-base font-semibold text-navy-900">
                3개월 연장
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-navy-900">
                  월 {(MONTHLY_PRICE / 10000).toFixed(0)}만원
                </div>
                <div className="text-xs text-gray-600">VAT 포함</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              3개월 단위 결제만 가능합니다.
            </p>
          </div>

          {/* 날짜 정보 */}
          <div className="space-y-3 bg-gold-50 p-4 rounded-lg border border-gold-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                현재 종료일
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {currentEndDate.toLocaleDateString("ko-KR")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                연장 후 종료일
              </span>
              <span className="text-sm font-semibold text-gold-600">
                {calculatedEndDate.toLocaleDateString("ko-KR")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">요청 메시지 (선택사항)</Label>
            <Textarea
              id="message"
              placeholder="연장 신청에 대한 메시지를 입력하세요..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 결제 정보 */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm font-medium text-yellow-900 mb-2">
              결제 정보
            </p>
            <div className="space-y-1 text-sm text-gray-700">
              <p>
                계좌번호:{" "}
                <span className="font-semibold">우리은행 1005-302-954803</span>
              </p>
              <p>
                예금주: <span className="font-semibold">폴라애드(이재호)</span>
              </p>
              <p>
                금액:{" "}
                <span className="font-semibold text-gold-600">
                  {TOTAL_PRICE.toLocaleString()}원 (VAT 포함, 3개월분)
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-2">
                월 {MONTHLY_PRICE.toLocaleString()}원 (VAT 포함)
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                신청 중...
              </>
            ) : (
              "신청하기"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
