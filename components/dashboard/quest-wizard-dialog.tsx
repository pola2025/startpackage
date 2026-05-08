"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestStep {
  field: string;
  label: string;
  description?: string;
  type:
    | "text"
    | "textarea"
    | "tel"
    | "email"
    | "select"
    | "file"
    | "account-holder";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** file step accept (예: "image/*,application/pdf") */
  accept?: string;
  /** account-holder step에서 사용: 사업자대표명 (체크박스 라벨에 표시) */
  representativeName?: string;
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
  /** account-holder step에 표시할 사업자대표명 (선택) */
  representativeName?: string;
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
  representativeName,
  onComplete,
}: QuestWizardDialogProps) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  /** account-holder step의 "사업자대표와 동일" 체크박스 상태 */
  const [holderSame, setHolderSame] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 초기값 세팅
  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      const holderInit: Record<string, boolean> = {};
      steps.forEach((s) => {
        const v = initialValues?.[s.field];
        if (v) init[s.field] = String(v);
        if (s.type === "account-holder") {
          // 값이 비어있으면 "대표와 동일"(체크) 기본, 값이 있으면 "다름"(체크 해제)
          holderInit[s.field] = !v;
        }
      });
      setValues(init);
      setPendingFiles({});
      setHolderSame(holderInit);
      setCurrentIdx(0);
      setError(null);
    }
  }, [open, steps, initialValues]);

  if (steps.length === 0) return null;

  const step = steps[currentIdx];
  const currentValue = values[step.field] ?? "";
  const pendingFile = pendingFiles[step.field];
  const isLast = currentIdx === steps.length - 1;
  const isFirst = currentIdx === 0;
  const progress = ((currentIdx + 1) / steps.length) * 100;

  const setValue = (v: string) => {
    setValues((prev) => ({ ...prev, [step.field]: v }));
    setError(null);
  };

  const setFile = (file: File | null) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      if (file) next[step.field] = file;
      else delete next[step.field];
      return next;
    });
    setError(null);
  };

  const validate = (): boolean => {
    if (step.type === "file") {
      // 이미 업로드되어 있거나, 새 파일을 선택한 경우 통과
      const hasExisting = !!currentValue;
      const hasPending = !!pendingFile;
      if (step.required && !hasExisting && !hasPending) {
        setError("파일을 업로드해주세요.");
        return false;
      }
      return true;
    }
    if (step.type === "account-holder") {
      // 체크박스가 체크되어 있으면 "대표와 동일" — 통과
      // 체크 해제 상태면 명의자명 입력값이 있어야 함
      if (!holderSame[step.field] && !currentValue.trim()) {
        setError("계좌명의자명을 입력해주세요.");
        return false;
      }
      return true;
    }
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

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("field", step.field);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "업로드에 실패했습니다.");
      return null;
    }
    const data = await res.json().catch(() => ({}));
    return data?.url ?? null;
  };

  const saveCurrent = async (): Promise<boolean> => {
    setSaving(true);
    try {
      let valueToSave = currentValue;

      // account-holder step: 체크 시 빈 문자열, 해제 시 입력값 저장
      if (step.type === "account-holder") {
        valueToSave = holderSame[step.field] ? "" : currentValue.trim();
      }

      // file step: 새 파일이 선택된 경우 업로드 → URL(또는 SLACK_ONLY 마커) 받기
      if (step.type === "file") {
        if (pendingFile) {
          const url = await uploadFile(pendingFile);
          if (!url) return false;
          valueToSave = url;
          setValues((prev) => ({ ...prev, [step.field]: url }));
          setPendingFiles((prev) => {
            const next = { ...prev };
            delete next[step.field];
            return next;
          });
          // SLACK_ONLY 마커도 submission에 저장 (필드 non-null 처리)
        } else {
          // 기존 값 유지 — 저장 호출 불필요
          return true;
        }
      }

      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [step.field]: valueToSave }),
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
          ) : step.type === "account-holder" ? (
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={holderSame[step.field] ?? true}
                  onChange={(e) =>
                    setHolderSame((prev) => ({
                      ...prev,
                      [step.field]: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4 accent-navy-600"
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium text-gray-900">
                    계좌명의자가 사업자 대표와 동일합니다
                    {(step.representativeName || representativeName) && (
                      <span className="text-gray-500 font-normal ml-1">
                        ({step.representativeName || representativeName})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    체크 해제하면 명의자명을 직접 입력할 수 있습니다.
                  </div>
                </div>
              </label>
              {!(holderSame[step.field] ?? true) && (
                <Input
                  id={step.field}
                  type="text"
                  value={currentValue}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="예) 홍길동"
                  autoFocus
                />
              )}
            </div>
          ) : step.type === "file" ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={step.accept}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                }}
              />
              {pendingFile ? (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-navy-300 bg-navy-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-navy-700 flex-shrink-0" />
                    <span className="text-xs text-navy-700 truncate">
                      {pendingFile.name}
                    </span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {(pendingFile.size / 1024).toFixed(0)}KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs text-gray-500 hover:text-rose-600"
                  >
                    제거
                  </button>
                </div>
              ) : currentValue ? (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-emerald-700">
                      이미 업로드됨
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-emerald-700 hover:underline"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-gray-300 hover:border-navy-400 hover:bg-navy-50/30 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    파일 선택 (이미지 또는 PDF, 최대 10MB)
                  </span>
                </button>
              )}
            </div>
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
    field: "사업자등록증URL",
    label: "사업자등록증",
    description:
      "사업자등록증 사본(이미지 또는 PDF)을 업로드해주세요. 보안 처리되어 슬랙으로만 전달됩니다.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
  },
  {
    field: "프로필사진URL",
    label: "프로필 사진",
    description:
      "홈페이지·명함에 사용될 대표 프로필 사진을 업로드해주세요. (선명한 정면 사진 권장)",
    type: "file",
    accept: "image/*",
    required: true,
  },
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

export const NAMECARD_ENVELOPE_STEPS: QuestStep[] = [
  {
    field: "명함시안",
    label: "명함 스타일",
    description:
      "기본 정보(브랜드명·업종·주소·대표번호)는 자동으로 반영됩니다. 6종 중 1개를 선택해주세요. 선택한 스타일이 명함과 대봉투에 동일하게 적용됩니다.",
    type: "select",
    required: true,
    options: [
      { value: "스타일 1", label: "스타일 1" },
      { value: "스타일 2", label: "스타일 2" },
      { value: "스타일 3", label: "스타일 3" },
      { value: "스타일 4", label: "스타일 4" },
      { value: "스타일 5", label: "스타일 5" },
      { value: "스타일 6", label: "스타일 6" },
    ],
  },
  {
    field: "명함색상",
    label: "명함 메인 색상",
    description:
      "명함에 사용할 메인 색상을 16진수 코드(#RRGGBB)로 입력해주세요. 예: #1e3a5f",
    type: "text",
    placeholder: "#1e3a5f",
    required: true,
    validate: (v) =>
      /^#[0-9A-Fa-f]{6}$/.test(v)
        ? null
        : "올바른 컬러 코드(예: #1e3a5f)를 입력하세요.",
  },
];

export const CONTRACT_STEPS: QuestStep[] = [
  {
    field: "은행명",
    label: "은행명",
    description: "자문계약서에 기재될 입금 계좌의 은행명을 입력해주세요.",
    type: "text",
    placeholder: "예) 국민은행",
    required: true,
  },
  {
    field: "계좌번호",
    label: "계좌번호",
    description: "자문계약서에 기재될 입금 계좌번호를 입력해주세요.",
    type: "text",
    placeholder: "예) 123-456-7890123",
    required: true,
  },
  {
    field: "계좌명의자명",
    label: "계좌 명의자",
    description:
      "사업자 대표와 동일하면 그대로 다음으로, 다르면 체크 해제 후 명의자명을 입력해주세요.",
    type: "account-holder",
    required: false,
  },
];

export const LOGO_INFO_STEPS: QuestStep[] = [
  {
    field: "로고선호스타일",
    label: "로고 스타일",
    description: "원하는 로고 스타일을 선택해주세요.",
    type: "select",
    required: true,
    options: [
      { value: "심볼형 (도형기반)", label: "심볼형 (도형 기반)" },
      { value: "워드마크형 (텍스트)", label: "워드마크형 (텍스트 중심)" },
    ],
  },
  {
    field: "로고선호폰트",
    label: "선호 폰트 느낌",
    description: "로고에 사용할 폰트 스타일을 선택해주세요.",
    type: "select",
    required: true,
    options: [
      { value: "고딕체 (깔끔한)", label: "고딕체 (깔끔한)" },
      { value: "명조체 (전통적인)", label: "명조체 (전통적인)" },
      { value: "손글씨 (감성적인)", label: "손글씨 (감성적인)" },
      { value: "모던 (기하학적)", label: "모던 (기하학적)" },
    ],
  },
  {
    field: "로고선호색상",
    label: "선호 색상",
    description:
      "원하시는 메인 컬러를 16진수 코드(#RRGGBB)로 입력해주세요. 예: #1e3a5f",
    type: "text",
    placeholder: "#1e3a5f",
    required: true,
    validate: (v) =>
      /^#[0-9A-Fa-f]{6}$/.test(v)
        ? null
        : "올바른 컬러 코드(예: #1e3a5f)를 입력하세요.",
  },
  {
    field: "로고제작요청사항",
    label: "추가 요청사항",
    description:
      "로고에 반영하고 싶은 키워드, 분위기, 참고 사례 등을 자유롭게 적어주세요.",
    type: "textarea",
    placeholder: "예) 신뢰감 + 전문성 강조, 참고: 폴라애드 로고",
    required: false,
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
