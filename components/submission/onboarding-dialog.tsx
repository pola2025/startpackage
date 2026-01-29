"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, Camera, Palette, Clock } from "lucide-react";

const ONBOARDING_DISMISSED_KEY = "submission_onboarding_dismissed";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREPARATION_ITEMS = [
  {
    icon: FileText,
    title: "사업자등록증",
    description: "사업자등록증 사본 (PDF 또는 이미지)",
  },
  {
    icon: Camera,
    title: "프로필 사진",
    description: "인쇄물에 사용할 대표 사진",
  },
  {
    icon: Palette,
    title: "브랜드 정보",
    description: "브랜드명, 업종, 주소 등 기본 정보",
  },
  {
    icon: FileText,
    title: "마케팅 계정 (선택)",
    description: "인스타그램, 네이버 광고 등 계정 정보",
  },
];

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-24px)] sm:max-w-md mx-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 justify-center sm:justify-start">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            자료제출 시작하기
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-600 mt-2">
            <span className="text-blue-600 font-semibold">약 10분</span>이면 모든 자료 제출을 완료할 수 있어요!
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 sm:py-4">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
            미리 준비하면 좋아요
          </h4>
          <div className="space-y-1.5 sm:space-y-2">
            {PREPARATION_ITEMS.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 sm:p-2.5 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <item.icon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">{item.description}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <label
            htmlFor="dontShowAgain"
            className="text-xs sm:text-sm text-gray-600 cursor-pointer"
          >
            다시 보지 않기
          </label>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            나중에
          </Button>
          <Button
            onClick={handleStart}
            className="w-full sm:w-auto order-1 sm:order-2 bg-blue-600 hover:bg-blue-700"
          >
            시작하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 온보딩 다이얼로그를 표시해야 하는지 확인
 */
export function shouldShowOnboarding(submissionData: { 브랜드명: string | null } | null): boolean {
  // 이미 "다시 보지 않기"를 선택한 경우
  if (typeof window !== "undefined") {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (dismissed === "true") {
      return false;
    }
  }

  // submission 데이터가 없거나 브랜드명이 없으면 첫 방문으로 간주
  if (!submissionData || !submissionData.브랜드명) {
    return true;
  }

  return false;
}
