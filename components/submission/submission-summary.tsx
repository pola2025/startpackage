"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { ProgressSection } from "@/lib/submission-progress";

interface SubmissionSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ProgressSection[];
  overallPercentage: number;
  onNavigateToSection: (href: string) => void;
  onConfirmSubmit?: () => void;
}

export function SubmissionSummary({
  open,
  onOpenChange,
  sections,
  overallPercentage,
  onNavigateToSection,
  onConfirmSubmit,
}: SubmissionSummaryProps) {
  const completedSections = sections.filter((s) => s.isComplete);
  const incompleteSections = sections.filter((s) => !s.isComplete);
  const isAllComplete = overallPercentage === 100;

  const handleSectionClick = (href: string | undefined) => {
    if (href) {
      onOpenChange(false);
      onNavigateToSection(href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-24px)] sm:max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            자료제출 현황
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-600 mt-2">
            {isAllComplete ? (
              <span className="text-green-600 font-semibold">
                모든 필수 정보가 입력되었습니다!
              </span>
            ) : (
              <>
                <span className="text-gold-600 font-semibold">
                  {overallPercentage}%
                </span>{" "}
                완료 ({completedSections.length}/{sections.length} 섹션)
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 미완료 섹션 */}
          {incompleteSections.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                미완료 항목 ({incompleteSections.length}개)
              </h4>
              <div className="space-y-2">
                {incompleteSections.map((section) => (
                  <button
                    key={section.name}
                    onClick={() => handleSectionClick(section.href)}
                    className="w-full flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {section.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {section.completed}/{section.total} 완료
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600 font-medium">
                        수정하기
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 완료 섹션 */}
          {completedSections.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                완료 항목 ({completedSections.length}개)
              </h4>
              <div className="space-y-2">
                {completedSections.map((section) => (
                  <button
                    key={section.name}
                    onClick={() => handleSectionClick(section.href)}
                    className="w-full flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {section.label}
                        </p>
                        <p className="text-xs text-gray-500">완료</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">확인하기</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            계속 작성하기
          </Button>
          {isAllComplete && onConfirmSubmit && (
            <Button
              onClick={onConfirmSubmit}
              className="w-full sm:w-auto order-1 sm:order-2 bg-green-600 hover:bg-green-700"
            >
              제출 완료하기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
