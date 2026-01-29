"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepField, StepNotice, OptionalBadge } from "../wizard-step";
import { Input } from "@/components/ui/input";
import { SecurityNotice } from "@/components/submission/security-notice";
import { Shield } from "lucide-react";

/**
 * Step 7: 마케팅 계정 정보 (선택)
 *
 * 필드:
 * - InstagramID (선택)
 * - InstagramPW (선택)
 * - 네이버검색광고ID (선택)
 * - 네이버검색광고PW (선택)
 * - 네이버클라우드ID (선택)
 * - 네이버클라우드PW (선택)
 * - GmailID (선택)
 * - GmailPW (선택)
 */

interface StepMarketingProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function StepMarketing({ formData, onChange, errors = {} }: StepMarketingProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();

  // 선택 항목이므로 항상 진행 가능
  useEffect(() => {
    setCanProceed(true);

    // 하나라도 입력되면 완료 표시
    const hasAnyValue =
      formData.InstagramID?.trim() ||
      formData.네이버검색광고ID?.trim() ||
      formData.네이버클라우드ID?.trim() ||
      formData.GmailID?.trim();

    if (hasAnyValue) {
      markStepComplete(currentStep.id);
    }
  }, [
    formData.InstagramID,
    formData.네이버검색광고ID,
    formData.네이버클라우드ID,
    formData.GmailID,
    setCanProceed,
    markStepComplete,
    currentStep.id,
  ]);

  return (
    <StepCard>
      <StepHeader
        title="마케팅 계정 정보"
        description="마케팅 대행에 필요한 계정 정보입니다"
        icon="📱"
        badge={<OptionalBadge />}
      />

      {/* 보안 안내 */}
      <SecurityNotice type="marketing" compact />

      <StepNotice type="info">
        이 단계는 선택사항입니다. 마케팅 서비스 이용 시 필요합니다.
      </StepNotice>

      <div className="space-y-6">
        {/* 인스타그램 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="text-lg">📷</span>
            인스타그램 계정
          </p>
          <p className="text-xs text-gray-400">
            💡 인스타그램 마케팅 대행에 필요합니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StepField label="아이디" error={errors.InstagramID}>
              <Input
                id="InstagramID"
                value={formData.InstagramID || ""}
                onChange={(e) => onChange("InstagramID", e.target.value)}
                placeholder="인스타그램 아이디"
                className="h-12 text-base"
                autoComplete="username"
              />
            </StepField>
            <StepField label="비밀번호" error={errors.InstagramPW}>
              <Input
                id="InstagramPW"
                type="password"
                value={formData.InstagramPW || ""}
                onChange={(e) => onChange("InstagramPW", e.target.value)}
                placeholder="비밀번호"
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </StepField>
          </div>
        </div>

        {/* 네이버 검색광고 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="text-lg">🔍</span>
            네이버 검색광고 계정
          </p>
          <p className="text-xs text-gray-400">
            💡 네이버 키워드 광고 대행에 필요합니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StepField label="아이디" error={errors.네이버검색광고ID}>
              <Input
                id="네이버검색광고ID"
                value={formData.네이버검색광고ID || ""}
                onChange={(e) => onChange("네이버검색광고ID", e.target.value)}
                placeholder="네이버 검색광고 ID"
                className="h-12 text-base"
                autoComplete="username"
              />
            </StepField>
            <StepField label="비밀번호" error={errors.네이버검색광고PW}>
              <Input
                id="네이버검색광고PW"
                type="password"
                value={formData.네이버검색광고PW || ""}
                onChange={(e) => onChange("네이버검색광고PW", e.target.value)}
                placeholder="비밀번호"
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </StepField>
          </div>
        </div>

        {/* 네이버 클라우드 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="text-lg">☁️</span>
            네이버 클라우드 계정
          </p>
          <p className="text-xs text-gray-400">
            💡 SMS 발송 서비스에 필요합니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StepField label="아이디" error={errors.네이버클라우드ID}>
              <Input
                id="네이버클라우드ID"
                value={formData.네이버클라우드ID || ""}
                onChange={(e) => onChange("네이버클라우드ID", e.target.value)}
                placeholder="네이버 클라우드 ID"
                className="h-12 text-base"
                autoComplete="username"
              />
            </StepField>
            <StepField label="비밀번호" error={errors.네이버클라우드PW}>
              <Input
                id="네이버클라우드PW"
                type="password"
                value={formData.네이버클라우드PW || ""}
                onChange={(e) => onChange("네이버클라우드PW", e.target.value)}
                placeholder="비밀번호"
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </StepField>
          </div>
        </div>

        {/* Gmail */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="text-lg">✉️</span>
            Gmail 계정
          </p>
          <p className="text-xs text-gray-400">
            💡 구글 비즈니스 프로필 관리에 필요합니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StepField label="이메일" error={errors.GmailID}>
              <Input
                id="GmailID"
                type="email"
                value={formData.GmailID || ""}
                onChange={(e) => onChange("GmailID", e.target.value)}
                placeholder="example@gmail.com"
                className="h-12 text-base"
                autoComplete="email"
              />
            </StepField>
            <StepField label="비밀번호" error={errors.GmailPW}>
              <Input
                id="GmailPW"
                type="password"
                value={formData.GmailPW || ""}
                onChange={(e) => onChange("GmailPW", e.target.value)}
                placeholder="비밀번호"
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </StepField>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
