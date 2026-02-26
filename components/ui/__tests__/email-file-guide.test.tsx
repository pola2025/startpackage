import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmailFileGuide, EmailFileToast } from '../email-file-guide'

describe('EmailFileGuide 컴포넌트', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('모달 표시', () => {
    it('isOpen이 true일 때 모달이 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} />)

      expect(screen.getByText(/이메일로 파일을 보내주세요/)).toBeInTheDocument()
    })

    it('isOpen이 false일 때 모달이 표시되지 않는다', () => {
      render(<EmailFileGuide {...defaultProps} isOpen={false} />)

      expect(screen.queryByText(/이메일로 파일을 보내주세요/)).not.toBeInTheDocument()
    })
  })

  describe('이메일 주소 표시', () => {
    it('이메일 주소 mkt@polarad.co.kr이 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} />)

      expect(screen.getByText('mkt@polarad.co.kr')).toBeInTheDocument()
    })
  })

  describe('복사 버튼', () => {
    it('복사 버튼이 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} />)

      expect(screen.getByRole('button', { name: /복사/ })).toBeInTheDocument()
    })

    it('복사 버튼 클릭 시 클립보드에 이메일이 복사된다', async () => {
      render(<EmailFileGuide {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: /복사/ })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mkt@polarad.co.kr')
      })
    })

    it('복사 후 "복사됨" 메시지가 표시된다', async () => {
      render(<EmailFileGuide {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: /복사/ })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText(/복사됨/)).toBeInTheDocument()
      })
    })
  })

  describe('에러 타입별 메시지', () => {
    it('SIZE_EXCEEDED 타입일 때 크기 관련 메시지가 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} errorType="SIZE_EXCEEDED" />)

      expect(screen.getByText(/용량이 너무 큰/)).toBeInTheDocument()
    })

    it('UNSUPPORTED_FORMAT 타입일 때 형식 관련 메시지가 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} errorType="UNSUPPORTED_FORMAT" />)

      expect(screen.getByText(/지원하지 않는/)).toBeInTheDocument()
    })
  })

  describe('이메일 작성 가이드', () => {
    it('이메일 제목 가이드가 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} />)

      expect(screen.getByText(/기수명.*성함.*파일명/)).toBeInTheDocument()
    })

    it('예시가 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} />)

      expect(screen.getByText(/25기.*홍길동/)).toBeInTheDocument()
    })
  })

  describe('확인 버튼', () => {
    it('확인 버튼이 표시된다', () => {
      render(<EmailFileGuide {...defaultProps} />)

      expect(screen.getByRole('button', { name: /확인/ })).toBeInTheDocument()
    })

    it('확인 버튼 클릭 시 onClose가 호출된다', () => {
      const onClose = vi.fn()
      render(<EmailFileGuide {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByRole('button', { name: /확인/ }))

      expect(onClose).toHaveBeenCalled()
    })
  })
})

describe('EmailFileToast 컴포넌트', () => {
  it('토스트 메시지가 표시된다', () => {
    render(<EmailFileToast show={true} />)

    expect(screen.getByText(/이메일.*로도 보낼 수 있어요/)).toBeInTheDocument()
  })

  it('show가 false일 때 토스트가 표시되지 않는다', () => {
    render(<EmailFileToast show={false} />)

    expect(screen.queryByText(/이메일.*로도 보낼 수 있어요/)).not.toBeInTheDocument()
  })

  it('이메일 주소가 포함되어 있다', () => {
    render(<EmailFileToast show={true} />)

    expect(screen.getByText(/mkt@polarad\.co\.kr/)).toBeInTheDocument()
  })
})
