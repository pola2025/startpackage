"use client";

import { useState } from "react";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploadProps {
  // 필수
  label: string;
  accept: string;
  onChange: (file: File | File[]) => void;

  // 선택
  description?: string;
  maxSize?: number; // MB 단위
  maxFiles?: number; // 최대 파일 개수 (기본: 1)
  currentFiles?: Array<{ name: string; url?: string }>;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  uploadSuccess?: boolean;
  error?: string;
  variant?: "default" | "compact";
  showPreview?: boolean;
  onDelete?: (index: number) => void;
}

/**
 * FileUpload 컴포넌트
 *
 * 파일 업로드를 위한 공통 컴포넌트
 * 드래그 앤 드롭, 파일 검증, 미리보기 지원
 */
export function FileUpload({
  label,
  accept,
  onChange,
  description,
  maxSize = 10,
  maxFiles = 1,
  currentFiles = [],
  required = false,
  disabled = false,
  uploading = false,
  uploadSuccess = false,
  error,
  variant = "default",
  showPreview = false,
  onDelete,
}: FileUploadProps) {
  // 내부 에러 상태 (검증 에러)
  const [internalError, setInternalError] = useState<string | null>(null);

  // 파일 검증 함수
  const validateFile = (file: File): string | null => {
    // 파일 크기 검증 (MB 단위)
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSize) {
      return `파일 크기가 너무 큽니다. 최대 ${maxSize}MB까지 업로드 가능합니다.`;
    }

    // 파일 형식 검증
    if (accept && accept !== "*") {
      const acceptedTypes = accept.split(",").map(t => t.trim().toLowerCase());
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const fileMimeType = file.type.toLowerCase();

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith(".")) {
          // 확장자 검증 (예: .jpg, .png)
          return fileExtension === type;
        } else if (type.includes("/*")) {
          // MIME 타입 와일드카드 검증 (예: image/*)
          const baseType = type.split("/")[0];
          return fileMimeType.startsWith(`${baseType}/`);
        } else {
          // 정확한 MIME 타입 검증 (예: application/pdf)
          return fileMimeType === type;
        }
      });

      if (!isAccepted) {
        return `지원하지 않는 파일 형식입니다. (허용: ${accept})`;
      }
    }

    return null;
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 다중 파일 업로드인 경우
    if (maxFiles > 1) {
      const fileArray = Array.from(files);

      // 최대 개수 체크
      if (currentFiles.length + fileArray.length > maxFiles) {
        setInternalError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
        return;
      }

      // 각 파일 검증
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setInternalError(validationError);
          return;
        }
      }

      // 모든 파일 검증 통과
      setInternalError(null);
      onChange(fileArray);
    } else {
      // 단일 파일 업로드
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setInternalError(validationError);
        return;
      }
      setInternalError(null);
      onChange(file);
    }
  };

  return (
    <div className="space-y-2">
      {/* Level 1: 타이틀 + 필수 배지 */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-900">
          {label}
        </label>
        {required && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            필수
          </span>
        )}
      </div>

      {/* Level 1: 설명 */}
      {description && (
        <p className="text-sm text-gray-600">
          {description}
        </p>
      )}

      {/* Level 2: 업로드 영역 */}
      <label className="block">
        <input
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading || (maxFiles > 1 && currentFiles.length >= maxFiles)}
        />
        <div
          className={`
            flex items-center justify-center gap-3
            ${variant === "compact" ? "p-3" : "p-6"}
            rounded-lg border-2 border-dashed
            bg-gray-50 border-gray-300
            hover:bg-blue-50 hover:border-blue-500
            cursor-pointer transition-all
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${uploading ? "opacity-75" : ""}
          `}
        >
          <Upload className="w-5 h-5 text-gray-600" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {uploading ? "업로드 중..." : "파일을 선택하거나 여기에 드롭"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {accept.split(",").join(", ")} (최대 {maxSize}MB)
            </p>
          </div>
        </div>
      </label>

      {/* 업로드된 파일 목록 */}
      {currentFiles.length > 0 && (
        <div className="space-y-2">
          {currentFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  {file.name}
                </span>
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(index)}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                  aria-label="파일 삭제"
                >
                  <X className="w-4 h-4 text-green-600" />
                </button>
              )}
            </div>
          ))}
          {maxFiles > 1 && (
            <p className="text-xs text-gray-500">
              {currentFiles.length} / {maxFiles}개 파일 업로드됨
            </p>
          )}
        </div>
      )}

      {/* Level 3: 에러 표시 (외부 에러 또는 내부 검증 에러) */}
      {(error || internalError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600">
            {error || internalError}
          </p>
        </div>
      )}
    </div>
  );
}
