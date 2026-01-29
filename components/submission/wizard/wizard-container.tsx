"use client";

import { useState, useEffect, useCallback } from "react";
import { WizardProvider, useWizard, WIZARD_STEPS } from "./wizard-context";
import { WizardProgress, WizardProgressCompact } from "./wizard-progress";
import { WizardStep } from "./wizard-step";
import { WizardNavigation, WizardModeToggle } from "./wizard-navigation";
import {
  StepBrand,
  StepContact,
  StepDocuments,
  StepLogo,
  StepNamecard,
  StepProfile,
  StepMarketing,
} from "./steps";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WizardContainer - Wizard 모드 전체 컨테이너
 *
 * 기능:
 * - 7단계 스텝 렌더링
 * - 자동 저장 상태 표시
 * - 모드 전환 (Wizard ↔ Tab)
 */

interface WizardContainerProps {
  submission: any;
  formData: any;
  onInputChange: (field: string, value: string) => void;
  onFileUpload: (field: string, file: File) => Promise<void>;
  onSubmit: () => Promise<void>;
  lastSaved?: Date | null;
  isSaving?: boolean;
  onModeChange?: (isWizardMode: boolean) => void;
}

export function WizardContainer({
  submission,
  formData,
  onInputChange,
  onFileUpload,
  onSubmit,
  lastSaved,
  isSaving,
  onModeChange,
}: WizardContainerProps) {
  return (
    <WizardProvider submission={submission}>
      <WizardInner
        submission={submission}
        formData={formData}
        onInputChange={onInputChange}
        onFileUpload={onFileUpload}
        onSubmit={onSubmit}
        lastSaved={lastSaved}
        isSaving={isSaving}
        onModeChange={onModeChange}
      />
    </WizardProvider>
  );
}

/**
 * WizardInner - Provider 내부 컴포넌트
 */
function WizardInner({
  submission,
  formData,
  onInputChange,
  onFileUpload,
  onSubmit,
  lastSaved,
  isSaving,
  onModeChange,
}: WizardContainerProps) {
  const { currentStepIndex, isWizardMode, setLastSavedAt } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 자동 저장 시간 동기화
  useEffect(() => {
    if (lastSaved) {
      setLastSavedAt(lastSaved);
    }
  }, [lastSaved, setLastSavedAt]);

  // 완료 처리
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모드 전환 처리
  const handleModeToggle = () => {
    onModeChange?.(!isWizardMode);
  };

  // 현재 스텝에 맞는 컴포넌트 렌더링
  const renderCurrentStep = () => {
    const stepId = WIZARD_STEPS[currentStepIndex].id;

    switch (stepId) {
      case "brand":
        return (
          <StepBrand
            formData={formData}
            onChange={onInputChange}
            errors={errors}
          />
        );
      case "contact":
        return (
          <StepContact
            formData={formData}
            onChange={onInputChange}
            errors={errors}
          />
        );
      case "documents":
        return (
          <StepDocuments
            formData={formData}
            onFileUpload={onFileUpload}
            errors={errors}
          />
        );
      case "logo":
        return (
          <StepLogo
            formData={formData}
            onChange={onInputChange}
            errors={errors}
          />
        );
      case "namecard":
        return (
          <StepNamecard
            formData={formData}
            onChange={onInputChange}
            errors={errors}
          />
        );
      case "profile":
        return (
          <StepProfile
            formData={formData}
            onFileUpload={onFileUpload}
            errors={errors}
          />
        );
      case "marketing":
        return (
          <StepMarketing
            formData={formData}
            onChange={onInputChange}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 헤더 영역 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
          {/* 제목 및 모드 전환 */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">자료 제출</h1>
            <div className="flex items-center gap-3">
              {/* 자동 저장 상태 */}
              <AutoSaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
              {/* 모드 전환 */}
              <WizardModeToggle onToggle={handleModeToggle} />
            </div>
          </div>

          {/* 진행률 바 */}
          <WizardProgress />
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full pb-24">
        <WizardStep>{renderCurrentStep()}</WizardStep>
      </div>

      {/* 네비게이션 (하단 고정) */}
      <WizardNavigation
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

/**
 * AutoSaveIndicator - 자동 저장 상태 표시
 */
interface AutoSaveIndicatorProps {
  lastSaved?: Date | null;
  isSaving?: boolean;
}

function AutoSaveIndicator({ lastSaved, isSaving }: AutoSaveIndicatorProps) {
  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>저장 중</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <CheckCircle2 className="w-3 h-3 text-green-500" />
        <span className="hidden sm:inline">
          {lastSaved.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    );
  }

  return null;
}

/**
 * WizardModeSelector - 모드 선택 다이얼로그
 *
 * 재방문 사용자에게 모드 선택권 제공
 */
interface WizardModeSelectorProps {
  open: boolean;
  onSelect: (mode: "wizard" | "tab") => void;
  hasExistingData: boolean;
}

export function WizardModeSelector({
  open,
  onSelect,
  hasExistingData,
}: WizardModeSelectorProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
        <div className="text-center space-y-2">
          <div className="text-4xl">👋</div>
          <h2 className="text-lg font-bold text-gray-900">
            {hasExistingData
              ? "이전에 입력하던 내용이 있어요!"
              : "자료 제출을 시작합니다"}
          </h2>
          <p className="text-sm text-gray-500">
            어떤 방식으로 진행하시겠어요?
          </p>
        </div>

        <div className="space-y-3">
          {hasExistingData && (
            <button
              onClick={() => onSelect("tab")}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "hover:border-blue-300 hover:bg-blue-50",
                "border-gray-200"
              )}
            >
              <p className="font-semibold text-gray-900">이어서 작성하기</p>
              <p className="text-sm text-gray-500 mt-1">
                탭 모드로 자유롭게 편집
              </p>
            </button>
          )}

          <button
            onClick={() => onSelect("wizard")}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              "hover:border-blue-500 hover:bg-blue-50",
              "border-blue-500 bg-blue-50"
            )}
          >
            <p className="font-semibold text-blue-700">
              {hasExistingData ? "처음부터 안내받기" : "단계별로 안내받기"}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Wizard 모드로 차근차근 진행
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
