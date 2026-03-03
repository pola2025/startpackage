"use client";

import { Shield, Lock, Eye, EyeOff, Info, ExternalLink } from "lucide-react";
import { useState } from "react";

interface SecurityNoticeProps {
  /** 표시할 보안 안내 타입 */
  type?: "marketing" | "payment" | "personal";
  /** 커스텀 메시지 */
  message?: string;
  /** 추가 설명 */
  description?: string;
  /** 컴팩트 모드 (360px 최적화) */
  compact?: boolean;
  /** 개인정보 처리방침 링크 */
  privacyPolicyLink?: string;
}

/**
 * 보안 안내 메시지 매핑
 */
const SECURITY_MESSAGES: Record<
  string,
  { title: string; description: string }
> = {
  marketing: {
    title: "계정 정보는 안전하게 보호돼요",
    description:
      "입력하신 계정 정보는 SSL 암호화로 전송되며, 마케팅 대행 업무에만 사용됩니다. 제3자에게 절대 공유되지 않아요.",
  },
  payment: {
    title: "결제 정보는 안전하게 처리돼요",
    description:
      "결제 정보는 PCI-DSS 인증을 받은 결제 시스템에서 처리되며, 저장되지 않습니다.",
  },
  personal: {
    title: "개인정보를 안전하게 보호해요",
    description:
      "입력하신 정보는 서비스 제공 목적으로만 사용되며, 개인정보 처리방침에 따라 관리됩니다.",
  },
};

/**
 * 민감정보 입력 시 안심 UI 컴포넌트
 *
 * @example
 * ```tsx
 * <SecurityNotice type="marketing" compact />
 * ```
 */
export function SecurityNotice({
  type = "marketing",
  message,
  description,
  compact = false,
  privacyPolicyLink,
}: SecurityNoticeProps) {
  const defaultMessage = SECURITY_MESSAGES[type];
  const displayTitle = message || defaultMessage?.title;
  const displayDescription = description || defaultMessage?.description;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span>{displayTitle}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-gold-50 border border-green-200 rounded-xl p-4 sm:p-5">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
            {displayTitle}
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
            {displayDescription}
          </p>
        </div>
      </div>

      {/* 보안 기능 목록 */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <SecurityFeatureItem
          icon={<Lock className="w-4 h-4" />}
          label="SSL 암호화"
          compact={compact}
        />
        <SecurityFeatureItem
          icon={<Shield className="w-4 h-4" />}
          label="안전한 저장"
          compact={compact}
        />
        <SecurityFeatureItem
          icon={<Eye className="w-4 h-4" />}
          label="접근 제한"
          compact={compact}
        />
      </div>

      {/* 개인정보 처리방침 링크 */}
      {privacyPolicyLink && (
        <a
          href={privacyPolicyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-800 hover:underline"
        >
          <Info className="w-3 h-3" />
          개인정보 처리방침 확인하기
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

/**
 * 보안 기능 아이템
 */
function SecurityFeatureItem({
  icon,
  label,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        compact ? "text-xs" : "text-xs sm:text-sm"
      } text-gray-600`}
    >
      <span className="text-green-600">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

/**
 * 비밀번호 필드용 안심 UI (눈 아이콘 + 설명)
 */
export function PasswordSecurityHint({
  showPassword,
  onToggle,
  hint = "비밀번호는 암호화되어 저장돼요",
}: {
  showPassword: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-1">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Lock className="w-3 h-3" />
        {hint}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="text-gray-400 hover:text-gray-600 p-1"
        aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

/**
 * 데이터 용도 설명 컴포넌트
 */
export function DataUsageNotice({
  purpose,
  className = "",
}: {
  purpose: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 text-xs text-gray-500 bg-gold-50 rounded-lg px-3 py-2 ${className}`}
    >
      <Info className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
      <span>{purpose}</span>
    </div>
  );
}

/**
 * 삭제 안내 컴포넌트 (카드 이미지 등)
 */
export function DeletionNotice({
  timeframe = "24시간",
  className = "",
}: {
  timeframe?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}
    >
      <Shield className="w-4 h-4 text-green-600" />
      <span>확인 후 {timeframe} 내에 완전히 삭제돼요</span>
    </div>
  );
}

/**
 * 서비스 뱃지 컴포넌트
 */
export function ServiceBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-full ${className}`}
    >
      <Shield className="w-4 h-4" />
      비즈액터스쿨 공식 서비스
    </div>
  );
}
