"use client"

import { useState } from "react"
import { Mail, Copy, Check, X, FileWarning } from "lucide-react"
import { FILE_CONFIG, getEmailGuideInfo, formatFileSize } from "@/lib/submission/file-validation"

interface EmailFileGuideProps {
  isOpen: boolean
  onClose: () => void
  errorType: 'SIZE_EXCEEDED' | 'UNSUPPORTED_FORMAT'
  fileName?: string
  fileSize?: number
  cohortName?: string
  userName?: string
}

export function EmailFileGuide({
  isOpen,
  onClose,
  errorType,
  fileName,
  fileSize,
  cohortName,
  userName,
}: EmailFileGuideProps) {
  const [copied, setCopied] = useState(false)
  const emailInfo = getEmailGuideInfo(cohortName, userName)

  if (!isOpen) return null

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailInfo.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // 클립보드 API 미지원 시 fallback
      const textArea = document.createElement('textarea')
      textArea.value = emailInfo.email
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getTitle = () => {
    if (errorType === 'SIZE_EXCEEDED') {
      return '파일이 너무 큽니다'
    }
    return '지원하지 않는 파일 형식입니다'
  }

  const getDescription = () => {
    if (errorType === 'SIZE_EXCEEDED') {
      const maxSizeMB = FILE_CONFIG.maxSize / (1024 * 1024)
      const fileSizeStr = fileSize ? formatFileSize(fileSize) : ''
      return (
        <>
          <p className="text-gray-600">
            업로드 가능한 최대 파일 크기는 <strong>{maxSizeMB}MB</strong>입니다.
            {fileSizeStr && (
              <span className="text-red-500 ml-1">
                (현재 파일: {fileSizeStr})
              </span>
            )}
          </p>
          <p className="text-gray-600 mt-1">
            아래 이메일로 파일을 보내주시면 담당자가 확인 후 처리해드립니다.
          </p>
        </>
      )
    }

    const supportedFormats = FILE_CONFIG.allowedExtensions
      .map((ext) => ext.replace('.', '').toUpperCase())
      .join(', ')

    return (
      <>
        <p className="text-gray-600">
          지원 형식: <strong>{supportedFormats}</strong>
        </p>
        <p className="text-gray-600 mt-1">
          원본 디자인 파일(PSD, AI 등)이나 압축 파일은 이메일로 보내주세요.
        </p>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              이메일로 파일 보내기
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 space-y-5">
          {/* 에러 메시지 */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <FileWarning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">{getTitle()}</p>
              {fileName && (
                <p className="text-sm text-amber-700 mt-1 break-all">
                  파일명: {fileName}
                </p>
              )}
            </div>
          </div>

          {/* 설명 */}
          <div className="text-sm">
            {getDescription()}
          </div>

          {/* 이메일 주소 복사 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              이메일 주소
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-sm text-gray-800">
                {emailInfo.email}
              </div>
              <button
                onClick={handleCopyEmail}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    복사됨
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-4 h-4" />
                    복사
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 이메일 작성 가이드 */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-700">
              이메일 작성 가이드
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">제목:</span> {emailInfo.subjectTemplate}
              </p>
              <p className="text-xs text-gray-500">
                예시: {emailInfo.example}
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 간단한 토스트 형태의 이메일 안내 (힌트용)
 */
export function EmailFileHint({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
      <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <p className="text-blue-800">
        파일이 크면 이메일(<span className="font-medium">{FILE_CONFIG.emailContact}</span>)로도 보낼 수 있어요
      </p>
      {onClose && (
        <button onClick={onClose} className="ml-auto p-1 hover:bg-blue-100 rounded">
          <X className="w-4 h-4 text-blue-600" />
        </button>
      )}
    </div>
  )
}
