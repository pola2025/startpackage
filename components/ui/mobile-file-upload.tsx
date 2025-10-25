"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Upload, Camera, CheckCircle2, X, Loader2, FileText } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface MobileFileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number; // in MB
  currentFileUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  allowCamera?: boolean;
  validateImage?: boolean;
  maxImageDimension?: number; // max width or height in pixels
}

export function MobileFileUpload({
  label,
  accept = "image/*,application/pdf",
  maxSize = 10,
  currentFileUrl,
  onUpload,
  onRemove,
  disabled = false,
  required = false,
  helpText,
  allowCamera = true,
  validateImage = false,
  maxImageDimension,
}: MobileFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = async (file: File): Promise<string | null> => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `파일 크기는 ${maxSize}MB 이하여야 합니다`;
    }

    // Check file type
    const acceptedTypes = accept.split(",").map((type) => type.trim());
    const fileType = file.type;
    const isAccepted = acceptedTypes.some((type) => {
      if (type === "image/*") return fileType.startsWith("image/");
      if (type === "application/pdf") return fileType === "application/pdf";
      return fileType === type;
    });

    if (!isAccepted) {
      return "지원하지 않는 파일 형식입니다";
    }

    // Validate image dimensions if required
    if (validateImage && file.type.startsWith("image/") && maxImageDimension) {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          if (img.width > maxImageDimension || img.height > maxImageDimension) {
            resolve(`이미지는 ${maxImageDimension}px 이하여야 합니다`);
          } else {
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve("이미지를 불러올 수 없습니다");
        };
        img.src = url;
      });
    }

    return null;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validationError = await validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setUploading(true);
    try {
      await onUpload(file);
      setError(null);
    } catch (err) {
      setError("파일 업로드에 실패했습니다");
      setPreview(null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (onRemove) {
      setUploading(true);
      try {
        await onRemove();
        setPreview(null);
      } catch (err) {
        setError("파일 삭제에 실패했습니다");
      } finally {
        setUploading(false);
      }
    }
  };

  const hasFile = currentFileUrl || preview;

  return (
    <div className="space-y-2 w-full">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helpText && <span className="text-xs text-gray-500">{helpText}</span>}
      </div>

      {/* Upload Area */}
      {!hasFile ? (
        <div className="space-y-3">
          {/* File Upload Button */}
          <label className="block">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || uploading}
            />
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 p-6 sm:p-8",
                "rounded-xl border-2 border-dashed transition-all duration-200",
                "min-h-[160px] sm:min-h-[180px]",
                disabled || uploading
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                  : "border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-400 cursor-pointer active:scale-[0.98]"
              )}
            >
              <div className="p-3 rounded-full bg-blue-100">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  파일 선택하기
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  클릭하여 파일을 선택하세요
                </p>
                {maxSize && (
                  <p className="text-xs text-gray-400">최대 {maxSize}MB</p>
                )}
              </div>
            </div>
          </label>

          {/* Camera Button - Mobile Only */}
          {allowCamera && (
            <label className="block sm:hidden">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || uploading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-2 border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold active:scale-[0.98]"
                disabled={disabled || uploading}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5 mr-2" />
                카메라로 촬영하기
              </Button>
            </label>
          )}
        </div>
      ) : (
        /* Uploaded File Display */
        <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
                {preview || currentFileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                ) : (
                  <FileText className="w-5 h-5 text-green-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-900">
                  업로드 완료
                </p>
                {currentFileUrl && (
                  <a
                    href={currentFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    파일 보기
                  </a>
                )}
              </div>
            </div>
            {onRemove && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Image Preview */}
          {preview && (
            <div className="mt-3 rounded-lg overflow-hidden border border-green-200">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-48 object-contain bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading Overlay */}
      {uploading && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            업로드 중...
          </span>
        </div>
      )}
    </div>
  );
}
