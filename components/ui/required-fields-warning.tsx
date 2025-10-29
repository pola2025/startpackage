"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface MissingField {
  fieldName: string;
  fieldLabel: string;
  fieldReason: string;
}

interface ValidationResult {
  success: boolean;
  isValid: boolean;
  completionRate: number;
  totalFields: number;
  filledFields: number;
  missingFields: MissingField[];
}

interface RequiredFieldsWarningProps {
  /** 워크플로우 ID */
  workflowId: string;
  /** 임시저장 상태 여부 */
  isDraft: boolean;
  /** 검증 결과 변경 시 콜백 */
  onValidationChange?: (result: ValidationResult) => void;
}

/**
 * 필수 정보 경고 배너
 *
 * - 임시저장 상태일 때만 표시
 * - 필수 필드 완료율 표시
 * - 누락된 필드 목록 표시
 */
export function RequiredFieldsWarning({
  workflowId,
  isDraft,
  onValidationChange,
}: RequiredFieldsWarningProps) {
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 필수 필드 검증
  const validateRequiredFields = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/workflows/required-fields/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });

      if (!response.ok) {
        throw new Error("검증 실패");
      }

      const data: ValidationResult = await response.json();
      setValidationResult(data);
      onValidationChange?.(data);
    } catch (error) {
      console.error("필수 필드 검증 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      validateRequiredFields();
    }
  }, [workflowId]);

  // 임시저장 상태가 아니면 표시하지 않음
  if (!isDraft) {
    return null;
  }

  // 로딩 중
  if (isLoading) {
    return (
      <Alert variant="default" className="border-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>필수 정보 확인 중...</AlertTitle>
        <AlertDescription>잠시만 기다려주세요.</AlertDescription>
      </Alert>
    );
  }

  // 검증 결과 없음
  if (!validationResult) {
    return null;
  }

  // 모든 필수 정보 입력 완료
  if (validationResult.isValid) {
    return (
      <Alert
        variant="default"
        className="border-green-500 bg-green-50 dark:bg-green-950"
      >
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          필수 정보가 모두 입력되었습니다!
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          이제 최종 저장을 눌러주세요.
        </AlertDescription>
      </Alert>
    );
  }

  // 필수 정보 누락
  return (
    <Alert variant="destructive" className="space-y-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 mt-0.5" />
        <div className="flex-1">
          <AlertTitle>필수 정보를 입력해주세요</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            {/* 진행률 표시 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>완료율</span>
                <span className="font-semibold">
                  {validationResult.completionRate}%
                </span>
              </div>
              <Progress value={validationResult.completionRate} />
              <p className="text-xs text-muted-foreground">
                {validationResult.filledFields}/{validationResult.totalFields}{" "}
                개 완료
              </p>
            </div>

            {/* 누락된 필드 목록 */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                아래 정보를 입력해주세요:
              </p>
              <ul className="space-y-2">
                {validationResult.missingFields.map((field, index) => (
                  <li key={field.fieldName} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[20px]">
                      {index + 1}.
                    </span>
                    <div>
                      <span className="font-medium">{field.fieldLabel}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {field.fieldReason}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 안내 메시지 */}
            <p className="text-xs text-muted-foreground border-t border-destructive/20 pt-3">
              💡 현재 <strong>임시저장</strong> 상태입니다. 필수 정보를 모두
              입력한 후 <strong>최종 저장</strong>을 눌러주세요.
            </p>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
