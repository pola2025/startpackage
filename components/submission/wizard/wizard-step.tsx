"use client";

import React, { useRef, useEffect, useState } from "react";
import { useWizard } from "./wizard-context";
import { cn } from "@/lib/utils";

/**
 * WizardStep - Step 전환 애니메이션 컨테이너
 *
 * 모바일 360px 최적화:
 * - 슬라이드 애니메이션 (direction에 따라 좌/우)
 * - 부드러운 페이드 인/아웃
 * - 스크롤 위치 자동 리셋
 */

interface WizardStepProps {
  children: React.ReactNode;
  className?: string;
}

export function WizardStep({ children, className }: WizardStepProps) {
  const { currentStepIndex, direction } = useWizard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayContent, setDisplayContent] = useState(children);
  const prevStepRef = useRef(currentStepIndex);

  // Step 변경 시 애니메이션 처리
  useEffect(() => {
    if (prevStepRef.current !== currentStepIndex) {
      setIsAnimating(true);

      // 애니메이션 종료 후 콘텐츠 업데이트
      const timer = setTimeout(() => {
        setDisplayContent(children);
        setIsAnimating(false);

        // 스크롤 위치 리셋
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 150);

      prevStepRef.current = currentStepIndex;
      return () => clearTimeout(timer);
    } else {
      // Step이 같으면 바로 콘텐츠 업데이트
      setDisplayContent(children);
    }
  }, [currentStepIndex, children]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full transition-all duration-300 ease-out",
        // 애니메이션 상태
        isAnimating && direction === "forward" && "opacity-0 translate-x-4",
        isAnimating && direction === "backward" && "opacity-0 -translate-x-4",
        !isAnimating && "opacity-100 translate-x-0",
        className
      )}
    >
      {displayContent}
    </div>
  );
}

/**
 * StepCard - 개별 Step의 카드 컨테이너
 *
 * 일관된 스타일링과 레이아웃을 제공
 */
interface StepCardProps {
  children: React.ReactNode;
  className?: string;
}

export function StepCard({ children, className }: StepCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border-2 border-gray-100",
        "shadow-sm p-4 sm:p-6",
        "space-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * StepHeader - Step 상단 정보 (제목, 설명)
 */
interface StepHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function StepHeader({ title, description, icon, badge }: StepHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * StepField - 개별 입력 필드 래퍼
 *
 * 일관된 필드 레이아웃과 도움말 제공
 */
interface StepFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function StepField({
  label,
  required,
  helpText,
  error,
  children,
  className,
}: StepFieldProps) {
  const fieldId = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1 text-sm font-medium text-gray-700"
      >
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </label>

      {children}

      {helpText && !error && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span className="text-blue-400">💡</span>
          {helpText}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
          <span>⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * StepNotice - 정보성 알림 박스
 */
interface StepNoticeProps {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
  className?: string;
}

export function StepNotice({ type = "info", children, className }: StepNoticeProps) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    success: "bg-green-50 border-green-200 text-green-700",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-sm",
        styles[type],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * OptionalBadge - "선택" 배지
 */
export function OptionalBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      선택
    </span>
  );
}

/**
 * RequiredBadge - "필수" 배지
 */
export function RequiredBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
      필수
    </span>
  );
}
