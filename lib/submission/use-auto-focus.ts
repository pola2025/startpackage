"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * 필드 ID와 탭 매핑
 */
const TAB_FIELDS: Record<string, string[]> = {
  basic: ["브랜드명", "업종", "주소", "상세주소"],
  logo: ["logoStyle", "로고선호색상", "로고제작요청사항"],
  print: ["사업자등록증", "프로필사진", "명함시안"],
  marketing: [
    "네이버검색광고ID",
    "네이버검색광고PW",
    "InstagramID",
    "InstagramPW",
  ],
};

/**
 * 필드 완료 여부 체크를 위한 submission 데이터 키 매핑
 */
const FIELD_TO_SUBMISSION_KEY: Record<string, string> = {
  브랜드명: "브랜드명",
  업종: "업종",
  주소: "주소",
  상세주소: "상세주소",
  logoStyle: "로고선호스타일",
  로고선호색상: "로고선호색상",
  로고제작요청사항: "로고제작요청사항",
  사업자등록증: "사업자등록증URL",
  프로필사진: "프로필사진URL",
  명함시안: "명함시안",
  네이버검색광고ID: "네이버검색광고ID",
  네이버검색광고PW: "네이버검색광고PW",
  InstagramID: "InstagramID",
  InstagramPW: "InstagramPW",
};

interface UseAutoFocusOptions {
  /** 현재 활성 탭 */
  activeTab: string;
  /** 제출 데이터 객체 */
  submission: Record<string, unknown> | null;
  /** 자동 포커스 활성화 여부 */
  enabled?: boolean;
  /** 포커스 지연 시간 (ms) */
  delay?: number;
}

/**
 * 탭 변경 시 첫 미입력 필드로 자동 포커스하는 훅
 *
 * @example
 * ```tsx
 * useAutoFocus({
 *   activeTab: "basic",
 *   submission: submission,
 *   enabled: true,
 * });
 * ```
 */
export function useAutoFocus({
  activeTab,
  submission,
  enabled = true,
  delay = 500,
}: UseAutoFocusOptions) {
  const previousTab = useRef<string | null>(null);
  const hasAutoFocused = useRef<Set<string>>(new Set());

  /**
   * 필드 값이 비어있는지 확인
   */
  const isFieldEmpty = useCallback(
    (fieldId: string): boolean => {
      if (!submission) return true;
      const submissionKey = FIELD_TO_SUBMISSION_KEY[fieldId];
      if (!submissionKey) return true;
      const value = submission[submissionKey];
      return (
        value === null || value === undefined || String(value).trim() === ""
      );
    },
    [submission],
  );

  /**
   * 탭 내 첫 번째 미입력 필드 찾기
   */
  const findFirstEmptyField = useCallback(
    (tab: string): string | null => {
      const fields = TAB_FIELDS[tab];
      if (!fields) return null;

      for (const fieldId of fields) {
        if (isFieldEmpty(fieldId)) {
          return fieldId;
        }
      }
      return null;
    },
    [isFieldEmpty],
  );

  /**
   * 요소로 스크롤 및 포커스
   */
  const focusElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      // input, select, textarea 등으로 재시도
      const inputElement = document.querySelector(
        `input[name="${elementId}"], select[name="${elementId}"], textarea[name="${elementId}"]`,
      ) as HTMLElement;

      if (inputElement) {
        inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          inputElement.focus();
          // 입력 필드 하이라이트 효과
          inputElement.classList.add(
            "ring-2",
            "ring-gold-400",
            "ring-offset-2",
          );
          setTimeout(() => {
            inputElement.classList.remove(
              "ring-2",
              "ring-gold-400",
              "ring-offset-2",
            );
          }, 2000);
        }, 300);
      }
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
      ) {
        element.focus();
        // 입력 필드 하이라이트 효과
        element.classList.add("ring-2", "ring-gold-400", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-gold-400", "ring-offset-2");
        }, 2000);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (!enabled || !submission) return;

    // 탭이 변경되었을 때만 동작
    if (previousTab.current === activeTab) return;
    previousTab.current = activeTab;

    // 이미 자동 포커스한 탭은 건너뛰기 (세션 내 1회만)
    if (hasAutoFocused.current.has(activeTab)) return;
    hasAutoFocused.current.add(activeTab);

    // 지연 후 포커스 실행 (탭 전환 애니메이션 완료 대기)
    const timeoutId = setTimeout(() => {
      const emptyFieldId = findFirstEmptyField(activeTab);
      if (emptyFieldId) {
        focusElement(emptyFieldId);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [
    activeTab,
    submission,
    enabled,
    delay,
    findFirstEmptyField,
    focusElement,
  ]);

  /**
   * 수동으로 특정 필드에 포커스
   */
  const focusField = useCallback(
    (fieldId: string) => {
      focusElement(fieldId);
    },
    [focusElement],
  );

  /**
   * 자동 포커스 기록 리셋 (다시 자동 포커스 활성화)
   */
  const resetAutoFocus = useCallback(() => {
    hasAutoFocused.current.clear();
  }, []);

  return { focusField, resetAutoFocus };
}

/**
 * 키보드 네비게이션을 위한 훅
 * Enter 키로 다음 필드로 이동
 */
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter 키 + input 필드 (textarea 제외)
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
        e.preventDefault();

        // 현재 폼 내의 모든 입력 필드 찾기
        const form = (e.target as HTMLInputElement).closest("form");
        if (!form) return;

        const inputs = Array.from(
          form.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >(
            'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
          ),
        );

        const currentIndex = inputs.indexOf(e.target as HTMLInputElement);
        const nextInput = inputs[currentIndex + 1];

        if (nextInput) {
          nextInput.focus();
          if (
            nextInput.tagName === "INPUT" ||
            nextInput.tagName === "TEXTAREA"
          ) {
            (nextInput as HTMLInputElement | HTMLTextAreaElement).select();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
