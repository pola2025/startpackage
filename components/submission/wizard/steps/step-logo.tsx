"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepField, RequiredBadge } from "../wizard-step";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LogoColorSelector } from "@/components/submission/logo-style-selector";
import { MobileFileUpload } from "@/components/ui/mobile-file-upload";
import { Mail } from "lucide-react";

/**
 * Step 4: 로고 제작 정보 (필수)
 *
 * 필드:
 * - 로고선호스타일 (선택)
 * - 로고선호색상 (필수)
 * - 로고선호폰트 (선택)
 * - 로고제작요청사항 (필수)
 * - 명함색상 (선택)
 * - 로고예시디자인URL / 로고예시디자인2URL (선택, 최대 2장)
 */

interface StepLogoProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  onFileUpload?: (field: string, file: File) => Promise<void>;
  errors?: Record<string, string>;
}

export function StepLogo({
  formData,
  onChange,
  onFileUpload,
  errors = {},
}: StepLogoProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleReferenceUpload = async (field: string, file: File) => {
    if (!onFileUpload) return;
    setUploadingField(field);
    try {
      await onFileUpload(field, file);
    } finally {
      setUploadingField(null);
    }
  };

  // 필수 필드 검증
  useEffect(() => {
    const isValid =
      formData.로고선호색상?.trim() &&
      formData.로고제작요청사항?.trim().length >= 10;

    setCanProceed(isValid);

    if (isValid) {
      markStepComplete(currentStep.id);
    }
  }, [
    formData.로고선호색상,
    formData.로고제작요청사항,
    setCanProceed,
    markStepComplete,
    currentStep.id,
  ]);

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

        {/* 참고 로고파일 첨부 (선택, 최대 2장) */}
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-900">
                참고 로고파일을 첨부해주세요
              </span>
              <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                선택
              </span>
            </div>
            <p className="text-sm text-gray-600">
              강제는 아니에요. 다만 첨부해주시면 원하시는 스타일을 참고해서
              디자인하기 훨씬 좋아요. (최대 2장)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MobileFileUpload
              label="참고 로고 1"
              accept="image/*,application/pdf"
              currentFileUrl={formData.로고예시디자인URL}
              onUpload={(file) =>
                handleReferenceUpload("로고예시디자인URL", file)
              }
              helpText="JPG, PNG, PDF (10MB 이하)"
              allowCamera
            />
            <MobileFileUpload
              label="참고 로고 2"
              accept="image/*,application/pdf"
              currentFileUrl={formData.로고예시디자인2URL}
              onUpload={(file) =>
                handleReferenceUpload("로고예시디자인2URL", file)
              }
              helpText="JPG, PNG, PDF (10MB 이하)"
              allowCamera
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2.5">
            <Mail className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              2장 넘게 보내주고 싶으시면{" "}
              <a
                href="mailto:mkt@polarad.co.kr"
                className="font-semibold text-navy-700 underline underline-offset-2"
              >
                mkt@polarad.co.kr
              </a>{" "}
              로 메일 부탁드려요!
            </p>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
