import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogoColorSelector, LOGO_COLOR_OPTIONS } from "../logo-style-selector";
import { StyleCardSelector } from "../style-card-selector";

describe("LogoColorSelector 컴포넌트", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("제목이 표시된다", () => {
      render(<LogoColorSelector {...defaultProps} />);

      expect(
        screen.getByText(/원하시는 로고 색상을 선택해주세요/),
      ).toBeInTheDocument();
    });

    it("직접 색상 선택 안내와 컬러피커가 표시된다", () => {
      render(<LogoColorSelector {...defaultProps} />);

      expect(screen.getByText(/무지개 바를 누르면 컬러피커가 열려요/)).toBeInTheDocument();
      expect(screen.getByLabelText("색상 직접 선택")).toBeInTheDocument();
    });

    it("색상 선택 전 상태가 표시된다", () => {
      render(<LogoColorSelector {...defaultProps} />);

      expect(screen.getByText("선택 전")).toBeInTheDocument();
    });
  });

  describe("선택 동작", () => {
    it("색상 카드 클릭 시 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(<LogoColorSelector {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText("색상 직접 선택"), {
        target: { value: "#315680" },
      });

      expect(onChange).toHaveBeenCalledWith("#315680");
    });

    it("선택된 색상에 체크마크가 표시된다", () => {
      render(<LogoColorSelector {...defaultProps} value="#315680" />);

      expect(screen.getByLabelText("색상 직접 선택")).toHaveValue("#315680");
      expect(screen.getByText("#315680")).toBeInTheDocument();
    });

    it("선택 결과가 하단에 표시된다", () => {
      render(<LogoColorSelector {...defaultProps} value="#22C55E" />);

      expect(screen.getByText(/선택한 색상/)).toBeInTheDocument();
      expect(screen.getByText("#22C55E")).toBeInTheDocument();
    });
  });

  describe("비활성화 상태", () => {
    it("disabled일 때 카드가 비활성화된다", () => {
      render(<LogoColorSelector {...defaultProps} disabled={true} />);

      expect(screen.getByLabelText("색상 직접 선택")).toBeDisabled();
    });

    it("disabled일 때 컬러피커 입력과 안내 바가 비활성 상태로 표시된다", () => {
      render(<LogoColorSelector {...defaultProps} disabled={true} />);

      const picker = screen.getByLabelText("색상 직접 선택");
      expect(picker).toBeDisabled();
      expect(picker.closest("label")).toHaveClass("cursor-not-allowed");
    });
  });
});

describe("StyleCardSelector 컴포넌트", () => {
  const options = [
    { id: "a", name: "Option A", description: "Description A", icon: "🔵" },
    { id: "b", name: "Option B", description: "Description B", icon: "🟢" },
    { id: "c", name: "Option C", description: "Description C", icon: "⚫" },
  ];

  const defaultProps = {
    options,
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("단일 선택 모드", () => {
    it("옵션들이 표시된다", () => {
      render(<StyleCardSelector {...defaultProps} />);

      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Option C")).toBeInTheDocument();
    });

    it("아이콘이 표시된다", () => {
      render(<StyleCardSelector {...defaultProps} />);

      expect(screen.getByText("🔵")).toBeInTheDocument();
      expect(screen.getByText("🟢")).toBeInTheDocument();
    });

    it("클릭 시 해당 옵션이 선택된다", () => {
      const onChange = vi.fn();
      render(<StyleCardSelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByText("Option A"));

      expect(onChange).toHaveBeenCalledWith("a");
    });

    it("다른 옵션 클릭 시 선택이 변경된다", () => {
      const onChange = vi.fn();
      render(
        <StyleCardSelector {...defaultProps} value="a" onChange={onChange} />,
      );

      fireEvent.click(screen.getByText("Option B"));

      expect(onChange).toHaveBeenCalledWith("b");
    });
  });

  describe("다중 선택 모드", () => {
    it("multiple이 true일 때 여러 개 선택 가능", () => {
      const onChange = vi.fn();
      render(
        <StyleCardSelector
          {...defaultProps}
          multiple={true}
          value={["a"]}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByText("Option B"));

      expect(onChange).toHaveBeenCalledWith(["a", "b"]);
    });

    it("이미 선택된 옵션 클릭 시 선택 해제", () => {
      const onChange = vi.fn();
      render(
        <StyleCardSelector
          {...defaultProps}
          multiple={true}
          value={["a", "b"]}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByText("Option A"));

      expect(onChange).toHaveBeenCalledWith(["b"]);
    });
  });

  describe("그리드 컬럼", () => {
    it("columns prop에 따라 그리드가 변경된다", () => {
      const { container } = render(
        <StyleCardSelector {...defaultProps} columns={2} />,
      );

      expect(container.querySelector(".grid-cols-2")).toBeInTheDocument();
    });
  });
});

describe("LOGO_COLOR_OPTIONS 상수", () => {
  it("6가지 색상 옵션이 정의되어 있다", () => {
    expect(LOGO_COLOR_OPTIONS).toHaveLength(6);
  });

  it("각 옵션에 id, name, description, icon이 있다", () => {
    LOGO_COLOR_OPTIONS.forEach((option) => {
      expect(option.id).toBeDefined();
      expect(option.name).toBeDefined();
      expect(option.description).toBeDefined();
      expect(option.icon).toBeDefined();
    });
  });

  it("blue 옵션이 포함되어 있다", () => {
    const blueOption = LOGO_COLOR_OPTIONS.find((o) => o.id === "blue");
    expect(blueOption).toBeDefined();
    expect(blueOption?.name).toBe("파란색 계열");
  });
});
