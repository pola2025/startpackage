"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  icon?: string; // emoji
  preview?: React.ReactNode;
}

interface StyleCardSelectorProps {
  options: StyleOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  className?: string;
}

/**
 * 카드형 스타일 선택 컴포넌트
 * PRD D-1, D-2, D-3 참조
 */
export function StyleCardSelector({
  options,
  value,
  onChange,
  multiple = false,
  columns = 4,
  disabled = false,
  className,
}: StyleCardSelectorProps) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const handleSelect = (optionId: string) => {
    if (disabled) return;

    if (multiple) {
      const newValues = selectedValues.includes(optionId)
        ? selectedValues.filter((v) => v !== optionId)
        : [...selectedValues, optionId];
      onChange(newValues);
    } else {
      onChange(optionId);
    }
  };

  const isSelected = (optionId: string) => selectedValues.includes(optionId);

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className={cn("grid gap-3", gridCols[columns])}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelect(option.id)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              isSelected(option.id)
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300",
              disabled && "opacity-50 cursor-not-allowed hover:shadow-none"
            )}
          >
            {/* 선택 체크마크 */}
            {isSelected(option.id) && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            {/* 아이콘 또는 미리보기 */}
            {option.icon && (
              <span className="text-3xl mb-2" role="img" aria-label={option.name}>
                {option.icon}
              </span>
            )}
            {option.preview && <div className="mb-2">{option.preview}</div>}

            {/* 이름 */}
            <span
              className={cn(
                "font-medium text-sm text-center",
                isSelected(option.id) ? "text-blue-700" : "text-gray-700"
              )}
            >
              {option.name}
            </span>

            {/* 설명 */}
            <span className="text-xs text-gray-500 text-center mt-1">
              {option.description}
            </span>
          </button>
        ))}
      </div>

      {/* 선택 결과 표시 */}
      {selectedValues.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
          <span>💡</span>
          <span>
            선택한 스타일:{" "}
            <strong>
              {selectedValues
                .map((v) => options.find((o) => o.id === v)?.name)
                .filter(Boolean)
                .join(", ")}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
