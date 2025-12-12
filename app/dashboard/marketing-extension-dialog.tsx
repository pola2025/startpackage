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
import { Calendar, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// 연장 기간 옵션
type ExtensionOption = {
  months: number;
  totalPrice: number;
  monthlyPrice: number;
  label: string;
  badge?: string;
};

const EXTENSION_OPTIONS: ExtensionOption[] = [
  { months: 3, totalPrice: 660000, monthlyPrice: 220000, label: "3개월" },
  { months: 6, totalPrice: 990000, monthlyPrice: 165000, label: "6개월", badge: "인기" },
  { months: 12, totalPrice: 1320000, monthlyPrice: 110000, label: "12개월", badge: "최저가" },
];

interface MarketingExtensionDialogProps {
  currentEndDate: Date;
  newEndDate?: Date; // optional로 변경 (선택한 개월수에 따라 동적 계산)
}

export default function MarketingExtensionDialog({
  currentEndDate,
}: MarketingExtensionDialogProps) {
  const [open, setOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(3);

  // 선택한 옵션 정보
  const selectedOption = EXTENSION_OPTIONS.find(opt => opt.months === selectedMonths)!;

  // 연장 후 종료일 계산
  const calculatedEndDate = new Date(currentEndDate);
  calculatedEndDate.setMonth(calculatedEndDate.getMonth() + selectedMonths);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/marketing-extension/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestMessage, months: selectedMonths }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("연장 신청이 완료되었습니다. 관리자 검토 후 결과를 안내드립니다.");
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
        <Button className="bg-blue-600 hover:bg-blue-700">
          연장 신청
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">마케팅 지원 연장 신청</DialogTitle>
          <DialogDescription className="text-sm">
            원하시는 기간을 선택해주세요. 장기 결제 시 할인 혜택이 적용됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 기간 선택 */}
          <div className="space-y-2">
            <Label>연장 기간 선택</Label>
            <div className="grid grid-cols-3 gap-2">
              {EXTENSION_OPTIONS.map((option) => (
                <button
                  key={option.months}
                  type="button"
                  onClick={() => setSelectedMonths(option.months)}
                  className={cn(
                    "relative p-3 rounded-lg border-2 transition-all text-left",
                    selectedMonths === option.months
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {option.badge && (
                    <span className={cn(
                      "absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold rounded-full",
                      option.badge === "최저가" ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                    )}>
                      {option.badge}
                    </span>
                  )}
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="text-xs text-gray-500">
                    월 {(option.monthlyPrice / 10000).toFixed(1)}만원
                  </div>
                  {selectedMonths === option.months && (
                    <Check className="absolute top-2 right-2 w-4 h-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 정보 */}
          <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">현재 종료일</span>
              <span className="text-sm font-semibold text-gray-900">
                {currentEndDate.toLocaleDateString("ko-KR")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">연장 후 종료일</span>
              <span className="text-sm font-semibold text-blue-600">
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
            <p className="text-sm font-medium text-yellow-900 mb-2">결제 정보</p>
            <div className="space-y-1 text-sm text-gray-700">
              <p>계좌번호: <span className="font-semibold">우리은행 1005-302-954803</span></p>
              <p>예금주: <span className="font-semibold">폴라애드(이재호)</span></p>
              <p>금액: <span className="font-semibold text-blue-600">
                {selectedOption.totalPrice.toLocaleString()}원 (VAT 포함, {selectedOption.label})
              </span></p>
              <p className="text-xs text-gray-600 mt-2">
                월 {selectedOption.monthlyPrice.toLocaleString()}원 (VAT 포함)
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
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
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
