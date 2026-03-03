"use client";

import { useWizard, WIZARD_STEPS } from "./wizard-context";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WizardNavigation - Wizard 모드 네비게이션 버튼
 *
 * 모바일 360px 최적화:
 * - 버튼 높이 최소 48px (터치 타겟)
 * - 고아 텍스트 방지 (텍스트 길이 조절)
 * - 하단 고정 레이아웃
 */

interface WizardNavigationProps {
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export function WizardNavigation({
  onSubmit,
  isSubmitting = false,
  className,
}: WizardNavigationProps) {
  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    goNext,
    goPrev,
    skipStep,
    canProceed,
    completedSteps,
  } = useWizard();

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const canSkip = !currentStep.isRequired;

  // 마지막 스텝에서 완료 처리
  const handleComplete = async () => {
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20",
        "bg-white border-t border-gray-200",
        "px-4 py-3 safe-area-pb",
        className,
      )}
    >
      <div className="max-w-2xl mx-auto">
        {/* 메인 버튼 영역 */}
        <div className="flex items-center gap-2">
          {/* 이전 버튼 */}
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={goPrev}
              disabled={isSubmitting}
              className="h-12 px-4 flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="sr-only sm:not-sr-only sm:ml-1">이전</span>
            </Button>
          )}

          {/* 건너뛰기 버튼 (선택 스텝만) */}
          {canSkip && !isLastStep && (
            <Button
              type="button"
              variant="ghost"
              onClick={skipStep}
              disabled={isSubmitting}
              className="h-12 px-3 text-gray-500 flex-shrink-0"
            >
              <SkipForward className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">건너뛰기</span>
            </Button>
          )}

          {/* 스페이서 */}
          <div className="flex-1" />

          {/* 다음/완료 버튼 */}
          {isLastStep ? (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={!canProceed || isSubmitting}
              className={cn(
                "h-12 px-6 font-semibold",
                "bg-green-600 hover:bg-green-700",
                "min-w-[120px]",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  저장 중
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  완료하기
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed || isSubmitting}
              className="h-12 px-6 font-semibold min-w-[120px]"
            >
              다음 단계
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * WizardNavigationCompact - 공간이 좁을 때 사용하는 컴팩트 버전
 */
export function WizardNavigationCompact({
  onSubmit,
  isSubmitting = false,
}: WizardNavigationProps) {
  const {
    currentStepIndex,
    totalSteps,
    goNext,
    goPrev,
    currentStep,
    canProceed,
  } = useWizard();

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
      {/* 이전 */}
      <Button
        type="button"
        variant="ghost"
        onClick={goPrev}
        disabled={isFirstStep || isSubmitting}
        size="sm"
        className="text-gray-500"
      >
        <ChevronLeft className="w-4 h-4" />
        이전
      </Button>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1">
        {WIZARD_STEPS.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              idx === currentStepIndex
                ? "bg-gold-500"
                : idx < currentStepIndex
                  ? "bg-green-500"
                  : "bg-gray-200",
            )}
          />
        ))}
      </div>

      {/* 다음/완료 */}
      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              완료
              <Check className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={goNext}
          disabled={!canProceed || isSubmitting}
          size="sm"
        >
          다음
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

/**
 * WizardModeToggle - Wizard ↔ Tab 모드 전환 버튼
 */
interface WizardModeToggleProps {
  onToggle?: () => void;
}

export function WizardModeToggle({ onToggle }: WizardModeToggleProps) {
  const { isWizardMode, setWizardMode } = useWizard();

  const handleToggle = () => {
    setWizardMode(!isWizardMode);
    onToggle?.();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "text-sm text-gray-500 hover:text-gray-700",
        "underline underline-offset-2",
        "transition-colors",
      )}
    >
      {isWizardMode ? "탭 모드로 전환" : "단계별 안내로 전환"}
    </button>
  );
}
