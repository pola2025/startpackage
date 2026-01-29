import { describe, it, expect } from 'vitest'
import {
  validateFile,
  FILE_CONFIG,
  type FileValidationResult,
} from '../file-validation'

describe('파일 검증 유틸 (file-validation)', () => {
  describe('validateFile', () => {
    // ========================================
    // 성공 케이스
    // ========================================
    describe('유효한 파일', () => {
      it('5MB JPG 파일은 유효하다', () => {
        const file = createMockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('1MB PNG 파일은 유효하다', () => {
        const file = createMockFile('test.png', 1 * 1024 * 1024, 'image/png')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })

      it('2MB PDF 파일은 유효하다', () => {
        const file = createMockFile('document.pdf', 2 * 1024 * 1024, 'application/pdf')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })

      it('500KB WEBP 파일은 유효하다', () => {
        const file = createMockFile('image.webp', 500 * 1024, 'image/webp')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })

      it('정확히 10MB 파일은 유효하다 (경계값)', () => {
        const file = createMockFile('test.jpg', 10 * 1024 * 1024, 'image/jpeg')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })
    })

    // ========================================
    // 파일 크기 초과 케이스
    // ========================================
    describe('파일 크기 초과', () => {
      it('15MB 파일은 크기 초과 에러를 반환한다', () => {
        const file = createMockFile('large.jpg', 15 * 1024 * 1024, 'image/jpeg')
        const result = validateFile(file)

        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('SIZE_EXCEEDED')
        expect(result.error?.showEmailGuide).toBe(true)
      })

      it('10MB + 1byte 파일은 크기 초과 에러를 반환한다 (경계값)', () => {
        const file = createMockFile('test.jpg', 10 * 1024 * 1024 + 1, 'image/jpeg')
        const result = validateFile(file)

        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('SIZE_EXCEEDED')
      })

      it('크기 초과 시 이메일 안내 메시지를 포함한다', () => {
        const file = createMockFile('huge.png', 50 * 1024 * 1024, 'image/png')
        const result = validateFile(file)

        expect(result.error?.message).toContain('10MB')
        expect(result.error?.message).toContain(FILE_CONFIG.emailContact)
      })
    })

    // ========================================
    // 지원하지 않는 파일 형식 케이스
    // ========================================
    describe('지원하지 않는 파일 형식', () => {
      it('PSD 파일은 형식 에러를 반환한다', () => {
        const file = createMockFile('design.psd', 1 * 1024 * 1024, 'image/vnd.adobe.photoshop')
        const result = validateFile(file)

        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('UNSUPPORTED_FORMAT')
        expect(result.error?.showEmailGuide).toBe(true)
      })

      it('AI 파일은 형식 에러를 반환한다', () => {
        const file = createMockFile('logo.ai', 2 * 1024 * 1024, 'application/illustrator')
        const result = validateFile(file)

        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('UNSUPPORTED_FORMAT')
      })

      it('ZIP 파일은 형식 에러를 반환한다', () => {
        const file = createMockFile('files.zip', 5 * 1024 * 1024, 'application/zip')
        const result = validateFile(file)

        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('UNSUPPORTED_FORMAT')
      })

      it('EXE 파일은 형식 에러를 반환한다', () => {
        const file = createMockFile('program.exe', 1 * 1024 * 1024, 'application/x-msdownload')
        const result = validateFile(file)

        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('UNSUPPORTED_FORMAT')
      })

      it('지원하지 않는 형식 에러 메시지에 지원 형식 목록을 포함한다', () => {
        const file = createMockFile('design.psd', 1 * 1024 * 1024, 'image/vnd.adobe.photoshop')
        const result = validateFile(file)

        expect(result.error?.message).toContain('JPG')
        expect(result.error?.message).toContain('PNG')
        expect(result.error?.message).toContain('PDF')
      })
    })

    // ========================================
    // 복합 에러 케이스 (크기 + 형식)
    // ========================================
    describe('복합 에러 케이스', () => {
      it('크기 초과 + 지원하지 않는 형식일 때 SIZE_EXCEEDED를 우선 반환한다', () => {
        const file = createMockFile('huge.psd', 20 * 1024 * 1024, 'image/vnd.adobe.photoshop')
        const result = validateFile(file)

        // 크기 에러가 먼저 체크됨
        expect(result.isValid).toBe(false)
        expect(result.error?.type).toBe('SIZE_EXCEEDED')
      })
    })

    // ========================================
    // 확장자 기반 검증 케이스
    // ========================================
    describe('확장자 기반 검증', () => {
      it('MIME 타입이 없어도 확장자로 JPG를 인식한다', () => {
        const file = createMockFile('photo.jpg', 1 * 1024 * 1024, '')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })

      it('MIME 타입이 없어도 확장자로 PDF를 인식한다', () => {
        const file = createMockFile('document.pdf', 1 * 1024 * 1024, '')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })

      it('대소문자 구분 없이 확장자를 인식한다', () => {
        const file = createMockFile('PHOTO.JPG', 1 * 1024 * 1024, '')
        const result = validateFile(file)

        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('FILE_CONFIG', () => {
    it('최대 파일 크기는 10MB이다', () => {
      expect(FILE_CONFIG.maxSize).toBe(10 * 1024 * 1024)
    })

    it('이메일 연락처가 정의되어 있다', () => {
      expect(FILE_CONFIG.emailContact).toBe('mkt@polarad.co.kr')
    })

    it('허용된 MIME 타입이 정의되어 있다', () => {
      expect(FILE_CONFIG.allowedTypes).toContain('image/jpeg')
      expect(FILE_CONFIG.allowedTypes).toContain('image/png')
      expect(FILE_CONFIG.allowedTypes).toContain('image/webp')
      expect(FILE_CONFIG.allowedTypes).toContain('application/pdf')
    })

    it('허용된 확장자가 정의되어 있다', () => {
      expect(FILE_CONFIG.allowedExtensions).toContain('.jpg')
      expect(FILE_CONFIG.allowedExtensions).toContain('.jpeg')
      expect(FILE_CONFIG.allowedExtensions).toContain('.png')
      expect(FILE_CONFIG.allowedExtensions).toContain('.pdf')
    })
  })
})

// ========================================
// 헬퍼 함수
// ========================================
function createMockFile(name: string, size: number, type: string): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}
