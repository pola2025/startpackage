"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import {
  StepCard,
  StepHeader,
  StepNotice,
  OptionalBadge,
} from "../wizard-step";
import { StyleCardSelector } from "@/components/submission/style-card-selector";
import { cn } from "@/lib/utils";

/**
 * Step 5: 명함 스타일 선택 (선택)
 *
 * 필드:
 * - 명함시안 (선택)
 */

interface StepNamecardProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

// 명함 스타일 옵션
const NAMECARD_STYLES = [
  {
    id: "style1",
    name: "스타일 1",
    description: "클래식 디자인",
    preview: "/namecard/namecard_1.jpg",
  },
  {
    id: "style2",
    name: "스타일 2",
    description: "모던 디자인",
    preview: "/namecard/namecard_2.jpg",
  },
  {
    id: "style3",
    name: "스타일 3",
    description: "크리에이티브 디자인",
    preview: "/namecard/namecard_3.jpg",
  },
  {
    id: "style4",
    name: "스타일 4",
    description: "미니멀 디자인",
    preview: "/namecard/namecard_4.jpg",
  },
  {
    id: "style5",
    name: "스타일 5",
    description: "2026 신규 디자인",
    preview: "/namecard/namecard_5.jpg",
  },
  {
    id: "style6",
    name: "스타일 6",
    description: "2026 신규 디자인",
    preview: "/namecard/namecard_6.jpg",
  },
];

// 계약서 스타일 옵션
const CONTRACT_STYLES = [
  {
    id: "style1",
    name: "스타일 1",
    description: "기본 디자인",
    coverPreview: "/guides/print/contract_cover.jpg",
    innerPreview: "/guides/print/contract_inner.jpg",
  },
  {
    id: "style2",
    name: "스타일 2",
    description: "2026 신규 디자인",
    coverPreview: "/guides/print/contract_cover_2.jpg",
    innerPreview: "/guides/print/contract_inner_2.jpg",
  },
];

export function StepNamecard({
  formData,
  onChange,
  errors = {},
}: StepNamecardProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();

  // 선택 항목이므로 항상 진행 가능
  useEffect(() => {
    setCanProceed(true);

    if (formData.명함시안 || formData.계약서시안) {
      markStepComplete(currentStep.id);
    }
  }, [
    formData.명함시안,
    formData.계약서시안,
    setCanProceed,
    markStepComplete,
    currentStep.id,
  ]);

  return (
    <StepCard>
      <StepHeader
        title="인쇄물 디자인 선택"
        description="명함과 계약서 디자인을 선택해주세요"
        icon="🖨️"
        badge={<OptionalBadge />}
      />

      <StepNotice type="info">
        이 단계는 선택사항입니다. 나중에 선택해도 됩니다.
      </StepNotice>

      <div className="space-y-8">
        {/* 명함 스타일 */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>💳</span> 명함 스타일 (6종 중 1개 선택)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {NAMECARD_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => onChange("명함시안", style.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 text-left transition-all",
                  "hover:border-gold-300 hover:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2",
                  formData.명함시안 === style.id
                    ? "border-gold-500 bg-gold-50 shadow-md"
                    : "border-gray-200 bg-white",
                )}
              >
                {/* 미리보기 이미지 영역 */}
                <div className="aspect-[3/2] bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={style.preview}
                    alt={style.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                {/* 스타일 정보 */}
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {style.name}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {style.description}
                  </p>
                </div>

                {/* 선택 표시 */}
                {formData.명함시안 === style.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">
            선택한 스타일에 브랜드명, 연락처가 들어갑니다
          </p>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-200" />

        {/* 계약서 스타일 */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>📄</span> 자문계약서 스타일 (2종 중 1개 선택)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {CONTRACT_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => onChange("계약서시안", style.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 text-left transition-all",
                  "hover:border-indigo-300 hover:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                  formData.계약서시안 === style.id
                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                    : "border-gray-200 bg-white",
                )}
              >
                {/* 미리보기: 표지 + 내지 */}
                <div className="space-y-1.5 mb-2">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={style.coverPreview}
                      alt={`${style.name} 표지`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={style.innerPreview}
                      alt={`${style.name} 내지`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>

                {/* 스타일 정보 */}
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {style.name}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {style.description}
                  </p>
                </div>

                {/* 선택 표시 */}
                {formData.계약서시안 === style.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">
            표지와 내지 디자인이 세트로 적용됩니다
          </p>
        </div>
      </div>
    </StepCard>
  );
}
