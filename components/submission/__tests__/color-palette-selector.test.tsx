import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ColorPaletteSelector,
  COLOR_PALETTE_OPTIONS,
} from "../color-palette-selector";

describe("ColorPaletteSelector 컴포넌트", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("제목이 표시된다", () => {
      render(<ColorPaletteSelector {...defaultProps} />);

      expect(
        screen.getByText(/홈페이지에 사용할 색상을 선택해주세요/),
      ).toBeInTheDocument();
    });

    it("6가지 색상 팔레트가 표시된다", () => {
      render(<ColorPaletteSelector {...defaultProps} />);

      expect(screen.getByText("파란색 계열")).toBeInTheDocument();
      expect(screen.getByText("초록색 계열")).toBeInTheDocument();
      expect(screen.getByText("검정/흰색")).toBeInTheDocument();
      expect(screen.getByText("주황색 계열")).toBeInTheDocument();
      expect(screen.getByText("보라색 계열")).toBeInTheDocument();
      expect(screen.getByText("빨간색 계열")).toBeInTheDocument();
    });

    it("각 팔레트에 3가지 색상 미리보기가 있다", () => {
      const { container } = render(<ColorPaletteSelector {...defaultProps} />);

      // 각 팔레트 카드에 3개의 색상 바가 있는지 확인
      const colorBars = container.querySelectorAll(".h-8.flex-1.rounded");
      expect(colorBars.length).toBe(18); // 6 palettes * 3 colors
    });
  });

  describe("선택 동작", () => {
    it("팔레트 클릭 시 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(<ColorPaletteSelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByText("파란색 계열"));

      expect(onChange).toHaveBeenCalledWith("#3B82F6");
    });

    it("선택된 팔레트에 체크마크가 표시된다", () => {
      render(<ColorPaletteSelector {...defaultProps} value="#3B82F6" />);

      const blueCard = screen.getByText("파란색 계열").closest("button");
      expect(blueCard).toHaveClass("border-gold-500");
    });

    it("선택 결과가 하단에 표시된다", () => {
      render(<ColorPaletteSelector {...defaultProps} value="#22C55E" />);

      expect(screen.getByText(/선택한 색상/)).toBeInTheDocument();
      expect(screen.getByText(/초록색 계열/)).toBeInTheDocument();
    });
  });

  describe("직접 입력", () => {
    it("직접 입력 필드가 표시된다", () => {
      render(<ColorPaletteSelector {...defaultProps} />);

      expect(screen.getByPlaceholderText(/네이비, 베이지/)).toBeInTheDocument();
    });

    it("직접 입력 시 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(<ColorPaletteSelector {...defaultProps} onChange={onChange} />);

      const input = screen.getByPlaceholderText(/네이비, 베이지/);
      fireEvent.change(input, { target: { value: "#FF5733" } });

      expect(onChange).toHaveBeenCalledWith("#FF5733");
    });

    it("showCustomInput이 false일 때 입력 필드가 숨겨진다", () => {
      render(
        <ColorPaletteSelector {...defaultProps} showCustomInput={false} />,
      );

      expect(
        screen.queryByPlaceholderText(/네이비, 베이지/),
      ).not.toBeInTheDocument();
    });
  });

  describe("비활성화 상태", () => {
    it("disabled일 때 팔레트가 비활성화된다", () => {
      render(<ColorPaletteSelector {...defaultProps} disabled={true} />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toBeDisabled();
      });
    });

    it("disabled일 때 입력 필드도 비활성화된다", () => {
      render(<ColorPaletteSelector {...defaultProps} disabled={true} />);

      expect(screen.getByPlaceholderText(/네이비, 베이지/)).toBeDisabled();
    });
  });
});

describe("COLOR_PALETTE_OPTIONS 상수", () => {
  it("6가지 팔레트가 정의되어 있다", () => {
    expect(COLOR_PALETTE_OPTIONS).toHaveLength(6);
  });

  it("각 팔레트에 id, name, description, colors, hex가 있다", () => {
    COLOR_PALETTE_OPTIONS.forEach((option) => {
      expect(option.id).toBeDefined();
      expect(option.name).toBeDefined();
      expect(option.description).toBeDefined();
      expect(option.colors).toBeDefined();
      expect(option.colors).toHaveLength(3);
      expect(option.hex).toBeDefined();
    });
  });

  it("blue 팔레트의 hex 값이 올바르다", () => {
    const blueOption = COLOR_PALETTE_OPTIONS.find((o) => o.id === "blue");
    expect(blueOption?.hex).toBe("#3B82F6");
  });

  it("모든 hex 값이 유효한 형식이다", () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    COLOR_PALETTE_OPTIONS.forEach((option) => {
      expect(option.hex).toMatch(hexRegex);
    });
  });
});
