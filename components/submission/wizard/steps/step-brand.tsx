"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepField, RequiredBadge } from "../wizard-step";
import { Input } from "@/components/ui/input";

/**
 * Step 1: 브랜드 기본 정보 (필수)
 *
 * 필드:
 * - 브랜드명 (필수)
 * - 업종 (필수)
 * - 주소 (필수)
 */

interface StepBrandProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function StepBrand({ formData, onChange, errors = {} }: StepBrandProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();

  // 필수 필드 검증
  useEffect(() => {
    const isValid =
      formData.브랜드명?.trim().length >= 2 &&
      formData.업종?.trim().length >= 2 &&
      formData.주소?.trim().length >= 5;

    setCanProceed(isValid);

    if (isValid) {
      markStepComplete(currentStep.id);
    }
  }, [formData.브랜드명, formData.업종, formData.주소, setCanProceed, markStepComplete, currentStep.id]);

  return (
    <StepCard>
      <StepHeader
        title="브랜드 기본 정보"
        description="홈페이지와 명함에 표시될 정보입니다"
        icon="📝"
        badge={<RequiredBadge />}
      />

      <div className="space-y-5">
        {/* 브랜드명 */}
        <StepField
          label="브랜드명"
          required
          helpText="홈페이지, 명함 등에 표시될 이름입니다"
          error={errors.브랜드명}
        >
          <Input
            id="브랜드명"
            value={formData.브랜드명 || ""}
            onChange={(e) => onChange("브랜드명", e.target.value)}
            placeholder="예: 행복한마을식품"
            className="h-12 text-base"
            autoComplete="organization"
          />
        </StepField>

        {/* 업종 */}
        <StepField
          label="업종"
          required
          helpText="예: 건강식품 판매, IT 컨설팅, 인테리어"
          error={errors.업종}
        >
          <Input
            id="업종"
            value={formData.업종 || ""}
            onChange={(e) => onChange("업종", e.target.value)}
            placeholder="어떤 사업을 하시나요?"
            className="h-12 text-base"
          />
        </StepField>

        {/* 주소 */}
        <StepField
          label="사업장 주소"
          required
          helpText="명함과 홈페이지에 표시됩니다"
          error={errors.주소}
        >
          <Input
            id="주소"
            value={formData.주소 || ""}
            onChange={(e) => onChange("주소", e.target.value)}
            placeholder="예: 서울시 강남구 테헤란로 123"
            className="h-12 text-base"
            autoComplete="street-address"
          />
        </StepField>
      </div>
    </StepCard>
  );
}
