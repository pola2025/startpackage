"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";

export default function TestUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (file: File) => {
    console.log("Selected file:", file);
    setSelectedFile(file);
    setUploadSuccess(false);

    // 업로드 시뮬레이션
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadSuccess(true);
    }, 2000);
  };

  const handleDelete = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          FileUpload 컴포넌트 테스트
        </h1>

        <div className="space-y-8">
          {/* 테스트 1: 기본 사용 - 파일 크기 검증 */}
          <FileUpload
            label="로고"
            description="회사 또는 브랜드 로고를 업로드하세요"
            accept="image/*"
            maxSize={5}
            required
            onChange={handleFileChange}
            uploading={uploading}
            uploadSuccess={uploadSuccess}
            currentFileName={selectedFile?.name}
            onDelete={handleDelete}
          />

          {/* 테스트 2: compact 버전 - 파일 형식 검증 */}
          <FileUpload
            label="사업자등록증"
            description="사업자등록증 또는 고유번호증을 업로드하세요 (이미지 또는 PDF만 가능)"
            accept="image/*,application/pdf"
            maxSize={10}
            onChange={handleFileChange}
            variant="compact"
            uploadSuccess={uploadSuccess}
            currentFileName={selectedFile?.name}
            onDelete={handleDelete}
          />

          {/* 테스트 3: 확장자 검증 */}
          <FileUpload
            label="ZIP 파일 테스트"
            description="ZIP 파일만 업로드 가능"
            accept=".zip,application/zip"
            maxSize={20}
            onChange={handleFileChange}
            uploadSuccess={uploadSuccess}
            currentFileName={selectedFile?.name}
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
          {selectedFile && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">
                선택된 파일:
              </h3>
              <p className="text-sm text-green-700">
                이름: {selectedFile.name}
              </p>
              <p className="text-sm text-green-700">
                크기: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-sm text-green-700">
                타입: {selectedFile.type}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
