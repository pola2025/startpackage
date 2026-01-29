"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepField, StepNotice, OptionalBadge } from "../wizard-step";
import { Input } from "@/components/ui/input";

/**
 * Step 2: 연락처/계좌 정보 (선택)
 *
 * 필드:
 * - 대표번호 (선택)
 * - 이메일 (선택)
 * - 은행명 (선택)
 * - 계좌번호 (선택)
 * - 인쇄물받을주소 (선택)
 */

interface StepContactProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function StepContact({ formData, onChange, errors = {} }: StepContactProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();

  // 선택 항목이므로 항상 진행 가능
  useEffect(() => {
    setCanProceed(true);

    // 하나라도 입력되면 완료 표시
    const hasAnyValue =
      formData.대표번호?.trim() ||
      formData.이메일?.trim() ||
      formData.은행명?.trim() ||
      formData.계좌번호?.trim() ||
      formData.인쇄물받을주소?.trim();

    if (hasAnyValue) {
      markStepComplete(currentStep.id);
    }
  }, [
    formData.대표번호,
    formData.이메일,
    formData.은행명,
    formData.계좌번호,
    formData.인쇄물받을주소,
    setCanProceed,
    markStepComplete,
    currentStep.id,
  ]);

  return (
    <StepCard>
      <StepHeader
        title="연락처와 계좌 정보"
        description="명함과 고객 안내에 사용됩니다"
        icon="📞"
        badge={<OptionalBadge />}
      />

      <StepNotice type="info">
        이 단계는 선택사항입니다. 나중에 입력해도 됩니다.
      </StepNotice>

      <div className="space-y-5">
        {/* 대표번호 */}
        <StepField
          label="대표 연락처"
          helpText="명함에 표시할 대표 전화번호입니다"
          error={errors.대표번호}
        >
          <Input
            id="대표번호"
            type="tel"
            value={formData.대표번호 || ""}
            onChange={(e) => onChange("대표번호", e.target.value)}
            placeholder="010-1234-5678"
            className="h-12 text-base"
            autoComplete="tel"
          />
        </StepField>

        {/* 이메일 */}
        <StepField
          label="이메일"
          helpText="고객 문의를 받을 이메일 주소입니다"
          error={errors.이메일}
        >
          <Input
            id="이메일"
            type="email"
            value={formData.이메일 || ""}
            onChange={(e) => onChange("이메일", e.target.value)}
            placeholder="example@email.com"
            className="h-12 text-base"
            autoComplete="email"
          />
        </StepField>

        {/* 계좌 정보 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">계좌 정보</p>
          <p className="text-xs text-gray-400">
            💡 고객이 입금할 때 사용할 계좌입니다
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StepField label="은행명" error={errors.은행명}>
              <Input
                id="은행명"
                value={formData.은행명 || ""}
                onChange={(e) => onChange("은행명", e.target.value)}
                placeholder="예: 국민은행"
                className="h-12 text-base"
              />
            </StepField>

            <StepField label="계좌번호" error={errors.계좌번호}>
              <Input
                id="계좌번호"
                value={formData.계좌번호 || ""}
                onChange={(e) => onChange("계좌번호", e.target.value)}
                placeholder="123-45-678910"
                className="h-12 text-base"
              />
            </StepField>
          </div>
        </div>

        {/* 인쇄물 받을 주소 */}
        <StepField
          label="인쇄물 받을 주소"
          helpText="명함 등 인쇄물을 배송받을 주소입니다"
          error={errors.인쇄물받을주소}
        >
          <Input
            id="인쇄물받을주소"
            value={formData.인쇄물받을주소 || ""}
            onChange={(e) => onChange("인쇄물받을주소", e.target.value)}
            placeholder="사업장 주소와 다르면 입력해주세요"
            className="h-12 text-base"
            autoComplete="street-address"
          />
        </StepField>
      </div>
    </StepCard>
  );
}
