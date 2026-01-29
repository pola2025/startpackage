"use client";

import { useWizard, WIZARD_STEPS } from "./wizard-context";
import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

/**
 * Wizard 진행률 바
 *
 * 모바일 360px 최적화:
 * - 스텝 번호만 표시 (제목은 현재 스텝만)
 * - 가로 스크롤 없이 모두 표시
 * - 터치 영역 44px 이상
 */
export function WizardProgress() {
  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    completedSteps,
    skippedSteps,
    progressPercent,
    goToStep,
  } = useWizard();

  return (
    <div className="w-full space-y-3">
      {/* 상단: 현재 스텝 정보 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">
            {currentStepIndex + 1}/{totalSteps}단계
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {currentStep.shortTitle}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {currentStep.estimatedTime}
        </span>
      </div>

      {/* 진행률 바 */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 스텝 인디케이터 (모바일 최적화) */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isComplete = completedSteps.has(step.id);
          const isSkipped = skippedSteps.has(step.id);
          const isCurrent = index === currentStepIndex;
          const isPast = index < currentStepIndex;

          return (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              disabled={!isComplete && !isSkipped && index > currentStepIndex}
              className={cn(
                "relative flex items-center justify-center",
                "w-9 h-9 rounded-full transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                // 상태별 스타일
                isCurrent && "bg-blue-500 text-white shadow-md scale-110",
                isComplete && !isCurrent && "bg-green-500 text-white",
                isSkipped && !isCurrent && "bg-gray-300 text-gray-500",
                !isComplete && !isSkipped && !isCurrent && isPast && "bg-blue-100 text-blue-600",
                !isComplete && !isSkipped && !isCurrent && !isPast && "bg-gray-100 text-gray-400",
                // 클릭 가능 여부
                (isComplete || isSkipped || index <= currentStepIndex)
                  ? "cursor-pointer hover:scale-105"
                  : "cursor-not-allowed opacity-50"
              )}
              aria-label={`${step.title} ${isComplete ? "(완료)" : isSkipped ? "(건너뜀)" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isComplete ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 현재 스텝 설명 */}
      <p className="text-sm text-gray-500 text-center">
        {currentStep.description}
      </p>
    </div>
  );
}

/**
 * 간소화된 진행률 바 (공간이 좁을 때)
 */
export function WizardProgressCompact() {
  const { currentStepIndex, totalSteps, progressPercent, currentStep } = useWizard();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          {currentStepIndex + 1}/{totalSteps} {currentStep.shortTitle}
        </span>
        <span className="text-gray-400">{progressPercent}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
