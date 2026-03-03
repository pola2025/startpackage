"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";

export default function TestUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string }>>(
    [],
  );

  const handleFileChange = (files: File | File[]) => {
    const fileArray = Array.isArray(files) ? files : [files];
    console.log("Selected files:", fileArray);
    setSelectedFiles((prev) => [
      ...prev,
      ...fileArray.map((f) => ({ name: f.name })),
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          파일 업로드 이메일 안내 테스트
        </h1>
        <p className="text-gray-600 mb-6">
          10MB 초과 또는 PSD/AI/ZIP 파일 업로드 시 이메일 안내 모달이
          표시됩니다.
        </p>

        <div className="space-y-8">
          <FileUpload
            label="사업자등록증"
            description="이미지 또는 PDF 파일을 업로드하세요"
            accept="image/*,application/pdf"
            maxSize={10}
            required
            onChange={handleFileChange}
            currentFiles={selectedFiles}
          />

          <div className="bg-gold-50 p-4 rounded-lg border border-gold-200">
            <h3 className="font-semibold text-navy-800 mb-2">테스트 방법</h3>
            <ul className="text-sm text-navy-700 space-y-1">
              <li>
                1. <strong>10MB 초과</strong> 파일 → 이메일 안내 모달
              </li>
              <li>
                2. <strong>.psd, .ai, .zip</strong> 파일 → 이메일 안내 모달
              </li>
              <li>3. 일반 이미지/PDF → 정상 업로드</li>
            </ul>
            <p className="text-xs text-gold-600 mt-2">
              이메일: mkt@polarad.co.kr
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
