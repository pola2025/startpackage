"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

// ============================================
// Step 정의
// ============================================

export interface WizardStepConfig {
  id: string;
  title: string;
  shortTitle: string; // 360px에서 사용할 짧은 제목
  description: string;
  estimatedTime: string; // "약 2분"
  isRequired: boolean;
  fields: string[]; // 해당 step에서 입력받는 필드들
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: "brand",
    title: "브랜드 기본 정보",
    shortTitle: "기본정보",
    description: "브랜드명, 업종, 주소를 입력해주세요",
    estimatedTime: "약 2분",
    isRequired: true,
    fields: ["브랜드명", "업종", "주소"],
  },
  {
    id: "contact",
    title: "연락처와 계좌 정보",
    shortTitle: "연락처",
    description: "연락처와 계좌 정보를 입력해주세요",
    estimatedTime: "약 1분",
    isRequired: false,
    fields: ["대표번호", "이메일", "은행명", "계좌번호", "인쇄물받을주소"],
  },
  {
    id: "documents",
    title: "사업자등록증 업로드",
    shortTitle: "서류",
    description: "사업자등록증을 업로드해주세요",
    estimatedTime: "약 1분",
    isRequired: true,
    fields: ["사업자등록증URL"],
  },
  {
    id: "logo",
    title: "로고 제작 정보",
    shortTitle: "로고",
    description: "원하시는 로고 스타일을 선택해주세요",
    estimatedTime: "약 3분",
    isRequired: true,
    fields: ["로고선호스타일", "로고선호색상", "로고선호폰트", "로고제작요청사항", "명함색상"],
  },
  {
    id: "namecard",
    title: "명함 스타일 선택",
    shortTitle: "명함",
    description: "명함 디자인을 선택해주세요",
    estimatedTime: "약 1분",
    isRequired: false,
    fields: ["명함시안"],
  },
  {
    id: "profile",
    title: "프로필 사진 업로드",
    shortTitle: "프로필",
    description: "대표님 프로필 사진을 올려주세요",
    estimatedTime: "약 1분",
    isRequired: false,
    fields: ["프로필사진URL"],
  },
  {
    id: "marketing",
    title: "마케팅 계정 정보",
    shortTitle: "마케팅",
    description: "마케팅 대행에 필요한 계정 정보를 입력해주세요",
    estimatedTime: "약 2분",
    isRequired: false,
    fields: ["InstagramID", "InstagramPW", "네이버검색광고ID", "네이버검색광고PW", "네이버클라우드ID", "네이버클라우드PW", "GmailID", "GmailPW"],
  },
];

// ============================================
// Context 타입
// ============================================

interface WizardContextType {
  // 현재 상태
  currentStepIndex: number;
  currentStep: WizardStepConfig;
  totalSteps: number;

  // 네비게이션
  goToStep: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  skipStep: () => void;

  // 진행 상태
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  markStepComplete: (stepId: string) => void;
  markStepSkipped: (stepId: string) => void;

  // 진행률
  progressPercent: number;

  // 검증
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;

  // 모드 전환
  isWizardMode: boolean;
  setWizardMode: (enabled: boolean) => void;

  // 자동 저장 상태
  lastSavedAt: Date | null;
  setLastSavedAt: (date: Date) => void;

  // 방향 (애니메이션용)
  direction: "forward" | "backward";
}

const WizardContext = createContext<WizardContextType | null>(null);

// ============================================
// Provider
// ============================================

interface WizardProviderProps {
  children: React.ReactNode;
  initialStepIndex?: number;
  submission?: any; // 기존 제출 데이터
}

export function WizardProvider({
  children,
  initialStepIndex = 0,
  submission
}: WizardProviderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [canProceed, setCanProceed] = useState(true);
  const [isWizardMode, setWizardMode] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const totalSteps = WIZARD_STEPS.length;

  // 기존 제출 데이터로 완료된 스텝 계산
  useEffect(() => {
    if (submission) {
      const completed = new Set<string>();

      WIZARD_STEPS.forEach(step => {
        const hasAllRequired = step.fields.some(field => {
          const value = submission[field];
          return value && value !== "";
        });

        if (hasAllRequired) {
          completed.add(step.id);
        }
      });

      setCompletedSteps(completed);
    }
  }, [submission]);

  // 진행률 계산 (완료 + 스킵된 스텝 기준)
  const progressPercent = useMemo(() => {
    const doneCount = completedSteps.size + skippedSteps.size;
    return Math.round((doneCount / totalSteps) * 100);
  }, [completedSteps, skippedSteps, totalSteps]);

  // 네비게이션 함수들
  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < totalSteps) {
      setDirection(index > currentStepIndex ? "forward" : "backward");
      setCurrentStepIndex(index);
    }
  }, [currentStepIndex, totalSteps]);

  const goNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setDirection("forward");
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setDirection("backward");
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipStep = useCallback(() => {
    setSkippedSteps(prev => new Set(prev).add(currentStep.id));
    goNext();
  }, [currentStep.id, goNext]);

  const markStepComplete = useCallback((stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
    // 스킵에서 제거 (완료했으므로)
    setSkippedSteps(prev => {
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }, []);

  const markStepSkipped = useCallback((stepId: string) => {
    setSkippedSteps(prev => new Set(prev).add(stepId));
  }, []);

  const value: WizardContextType = {
    currentStepIndex,
    currentStep,
    totalSteps,
    goToStep,
    goNext,
    goPrev,
    skipStep,
    completedSteps,
    skippedSteps,
    markStepComplete,
    markStepSkipped,
    progressPercent,
    canProceed,
    setCanProceed,
    isWizardMode,
    setWizardMode,
    lastSavedAt,
    setLastSavedAt,
    direction,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within WizardProvider");
  }
  return context;
}
