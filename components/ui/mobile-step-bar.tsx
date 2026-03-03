"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  shortLabel: string;
}

interface MobileStepBarProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
  onStepClick?: (stepId: string) => void;
  disabledSteps?: string[];
}

export function MobileStepBar({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  disabledSteps = [],
}: MobileStepBarProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 -mx-3 sm:-mx-4 mb-4">
      {/* 진행률 바 */}
      <div className="flex items-center gap-1 mb-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isDisabled = disabledSteps.includes(step.id);

          return (
            <div
              key={step.id}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                isCompleted || isCurrent
                  ? "bg-navy-900"
                  : isDisabled
                    ? "bg-gray-200"
                    : "bg-gray-300",
              )}
            />
          );
        })}
      </div>

      {/* 스텝 라벨 */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isDisabled = disabledSteps.includes(step.id);

          return (
            <button
              key={step.id}
              onClick={() => !isDisabled && onStepClick?.(step.id)}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isDisabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  isCurrent
                    ? "bg-navy-900 text-white"
                    : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600",
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isCurrent
                    ? "text-gold-600"
                    : isCompleted
                      ? "text-green-600"
                      : "text-gray-500",
                )}
              >
                {step.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 하단 고정 네비게이션 버튼
interface MobileStepNavigationProps {
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  showPrev?: boolean;
  showNext?: boolean;
  isLoading?: boolean;
}

export function MobileStepNavigation({
  onPrev,
  onNext,
  prevLabel = "이전",
  nextLabel = "다음",
  prevDisabled = false,
  nextDisabled = false,
  showPrev = true,
  showNext = true,
  isLoading = false,
}: MobileStepNavigationProps) {
  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 pb-safe">
      <div className="flex gap-3">
        {showPrev && (
          <button
            onClick={onPrev}
            disabled={prevDisabled || isLoading}
            className={cn(
              "flex-1 h-12 rounded-xl font-semibold text-sm transition-colors",
              "border-2 border-gray-300 text-gray-700",
              "hover:bg-gray-100 active:bg-gray-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {prevLabel}
          </button>
        )}
        {showNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled || isLoading}
            className={cn(
              "flex-1 h-12 rounded-xl font-semibold text-sm transition-colors",
              "bg-navy-900 text-white",
              "hover:bg-navy-800 active:bg-navy-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isLoading ? "저장 중..." : nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
