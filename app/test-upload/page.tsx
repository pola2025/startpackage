"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";

export default function TestUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (files: File | File[]) => {
    const fileArray = Array.isArray(files) ? files : [files];
    console.log("Selected files:", fileArray);

    // 업로드 시뮬레이션
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setSelectedFiles(prev => [...prev, ...fileArray.map(f => ({ name: f.name }))]);
    }, 2000);
  };

  const handleDelete = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          FileUpload 컴포넌트 테스트
        </h1>

        <div className="space-y-8">
          {/* 테스트 1: 다중 파일 업로드 (최대 3개) */}
          <FileUpload
            label="시안 파일 (최대 3개)"
            description="AI, JPEG, PNG 파일을 최대 3개까지 업로드하세요"
            accept="image/*,.ai"
            maxSize={20}
            maxFiles={3}
            required
            onChange={handleFileChange}
            uploading={uploading}
            currentFiles={selectedFiles}
            onDelete={handleDelete}
          />

          {/* 테스트 2: 단일 파일 - 파일 크기 검증 */}
          <FileUpload
            label="로고"
            description="회사 또는 브랜드 로고를 업로드하세요"
            accept="image/*"
            maxSize={5}
            onChange={handleFileChange}
            uploading={uploading}
            currentFiles={selectedFiles}
            onDelete={handleDelete}
          />

          {/* 테스트 3: compact 버전 - 파일 형식 검증 */}
          <FileUpload
            label="사업자등록증"
            description="사업자등록증 또는 고유번호증을 업로드하세요 (이미지 또는 PDF만 가능)"
            accept="image/*,application/pdf"
            maxSize={10}
            onChange={handleFileChange}
            variant="compact"
            currentFiles={selectedFiles}
            onDelete={handleDelete}
          />

          {/* 테스트 4: disabled 상태 */}
          <FileUpload
            label="비활성 필드"
            accept="image/*"
            onChange={handleFileChange}
            disabled
          />

          {/* 선택된 파일 정보 */}
          {selectedFiles.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                전체 업로드된 파일: {selectedFiles.length}개
              </h3>
              <ul className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="text-sm text-blue-700">
                    {index + 1}. {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
