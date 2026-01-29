"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../wizard-context";
import { StepCard, StepHeader, StepField, StepNotice, RequiredBadge } from "../wizard-step";
import { MobileFileUpload } from "@/components/ui/mobile-file-upload";
import { FileText, CheckCircle2 } from "lucide-react";

/**
 * Step 3: 사업자등록증 업로드 (필수)
 *
 * 필드:
 * - 사업자등록증URL (필수)
 */

interface StepDocumentsProps {
  formData: any;
  onFileUpload: (field: string, file: File) => Promise<void>;
  errors?: Record<string, string>;
}

export function StepDocuments({ formData, onFileUpload, errors = {} }: StepDocumentsProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();
  const [uploading, setUploading] = useState(false);

  // 필수 필드 검증
  useEffect(() => {
    const hasDocument = !!formData.사업자등록증URL;
    setCanProceed(hasDocument);

    if (hasDocument) {
      markStepComplete(currentStep.id);
    }
  }, [formData.사업자등록증URL, setCanProceed, markStepComplete, currentStep.id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await onFileUpload("사업자등록증URL", file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <StepCard>
      <StepHeader
        title="사업자등록증 업로드"
        description="사업자 정보 확인에 필요합니다"
        icon="📄"
        badge={<RequiredBadge />}
      />

      <div className="space-y-4">
        <MobileFileUpload
          label="사업자등록증"
          accept="image/*,application/pdf"
          currentFileUrl={formData.사업자등록증URL}
          onUpload={handleUpload}
          required
          helpText="JPG, PNG, PDF (10MB 이하)"
          allowCamera
        />

        {/* 왜 필요한지 설명 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            왜 필요한가요?
          </p>
          <ul className="text-sm text-gray-500 space-y-1.5 pl-6">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>사업자 정보 확인용</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>세금계산서 발행 시 필요</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>SSL 인증서 발급용</span>
            </li>
          </ul>
        </div>

        {/* 아직 없는 경우 안내 */}
        <StepNotice type="warning">
          아직 사업자등록을 안 하셨나요? "건너뛰기"로 나중에 올릴 수 있어요.
        </StepNotice>
      </div>
    </StepCard>
  );
}
