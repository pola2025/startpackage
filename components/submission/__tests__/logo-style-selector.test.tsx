import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LogoColorSelector, LOGO_COLOR_OPTIONS } from '../logo-style-selector'
import { StyleCardSelector } from '../style-card-selector'

describe('LogoColorSelector 컴포넌트', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('제목이 표시된다', () => {
      render(<LogoColorSelector {...defaultProps} />)

      expect(screen.getByText(/원하시는 로고 색상을 선택해주세요/)).toBeInTheDocument()
    })

    it('6가지 색상 옵션이 표시된다', () => {
      render(<LogoColorSelector {...defaultProps} />)

      expect(screen.getByText('파란색 계열')).toBeInTheDocument()
      expect(screen.getByText('초록색 계열')).toBeInTheDocument()
      expect(screen.getByText('검정/흰색')).toBeInTheDocument()
      expect(screen.getByText('주황색 계열')).toBeInTheDocument()
      expect(screen.getByText('보라색 계열')).toBeInTheDocument()
      expect(screen.getByText('빨간색 계열')).toBeInTheDocument()
    })

    it('각 색상에 설명이 표시된다', () => {
      render(<LogoColorSelector {...defaultProps} />)

      expect(screen.getByText('신뢰, 전문성')).toBeInTheDocument()
      expect(screen.getByText('자연, 친환경')).toBeInTheDocument()
      expect(screen.getByText('세련, 미니멀')).toBeInTheDocument()
    })
  })

  describe('선택 동작', () => {
    it('색상 카드 클릭 시 onChange가 호출된다', () => {
      const onChange = vi.fn()
      render(<LogoColorSelector {...defaultProps} onChange={onChange} />)

      fireEvent.click(screen.getByText('파란색 계열'))

      expect(onChange).toHaveBeenCalledWith('blue')
    })

    it('선택된 색상에 체크마크가 표시된다', () => {
      render(<LogoColorSelector {...defaultProps} value="blue" />)

      // 선택된 카드에 체크 아이콘이 있는지 확인
      const blueCard = screen.getByText('파란색 계열').closest('button')
      expect(blueCard).toHaveClass('border-blue-500')
    })

    it('선택 결과가 하단에 표시된다', () => {
      render(<LogoColorSelector {...defaultProps} value="green" />)

      expect(screen.getByText(/선택한 스타일/)).toBeInTheDocument()
      expect(screen.getByText(/초록색 계열/)).toBeInTheDocument()
    })
  })

  describe('비활성화 상태', () => {
    it('disabled일 때 카드가 비활성화된다', () => {
      render(<LogoColorSelector {...defaultProps} disabled={true} />)

      const cards = screen.getAllByRole('button')
      cards.forEach(card => {
        expect(card).toBeDisabled()
      })
    })

    it('disabled일 때 클릭해도 onChange가 호출되지 않는다', () => {
      const onChange = vi.fn()
      render(<LogoColorSelector {...defaultProps} onChange={onChange} disabled={true} />)

      fireEvent.click(screen.getByText('파란색 계열'))

      expect(onChange).not.toHaveBeenCalled()
    })
  })
})

describe('StyleCardSelector 컴포넌트', () => {
  const options = [
    { id: 'a', name: 'Option A', description: 'Description A', icon: '🔵' },
    { id: 'b', name: 'Option B', description: 'Description B', icon: '🟢' },
    { id: 'c', name: 'Option C', description: 'Description C', icon: '⚫' },
  ]

  const defaultProps = {
    options,
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('단일 선택 모드', () => {
    it('옵션들이 표시된다', () => {
      render(<StyleCardSelector {...defaultProps} />)

      expect(screen.getByText('Option A')).toBeInTheDocument()
      expect(screen.getByText('Option B')).toBeInTheDocument()
      expect(screen.getByText('Option C')).toBeInTheDocument()
    })

    it('아이콘이 표시된다', () => {
      render(<StyleCardSelector {...defaultProps} />)

      expect(screen.getByText('🔵')).toBeInTheDocument()
      expect(screen.getByText('🟢')).toBeInTheDocument()
    })

    it('클릭 시 해당 옵션이 선택된다', () => {
      const onChange = vi.fn()
      render(<StyleCardSelector {...defaultProps} onChange={onChange} />)

      fireEvent.click(screen.getByText('Option A'))

      expect(onChange).toHaveBeenCalledWith('a')
    })

    it('다른 옵션 클릭 시 선택이 변경된다', () => {
      const onChange = vi.fn()
      render(<StyleCardSelector {...defaultProps} value="a" onChange={onChange} />)

      fireEvent.click(screen.getByText('Option B'))

      expect(onChange).toHaveBeenCalledWith('b')
    })
  })

  describe('다중 선택 모드', () => {
    it('multiple이 true일 때 여러 개 선택 가능', () => {
      const onChange = vi.fn()
      render(<StyleCardSelector {...defaultProps} multiple={true} value={['a']} onChange={onChange} />)

      fireEvent.click(screen.getByText('Option B'))

      expect(onChange).toHaveBeenCalledWith(['a', 'b'])
    })

    it('이미 선택된 옵션 클릭 시 선택 해제', () => {
      const onChange = vi.fn()
      render(<StyleCardSelector {...defaultProps} multiple={true} value={['a', 'b']} onChange={onChange} />)

      fireEvent.click(screen.getByText('Option A'))

      expect(onChange).toHaveBeenCalledWith(['b'])
    })
  })

  describe('그리드 컬럼', () => {
    it('columns prop에 따라 그리드가 변경된다', () => {
      const { container } = render(<StyleCardSelector {...defaultProps} columns={2} />)

      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument()
    })
  })
})

describe('LOGO_COLOR_OPTIONS 상수', () => {
  it('6가지 색상 옵션이 정의되어 있다', () => {
    expect(LOGO_COLOR_OPTIONS).toHaveLength(6)
  })

  it('각 옵션에 id, name, description, icon이 있다', () => {
    LOGO_COLOR_OPTIONS.forEach(option => {
      expect(option.id).toBeDefined()
      expect(option.name).toBeDefined()
      expect(option.description).toBeDefined()
      expect(option.icon).toBeDefined()
    })
  })

  it('blue 옵션이 포함되어 있다', () => {
    const blueOption = LOGO_COLOR_OPTIONS.find(o => o.id === 'blue')
    expect(blueOption).toBeDefined()
    expect(blueOption?.name).toBe('파란색 계열')
  })
})
