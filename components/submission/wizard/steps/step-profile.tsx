"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../wizard-context";
import {
  StepCard,
  StepHeader,
  StepNotice,
  OptionalBadge,
} from "../wizard-step";
import { MobileFileUpload } from "@/components/ui/mobile-file-upload";
import { Camera, User, CheckCircle2 } from "lucide-react";

/**
 * Step 6: 프로필 사진 업로드 (선택)
 *
 * 필드:
 * - 프로필사진URL (선택)
 */

interface StepProfileProps {
  formData: any;
  onFileUpload: (field: string, file: File) => Promise<void>;
  errors?: Record<string, string>;
}

export function StepProfile({
  formData,
  onFileUpload,
  errors = {},
}: StepProfileProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();
  const [uploading, setUploading] = useState(false);

  // 선택 항목이므로 항상 진행 가능
  useEffect(() => {
    setCanProceed(true);

    if (formData.프로필사진URL) {
      markStepComplete(currentStep.id);
    }
  }, [formData.프로필사진URL, setCanProceed, markStepComplete, currentStep.id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await onFileUpload("프로필사진URL", file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <StepCard>
      <StepHeader
        title="프로필 사진 업로드"
        description="대표님 프로필 사진을 올려주세요"
        icon="📸"
        badge={<OptionalBadge />}
      />

      <StepNotice type="info">
        이 단계는 선택사항입니다. 나중에 올려도 됩니다.
      </StepNotice>

      <div className="space-y-4">
        <MobileFileUpload
          label="프로필 사진"
          accept="image/*"
          currentFileUrl={formData.프로필사진URL}
          onUpload={handleUpload}
          helpText="정사각형 또는 상반신 사진 (최대 20MB)"
          allowCamera
          maxSize={20}
        />

        {/* 프로필 사진 사용처 안내 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-gold-500" />
            프로필 사진은 어디에 쓰이나요?
          </p>
          <ul className="text-sm text-gray-500 space-y-1.5 pl-6">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>홈페이지 &ldquo;대표 인사말&rdquo; 섹션</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>블로그/SNS 프로필</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>신뢰도 향상에 효과적!</span>
            </li>
          </ul>
        </div>

        {/* 좋은 프로필 사진 팁 */}
        <div className="bg-gold-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-navy-700 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            좋은 프로필 사진 팁
          </p>
          <ul className="text-sm text-gold-600 space-y-1 pl-6">
            <li>• 밝은 곳에서 촬영</li>
            <li>• 상반신이 잘 보이도록</li>
            <li>• 자연스러운 미소</li>
          </ul>
        </div>
      </div>
    </StepCard>
  );
}
