"use client";

import { StyleCardSelector, type StyleOption } from "./style-card-selector";
import { Label } from "@/components/ui/label";

/**
 * 로고 선호 스타일 옵션
 * PRD 섹션 2.5 D-1 참조
 */
export const LOGO_STYLE_OPTIONS: StyleOption[] = [
  {
    id: "simple",
    name: "깔끔한",
    description: "심플하고 미니멀한 디자인",
    icon: "📐",
  },
  {
    id: "modern",
    name: "요즘 스타일",
    description: "모던하고 트렌디한 디자인",
    icon: "🎨",
  },
  {
    id: "premium",
    name: "고급스러운",
    description: "고급스럽고 클래식한 디자인",
    icon: "✨",
  },
  {
    id: "typography",
    name: "글꼴 중심",
    description: "타이포그래피 중심 디자인",
    icon: "🔤",
  },
];

interface LogoStyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiple?: boolean;
}

/**
 * 로고 선호 스타일 선택 컴포넌트
 * 45세 사용자를 위한 친근한 용어 사용
 */
export function LogoStyleSelector({
  value,
  onChange,
  disabled = false,
  multiple = false,
}: LogoStyleSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Label className="text-sm sm:text-base">원하시는 로고 느낌을 선택해주세요</Label>
        {multiple && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            여러 개 선택 가능
          </span>
        )}
      </div>
      <StyleCardSelector
        options={LOGO_STYLE_OPTIONS}
        value={value}
        onChange={(v) => onChange(Array.isArray(v) ? v.join(", ") : v)}
        multiple={multiple}
        columns={4}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * 로고 선호 색상 옵션
 */
export const LOGO_COLOR_OPTIONS: StyleOption[] = [
  {
    id: "blue",
    name: "파란색 계열",
    description: "신뢰, 전문성",
    icon: "🔵",
  },
  {
    id: "green",
    name: "초록색 계열",
    description: "자연, 친환경",
    icon: "🟢",
  },
  {
    id: "mono",
    name: "검정/흰색",
    description: "세련, 미니멀",
    icon: "⚫",
  },
  {
    id: "orange",
    name: "주황색 계열",
    description: "활기, 창의",
    icon: "🟠",
  },
  {
    id: "purple",
    name: "보라색 계열",
    description: "고급, 창의",
    icon: "🟣",
  },
  {
    id: "red",
    name: "빨간색 계열",
    description: "열정, 에너지",
    icon: "🔴",
  },
];

interface LogoColorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 로고 선호 색상 선택 컴포넌트
 */
export function LogoColorSelector({
  value,
  onChange,
  disabled = false,
}: LogoColorSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm sm:text-base">원하시는 로고 색상을 선택해주세요</Label>
      <StyleCardSelector
        options={LOGO_COLOR_OPTIONS}
        value={value}
        onChange={(v) => onChange(Array.isArray(v) ? v.join(", ") : v)}
        multiple={false}
        columns={3}
        disabled={disabled}
      />
    </div>
  );
}
