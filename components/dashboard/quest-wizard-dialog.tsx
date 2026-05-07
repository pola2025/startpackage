"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestStep {
  field: string;
  label: string;
  description?: string;
  type: "text" | "textarea" | "tel" | "email" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** 검증 함수 — 반환값이 string이면 에러 메시지 */
  validate?: (value: string) => string | null;
}

interface QuestWizardDialogProps {
  open: boolean;
  onClose: () => void;
  /** 모달 제목 */
  title: string;
  /** 부제 */
  description?: string;
  /** 위자드 스텝 목록 */
  steps: QuestStep[];
  /** 현재 저장된 값 (있으면 prefill) */
  initialValues?: Record<string, string | null | undefined>;
  /** 모달 완료 시 호출 */
  onComplete?: () => void;
}

export default function QuestWizardDialog({
  open,
  onClose,
  title,
  description,
  steps,
  initialValues,
  onComplete,
}: QuestWizardDialogProps) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 모달 열릴 때 초기값 세팅
  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      steps.forEach((s) => {
        const v = initialValues?.[s.field];
        if (v) init[s.field] = String(v);
      });
      setValues(init);
      setCurrentIdx(0);
      setError(null);
    }
  }, [open, steps, initialValues]);

  if (steps.length === 0) return null;

  const step = steps[currentIdx];
  const currentValue = values[step.field] ?? "";
  const isLast = currentIdx === steps.length - 1;
  const isFirst = currentIdx === 0;
  const progress = ((currentIdx + 1) / steps.length) * 100;

  const setValue = (v: string) => {
    setValues((prev) => ({ ...prev, [step.field]: v }));
    setError(null);
  };

  const validate = (): boolean => {
    if (step.required && !currentValue.trim()) {
      setError("필수 입력 항목입니다.");
      return false;
    }
    if (step.validate) {
      const msg = step.validate(currentValue);
      if (msg) {
        setError(msg);
        return false;
      }
    }
    return true;
  };

  const saveCurrent = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [step.field]: currentValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "저장에 실패했습니다.");
        return false;
      }
      return true;
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!validate()) return;
    const ok = await saveCurrent();
    if (!ok) return;
    if (isLast) {
      onComplete?.();
      onClose();
      router.refresh();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIdx((i) => i - 1);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-gray-600">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* 진행 표시 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-navy-700">
              {currentIdx + 1} / {steps.length} 단계
            </span>
            <span className="text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="space-y-3 py-2">
          <Label htmlFor={step.field} className="text-sm font-semibold">
            {step.label}
            {step.required && <span className="text-rose-500 ml-1">*</span>}
          </Label>
          {step.description && (
            <p className="text-xs text-gray-600 -mt-1.5">{step.description}</p>
          )}

          {step.type === "textarea" ? (
            <Textarea
              id={step.field}
              value={currentValue}
              onChange={(e) => setValue(e.target.value)}
              placeholder={step.placeholder}
              rows={4}
              className="resize-none"
              autoFocus
            />
          ) : step.type === "select" ? (
            <select
              id={step.field}
              value={currentValue}
              onChange={(e) => setValue(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm"
              autoFocus
            >
              <option value="">선택해주세요</option>
              {step.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={step.field}
              type={step.type}
              value={currentValue}
              onChange={(e) => setValue(e.target.value)}
              placeholder={step.placeholder}
              autoFocus
            />
          )}

          {error && <p className="text-xs text-rose-600 mt-1">⚠ {error}</p>}
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={isFirst || saving}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </Button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  idx < currentIdx
                    ? "bg-navy-600"
                    : idx === currentIdx
                      ? "bg-navy-400"
                      : "bg-gray-200",
                )}
              />
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={saving}
            className="gap-1 bg-navy-700 hover:bg-navy-800"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLast ? (
              <>
                완료 <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                다음 <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === 미리 정의된 step 묶음 ===

export const BASIC_INFO_STEPS: QuestStep[] = [
  {
    field: "브랜드명",
    label: "브랜드명",
    description: "사업장에서 사용하는 정식 브랜드명을 입력해주세요.",
    type: "text",
    placeholder: "예) 폴라애드",
    required: true,
  },
  {
    field: "업종",
    label: "업종",
    description: "사업자등록증에 기재된 업종을 입력해주세요.",
    type: "text",
    placeholder: "예) 광고 대행업",
    required: true,
  },
  {
    field: "주소",
    label: "사업장 주소",
    description: "정식 사업장 주소를 입력해주세요.",
    type: "text",
    placeholder: "예) 서울특별시 강남구 …",
    required: true,
  },
  {
    field: "대표번호",
    label: "대표 연락처",
    description: "명함·홈페이지에 표기될 대표 연락처를 입력해주세요.",
    type: "tel",
    placeholder: "예) 02-0000-0000",
    required: true,
  },
];

export const HOMEPAGE_INFO_STEPS: QuestStep[] = [
  {
    field: "홈페이지스타일",
    label: "홈페이지 스타일",
    description: "원하시는 홈페이지 스타일을 선택해주세요.",
    type: "select",
    required: true,
    options: [
      { value: "기본스타일", label: "기본 스타일 (폴라애드 추천)" },
      { value: "모던", label: "모던 / 미니멀" },
      { value: "클래식", label: "클래식 / 정통" },
      { value: "친근", label: "친근 / 캐주얼" },
    ],
  },
  {
    field: "홈페이지컬러컨셉",
    label: "메인 컬러",
    description:
      "원하시는 메인 컬러를 16진수 코드(예: #1e3a5f)로 입력해주세요.",
    type: "text",
    placeholder: "#1e3a5f",
    required: true,
    validate: (v) =>
      /^#[0-9A-Fa-f]{6}$/.test(v)
        ? null
        : "올바른 컬러 코드(예: #1e3a5f)를 입력하세요.",
  },
  {
    field: "도메인주소",
    label: "도메인 주소",
    description:
      "사용하실 도메인 주소를 입력해주세요. (없으시면 안내 후 등록 도와드립니다)",
    type: "text",
    placeholder: "예) www.mybrand.co.kr",
    required: false,
  },
];

export const MARKETING_INFO_STEPS: QuestStep[] = [
  {
    field: "네이버검색광고ID",
    label: "네이버 검색광고 ID",
    description: "이미 사용 중인 ID가 있으면 입력, 없으면 비워두셔도 됩니다.",
    type: "text",
    placeholder: "예) brand_marketing",
    required: false,
  },
  {
    field: "InstagramID",
    label: "인스타그램 ID",
    description: "사업장 공식 인스타그램 계정이 있으면 입력해주세요.",
    type: "text",
    placeholder: "예) @brand_official",
    required: false,
  },
];
