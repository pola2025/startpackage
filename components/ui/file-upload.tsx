"use client";

import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploadProps {
  // 필수
  label: string;
  accept: string;
  onChange: (file: File) => void;

  // 선택
  description?: string;
  maxSize?: number; // MB 단위
  currentFile?: string;
  currentFileName?: string;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  uploadSuccess?: boolean;
  error?: string;
  variant?: "default" | "compact";
  showPreview?: boolean;
  onDelete?: () => void;
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
  currentFile,
  currentFileName,
  required = false,
  disabled = false,
  uploading = false,
  uploadSuccess = false,
  error,
  variant = "default",
  showPreview = false,
  onDelete,
}: FileUploadProps) {
  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
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

      {/* 업로드 성공 표시 */}
      {uploadSuccess && currentFileName && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              {currentFileName}
            </span>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-green-100 rounded transition-colors"
              aria-label="파일 삭제"
            >
              <X className="w-4 h-4 text-green-600" />
            </button>
          )}
        </div>
      )}

      {/* Level 3: 에러 표시 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
