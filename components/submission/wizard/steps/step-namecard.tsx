"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepNotice, OptionalBadge } from "../wizard-step";
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
    name: "클래식",
    description: "전통적이고 신뢰감 있는 디자인",
    preview: "/images/namecard/style1.png",
  },
  {
    id: "style2",
    name: "모던",
    description: "심플하고 세련된 디자인",
    preview: "/images/namecard/style2.png",
  },
  {
    id: "style3",
    name: "크리에이티브",
    description: "독특하고 창의적인 디자인",
    preview: "/images/namecard/style3.png",
  },
  {
    id: "style4",
    name: "미니멀",
    description: "최소한의 요소로 깔끔한 디자인",
    preview: "/images/namecard/style4.png",
  },
];

export function StepNamecard({ formData, onChange, errors = {} }: StepNamecardProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();

  // 선택 항목이므로 항상 진행 가능
  useEffect(() => {
    setCanProceed(true);

    if (formData.명함시안) {
      markStepComplete(currentStep.id);
    }
  }, [formData.명함시안, setCanProceed, markStepComplete, currentStep.id]);

  return (
    <StepCard>
      <StepHeader
        title="명함 스타일 선택"
        description="마음에 드는 명함 디자인을 선택해주세요"
        icon="💳"
        badge={<OptionalBadge />}
      />

      <StepNotice type="info">
        이 단계는 선택사항입니다. 나중에 선택해도 됩니다.
      </StepNotice>

      <div className="space-y-4">
        {/* 명함 스타일 그리드 */}
        <div className="grid grid-cols-2 gap-3">
          {NAMECARD_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange("명함시안", style.id)}
              className={cn(
                "relative rounded-xl border-2 p-3 text-left transition-all",
                "hover:border-blue-300 hover:shadow-md",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                formData.명함시안 === style.id
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white"
              )}
            >
              {/* 미리보기 이미지 영역 */}
              <div className="aspect-[3/2] bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                {style.preview ? (
                  <img
                    src={style.preview}
                    alt={style.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-2xl text-gray-300">💳</span>
                )}
              </div>

              {/* 스타일 정보 */}
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-900">{style.name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {style.description}
                </p>
              </div>

              {/* 선택 표시 */}
              {formData.명함시안 === style.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 안내 메시지 */}
        <p className="text-xs text-gray-400 text-center">
          💡 선택한 스타일에 브랜드명, 연락처가 들어갑니다
        </p>
      </div>
    </StepCard>
  );
}
