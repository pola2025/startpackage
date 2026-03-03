"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";

/**
 * 홈페이지 컬러 팔레트 옵션
 * PRD 섹션 2.5 D-3 참조
 */
export const COLOR_PALETTE_OPTIONS = [
  {
    id: "blue",
    name: "파란색 계열",
    description: "신뢰, 전문성",
    colors: ["#1E40AF", "#3B82F6", "#93C5FD"],
    hex: "#3B82F6",
  },
  {
    id: "green",
    name: "초록색 계열",
    description: "자연, 친환경",
    colors: ["#166534", "#22C55E", "#86EFAC"],
    hex: "#22C55E",
  },
  {
    id: "mono",
    name: "검정/흰색",
    description: "세련, 미니멀",
    colors: ["#1F2937", "#6B7280", "#E5E7EB"],
    hex: "#1F2937",
  },
  {
    id: "orange",
    name: "주황색 계열",
    description: "활기, 창의",
    colors: ["#C2410C", "#F97316", "#FDBA74"],
    hex: "#F97316",
  },
  {
    id: "purple",
    name: "보라색 계열",
    description: "고급, 창의",
    colors: ["#6B21A8", "#A855F7", "#D8B4FE"],
    hex: "#A855F7",
  },
  {
    id: "red",
    name: "빨간색 계열",
    description: "열정, 에너지",
    colors: ["#B91C1C", "#EF4444", "#FCA5A5"],
    hex: "#EF4444",
  },
];

interface ColorPaletteSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showCustomInput?: boolean;
}

/**
 * 홈페이지 컬러 팔레트 선택 컴포넌트
 * 45세 사용자를 위한 직관적인 색상 선택 UI
 */
export function ColorPaletteSelector({
  value,
  onChange,
  disabled = false,
  showCustomInput = true,
}: ColorPaletteSelectorProps) {
  const [customColor, setCustomColor] = useState("");

  // value가 미리 정의된 옵션인지 확인
  const selectedOption = COLOR_PALETTE_OPTIONS.find(
    (opt) => opt.id === value || opt.hex === value || opt.name === value,
  );

  const handleSelect = (option: (typeof COLOR_PALETTE_OPTIONS)[0]) => {
    if (disabled) return;
    onChange(option.hex);
    setCustomColor("");
  };

  const handleCustomColorChange = (colorValue: string) => {
    setCustomColor(colorValue);
    if (colorValue) {
      onChange(colorValue);
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm sm:text-base">
        홈페이지에 사용할 색상을 선택해주세요
      </Label>

      {/* 색상 팔레트 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {COLOR_PALETTE_OPTIONS.map((option) => {
          const isSelected =
            selectedOption?.id === option.id || value === option.hex;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={disabled}
              className={cn(
                "relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200",
                "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2",
                isSelected
                  ? "border-gold-500 bg-gold-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300",
                disabled && "opacity-50 cursor-not-allowed hover:shadow-none",
              )}
            >
              {/* 선택 체크마크 */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* 색상 미리보기 바 */}
              <div className="flex gap-1 mb-3 w-full">
                {option.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="h-8 flex-1 rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* 이름 */}
              <span
                className={cn(
                  "font-medium text-sm text-center",
                  isSelected ? "text-navy-700" : "text-gray-700",
                )}
              >
                {option.name}
              </span>

              {/* 설명 */}
              <span className="text-xs text-gray-500 text-center mt-1">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* 직접 입력 */}
      {showCustomInput && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <Label className="text-sm text-gray-600">
            또는 원하시는 색상을 직접 입력해주세요
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="예: 네이비, 베이지, #FF5733 등"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            {customColor && (
              <div
                className="w-10 h-10 rounded-lg border-2 border-gray-200"
                style={{
                  backgroundColor: customColor.startsWith("#")
                    ? customColor
                    : undefined,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* 선택 결과 표시 */}
      {value && (
        <div className="flex items-center gap-2 text-sm text-gold-600 bg-gold-50 p-3 rounded-lg">
          <div
            className="w-6 h-6 rounded-full border-2 border-white shadow"
            style={{
              backgroundColor:
                selectedOption?.hex ||
                (value.startsWith("#") ? value : "#3B82F6"),
            }}
          />
          <span>
            선택한 색상: <strong>{selectedOption?.name || value}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
