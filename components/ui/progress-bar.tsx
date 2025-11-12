import { CheckCircle2, Circle } from "lucide-react";

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
}

export function ProgressBar({ sections, overallPercentage, onTabChange }: ProgressBarProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
      {/* 전체 진행률 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">
            전체 진행률
          </h3>
          <span className="text-sm sm:text-lg font-bold text-blue-600">
            {overallPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* 섹션별 진행률 */}
      <div className="space-y-3">
        {sections.map((section) => {
          const handleClick = () => {
            if (section.href && onTabChange) {
              // 탭 변경
              onTabChange(section.href);
            }
          };

          return (
            <div
              key={section.name}
              onClick={handleClick}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                section.isComplete
                  ? "bg-green-50 border-green-200"
                  : section.percentage > 0
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-gray-50 border-gray-200"
              } ${section.href ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}`}
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

      {/* 안내 메시지 */}
      {overallPercentage < 100 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-700">
            ⚠️ 미작성 섹션은 노란색으로 표시됩니다. 모든 필수 정보를 입력해주세요.
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
