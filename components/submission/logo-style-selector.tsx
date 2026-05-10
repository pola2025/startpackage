"use client";

import { StyleCardSelector, type StyleOption } from "./style-card-selector";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
        <Label className="text-sm sm:text-base">
          원하시는 로고 느낌을 선택해주세요
        </Label>
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

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * 로고 선호 색상 선택 컴포넌트
 * 가로 무지개 바를 클릭해 컬러피커에서 직접 색을 고름
 */
export function LogoColorSelector({
  value,
  onChange,
  disabled = false,
}: LogoColorSelectorProps) {
  const isHex = typeof value === "string" && HEX_PATTERN.test(value);
  const pickerValue = isHex ? value : "#1E40AF";

  return (
    <div className="space-y-3">
      <Label className="text-sm sm:text-base">
        원하시는 로고 색상을 선택해주세요
      </Label>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-xs sm:text-sm text-gray-600">
          아래 무지개 바를 누르면 컬러피커가 열려요. 원하는 색을 자유롭게
          골라주세요.
        </p>

        {/* 가로 무지개 컬러바 (클릭 시 시스템 컬러피커 열림) */}
        <label
          className={cn(
            "relative block w-full h-14 rounded-xl overflow-hidden border-2 shadow-inner transition-all",
            isHex
              ? "border-navy-700 ring-2 ring-navy-200"
              : "border-gray-300 hover:border-gray-400",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          )}
          style={{
            background:
              "linear-gradient(to right, #ff0000 0%, #ff7f00 14%, #ffd000 28%, #00d26a 43%, #00b4ff 57%, #2952ff 71%, #8b5cf6 85%, #ff00aa 100%)",
          }}
        >
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            disabled={disabled}
            aria-label="색상 직접 선택"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs sm:text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              여기를 눌러 색상 고르기
            </span>
          </div>
        </label>

        {/* 선택된 색상 표시 */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-lg border-2 shadow-sm flex-shrink-0",
              isHex ? "border-navy-700" : "border-gray-200 border-dashed",
            )}
            style={isHex ? { backgroundColor: value } : undefined}
          >
            {!isHex && (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center leading-tight px-1">
                선택 전
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">선택한 색상</p>
            <p className="font-mono text-base font-semibold text-gray-900 tabular-nums">
              {isHex ? value : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
