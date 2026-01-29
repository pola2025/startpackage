"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepField, RequiredBadge } from "../wizard-step";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LogoColorSelector } from "@/components/submission/logo-style-selector";

/**
 * Step 4: 로고 제작 정보 (필수)
 *
 * 필드:
 * - 로고선호스타일 (선택)
 * - 로고선호색상 (필수)
 * - 로고선호폰트 (선택)
 * - 로고제작요청사항 (필수)
 * - 명함색상 (선택)
 */

interface StepLogoProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function StepLogo({ formData, onChange, errors = {} }: StepLogoProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();

  // 필수 필드 검증
  useEffect(() => {
    const isValid =
      formData.로고선호색상?.trim() &&
      formData.로고제작요청사항?.trim().length >= 10;

    setCanProceed(isValid);

    if (isValid) {
      markStepComplete(currentStep.id);
    }
  }, [formData.로고선호색상, formData.로고제작요청사항, setCanProceed, markStepComplete, currentStep.id]);

  return (
    <StepCard>
      <StepHeader
        title="로고 제작 정보"
        description="원하시는 로고 스타일을 알려주세요"
        icon="🎨"
        badge={<RequiredBadge />}
      />

      <div className="space-y-6">
        {/* 로고 선호 색상 - 비주얼 선택 UI */}
        <div className="space-y-2">
          <LogoColorSelector
            value={formData.로고선호색상 || ""}
            onChange={(value) => onChange("로고선호색상", value)}
          />
          {errors.로고선호색상 && (
            <p className="text-xs text-red-500">⚠️ {errors.로고선호색상}</p>
          )}
        </div>

        {/* 로고 선호 스타일 */}
        <StepField
          label="로고 선호 스타일"
          helpText="예: 심플하고 모던한 느낌, 전통적인 느낌"
          error={errors.로고선호스타일}
        >
          <Input
            id="로고선호스타일"
            value={formData.로고선호스타일 || ""}
            onChange={(e) => onChange("로고선호스타일", e.target.value)}
            placeholder="어떤 느낌의 로고를 원하시나요?"
            className="h-12 text-base"
          />
        </StepField>

        {/* 로고 선호 폰트 */}
        <StepField
          label="로고 선호 폰트"
          helpText="예: 깔끔한 고딕체, 부드러운 손글씨체"
          error={errors.로고선호폰트}
        >
          <Input
            id="로고선호폰트"
            value={formData.로고선호폰트 || ""}
            onChange={(e) => onChange("로고선호폰트", e.target.value)}
            placeholder="선호하는 글꼴 스타일"
            className="h-12 text-base"
          />
        </StepField>

        {/* 로고 제작 요청사항 */}
        <StepField
          label="로고 제작 요청사항"
          required
          helpText="구체적으로 적어주시면 원하시는 디자인에 더 가까워요"
          error={errors.로고제작요청사항}
        >
          <Textarea
            id="로고제작요청사항"
            value={formData.로고제작요청사항 || ""}
            onChange={(e) => onChange("로고제작요청사항", e.target.value)}
            placeholder="예: 브랜드의 친환경 이미지를 강조해주세요. 잎사귀 모양이 들어가면 좋겠습니다."
            className="min-h-[100px] text-base resize-none"
            rows={4}
          />
        </StepField>

        {/* 명함 색상 */}
        <StepField
          label="명함 색상"
          helpText="로고와 함께 명함에 사용할 색상입니다"
          error={errors.명함색상}
        >
          <Input
            id="명함색상"
            value={formData.명함색상 || ""}
            onChange={(e) => onChange("명함색상", e.target.value)}
            placeholder="예: 로고 색상과 동일, 화이트 베이스"
            className="h-12 text-base"
          />
        </StepField>
      </div>
    </StepCard>
  );
}
