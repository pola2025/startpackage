import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { NextActionHint } from "@/lib/submission-progress";

export interface ProgressBarProps {
  sections: Array<{
    name: string;
    label: string;
    completed: number;
    total: number;
    percentage: number;
    isComplete: boolean;
    href?: string; // 클릭 시 이동할 탭 값
  }>;
  overallPercentage: number;
  onTabChange?: (tab: string) => void; // 탭 변경 콜백
  nextAction?: NextActionHint; // 다음 작업 힌트
}

export function ProgressBar({
  sections,
  overallPercentage,
  onTabChange,
  nextAction,
}: ProgressBarProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
      {/* 전체 진행률 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">
            전체 진행률
          </h3>
          <span className="text-sm sm:text-lg font-bold text-gold-600">
            {overallPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-gold-500 to-gold-600 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* 섹션별 진행률 */}
      <div className="space-y-3">
        {sections.map((section) => {
          console.log("Section data:", section.name, section.href);

          const handleClick = () => {
            if (section.href) {
              // href 형식: "tab#elementId"
              const [tab, elementId] = section.href.split("#");

              console.log("Progress bar clicked:", { tab, elementId });

              // URL 변경 (쿼리 파라미터 + 해시)
              const url = elementId
                ? `/dashboard/submission?tab=${tab}#${elementId}`
                : `/dashboard/submission?tab=${tab}`;

              window.location.href = url;
            }
          };

          return (
            <div
              key={section.name}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔴 Div clicked!", section.name, section.href);
                handleClick();
              }}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                section.isComplete
                  ? "bg-green-50 border-green-200"
                  : section.percentage > 0
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-gray-50 border-gray-200"
              } ${section.href ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}`}
              style={{ pointerEvents: "auto" }}
            >
              <div className="flex items-center gap-2">
                {section.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                )}
                <span className="text-xs sm:text-sm font-medium text-gray-900">
                  {section.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">
                  {section.completed}/{section.total}
                </span>
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    section.isComplete
                      ? "text-green-600"
                      : section.percentage > 0
                        ? "text-yellow-600"
                        : "text-gray-500"
                  }`}
                >
                  {section.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 다음 작업 힌트 메시지 */}
      {nextAction && overallPercentage < 100 && (
        <div
          onClick={() => {
            if (nextAction.href) {
              const [tab, elementId] = nextAction.href.split("#");
              const url = elementId
                ? `/dashboard/submission?tab=${tab}#${elementId}`
                : `/dashboard/submission?tab=${tab}`;
              window.location.href = url;
            }
          }}
          className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-medium text-xs sm:text-sm">
                다음 단계:
              </span>
              <span className="text-amber-800 text-xs sm:text-sm">
                {nextAction.message}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      {overallPercentage < 100 && !nextAction && (
        <div className="mt-4 p-3 bg-gold-50 border border-gold-200 rounded-lg">
          <p className="text-xs sm:text-sm text-gold-700">
            미작성 섹션은 노란색으로 표시됩니다. 모든 필수 정보를 입력해주세요.
          </p>
        </div>
      )}

      {overallPercentage === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs sm:text-sm text-green-700 font-medium">
            ✅ 모든 필수 정보가 입력되었습니다!
          </p>
        </div>
      )}
    </div>
  );
}
