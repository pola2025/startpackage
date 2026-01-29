/**
 * 파일 검증 유틸리티
 * - 파일 크기 검증
 * - 파일 형식 검증
 * - 이메일 안내 메시지 생성
 */

export const FILE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  emailContact: 'mkt@polarad.co.kr',
} as const

export type FileErrorType = 'SIZE_EXCEEDED' | 'UNSUPPORTED_FORMAT' | 'OTHER'

export interface FileValidationError {
  type: FileErrorType
  message: string
  showEmailGuide: boolean
}

export interface FileValidationResult {
  isValid: boolean
  error?: FileValidationError
}

/**
 * 파일 유효성 검사
 * @param file - 검증할 파일
 * @returns 검증 결과
 */
export function validateFile(file: File): FileValidationResult {
  // 1. 파일 크기 검증 (우선 체크)
  if (file.size > FILE_CONFIG.maxSize) {
    const maxSizeMB = FILE_CONFIG.maxSize / (1024 * 1024)
    return {
      isValid: false,
      error: {
        type: 'SIZE_EXCEEDED',
        message: `파일 크기가 ${maxSizeMB}MB를 초과합니다. 이메일(${FILE_CONFIG.emailContact})로 파일을 보내주세요.`,
        showEmailGuide: true,
      },
    }
  }

  // 2. 파일 형식 검증 (MIME 타입 또는 확장자)
  const isValidType = isValidFileType(file)
  if (!isValidType) {
    const supportedFormats = FILE_CONFIG.allowedExtensions
      .map((ext) => ext.replace('.', '').toUpperCase())
      .join(', ')

    return {
      isValid: false,
      error: {
        type: 'UNSUPPORTED_FORMAT',
        message: `지원하지 않는 파일 형식입니다. 지원 형식: ${supportedFormats}. 원본 파일은 이메일(${FILE_CONFIG.emailContact})로 보내주세요.`,
        showEmailGuide: true,
      },
    }
  }

  return { isValid: true }
}

/**
 * 파일 타입 유효성 검사 (MIME 타입 또는 확장자)
 */
function isValidFileType(file: File): boolean {
  // MIME 타입으로 검증
  if (file.type && FILE_CONFIG.allowedTypes.includes(file.type)) {
    return true
  }

  // 확장자로 검증 (MIME 타입이 없거나 불명확한 경우)
  const extension = getFileExtension(file.name)
  if (extension && FILE_CONFIG.allowedExtensions.includes(extension.toLowerCase())) {
    return true
  }

  return false
}

/**
 * 파일명에서 확장자 추출
 */
function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return null
  return filename.slice(lastDot).toLowerCase()
}

/**
 * 이메일 안내 정보 생성
 */
export function getEmailGuideInfo(cohortName?: string, userName?: string) {
  return {
    email: FILE_CONFIG.emailContact,
    subjectTemplate: cohortName && userName
      ? `[${cohortName}] ${userName} - 파일명`
      : '[기수명] 성함 - 파일명',
    example: '[25기] 홍길동 - 사업자등록증',
  }
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
