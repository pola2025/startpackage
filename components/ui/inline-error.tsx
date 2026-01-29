"use client";

import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useState } from "react";
import type { FriendlyError } from "@/lib/submission/friendly-errors";

interface InlineErrorProps {
  /** 에러 객체 또는 문자열 */
  error: FriendlyError | string | null;
  /** 닫기 가능 여부 */
  dismissible?: boolean;
  /** 닫기 콜백 */
  onDismiss?: () => void;
  /** 추가 클래스 */
  className?: string;
  /** 컴팩트 모드 */
  compact?: boolean;
}

/**
 * 인라인 에러 메시지 컴포넌트
 *
 * @example
 * ```tsx
 * <InlineError error={error} dismissible onDismiss={() => setError(null)} />
 * ```
 */
export function InlineError({
  error,
  dismissible = false,
  onDismiss,
  className = "",
  compact = false,
}: InlineErrorProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) return null;

  // 문자열이면 FriendlyError 형태로 변환
  const errorObj: FriendlyError =
    typeof error === "string"
      ? { title: "", message: error, severity: "error" }
      : error;

  const severityConfig = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Info className="w-4 h-4 text-blue-500" />,
      textColor: "text-blue-800",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      textColor: "text-amber-800",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      textColor: "text-red-800",
    },
  };

  const config = severityConfig[errorObj.severity];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 text-xs ${config.textColor} ${className}`}
        role="alert"
      >
        {config.icon}
        <span>{errorObj.message}</span>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="ml-auto hover:opacity-70"
            aria-label="닫기"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-lg p-3 sm:p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          {errorObj.title && (
            <h4 className={`font-medium text-sm ${config.textColor}`}>
              {errorObj.title}
            </h4>
          )}
          <p
            className={`text-sm ${config.textColor} ${
              errorObj.title ? "mt-1" : ""
            }`}
          >
            {errorObj.message}
          </p>
          {errorObj.suggestion && (
            <p className={`text-xs ${config.textColor} opacity-80 mt-1`}>
              {errorObj.suggestion}
            </p>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={`flex-shrink-0 ${config.textColor} hover:opacity-70 p-1`}
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 필드 에러 메시지 (Input 하단에 표시)
 */
export function FieldError({
  message,
  className = "",
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;

  return (
    <p
      className={`text-xs text-red-600 mt-1 flex items-center gap-1 ${className}`}
      role="alert"
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

/**
 * 성공 메시지 컴포넌트
 */
export function InlineSuccess({
  message,
  dismissible = false,
  onDismiss,
  className = "",
}: {
  message: string | null;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (!message || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 ${className}`}
      role="status"
    >
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-sm text-green-800 font-medium flex-1">{message}</p>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="text-green-800 hover:opacity-70 p-1"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
