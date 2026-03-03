"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, PartyPopper } from "lucide-react";

interface CelebrationProps {
  /** 축하 표시 여부 */
  show: boolean;
  /** 축하 메시지 */
  message?: string;
  /** 지속 시간 (ms) */
  duration?: number;
  /** 종료 콜백 */
  onComplete?: () => void;
  /** 애니메이션 타입 */
  type?: "confetti" | "check" | "both";
}

/**
 * 섹션 완료 시 축하 애니메이션 컴포넌트
 *
 * @example
 * ```tsx
 * <Celebration
 *   show={sectionCompleted}
 *   message="브랜드 정보 입력 완료!"
 *   onComplete={() => setSectionCompleted(false)}
 * />
 * ```
 */
export function Celebration({
  show,
  message = "잘하셨어요!",
  duration = 3000,
  onComplete,
  type = "both",
}: CelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // onComplete를 ref로 저장하여 의존성 배열에서 제외 (무한 루프 방지)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onCompleteRef.current?.();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Confetti 파티클 */}
      {(type === "confetti" || type === "both") && (
        <ConfettiParticles isAnimating={isAnimating} />
      )}

      {/* 중앙 메시지 카드 */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm mx-4 text-center transform transition-all duration-500 ${
          isAnimating ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* 아이콘 */}
        <div className="mb-4 flex justify-center">
          {(type === "check" || type === "both") && (
            <div className="relative">
              <CheckCircle2
                className={`w-16 h-16 text-green-500 transition-transform duration-700 ${
                  isAnimating ? "scale-100 rotate-0" : "scale-0 -rotate-180"
                }`}
              />
              <div
                className={`absolute inset-0 bg-green-400/30 rounded-full transition-transform duration-500 ${
                  isAnimating ? "scale-150 opacity-0" : "scale-100 opacity-100"
                }`}
              />
            </div>
          )}
        </div>

        {/* 파티 아이콘 */}
        {(type === "confetti" || type === "both") && (
          <div className="absolute -top-3 -right-3">
            <PartyPopper
              className={`w-8 h-8 text-yellow-500 transition-all duration-500 ${
                isAnimating ? "rotate-12 scale-100" : "rotate-0 scale-0"
              }`}
            />
          </div>
        )}

        {/* 메시지 */}
        <h3
          className={`text-xl sm:text-2xl font-bold text-gray-900 mb-2 transition-all duration-500 delay-200 ${
            isAnimating
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          {message}
        </h3>

        <p
          className={`text-sm text-gray-500 transition-all duration-500 delay-300 ${
            isAnimating ? "opacity-100" : "opacity-0"
          }`}
        >
          계속해서 다음 단계를 진행해주세요
        </p>
      </div>
    </div>
  );
}

/**
 * Confetti 파티클 컴포넌트
 */
function ConfettiParticles({ isAnimating }: { isAnimating: boolean }) {
  const colors = [
    "bg-yellow-400",
    "bg-pink-400",
    "bg-gold-400",
    "bg-green-400",
    "bg-purple-400",
    "bg-orange-400",
  ];

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute ${particle.color} rounded-sm`}
          style={{
            left: `${particle.left}%`,
            top: "-20px",
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            transform: `rotate(${particle.rotation}deg)`,
            animation: isAnimating
              ? `confetti-fall ${particle.duration}s ease-out ${particle.delay}s forwards`
              : "none",
            opacity: isAnimating ? 1 : 0,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 섹션 완료 상태를 감지하고 축하 애니메이션을 트리거하는 훅
 */
export function useCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  // useRef를 사용하여 무한 루프 방지
  const previousCompletedSectionsRef = useRef<Set<string>>(new Set());

  /**
   * 섹션 완료 상태 업데이트 및 새로 완료된 섹션 감지
   */
  const checkSectionCompletion = useCallback(
    (sections: Array<{ name: string; label: string; isComplete: boolean }>) => {
      const currentCompletedSections = new Set(
        sections.filter((s) => s.isComplete).map((s) => s.name),
      );

      // 새로 완료된 섹션 찾기
      for (const section of sections) {
        if (
          section.isComplete &&
          !previousCompletedSectionsRef.current.has(section.name)
        ) {
          // 새로 완료된 섹션!
          setCelebrationMessage(`${section.label} 입력 완료!`);
          setShowCelebration(true);
          break;
        }
      }

      previousCompletedSectionsRef.current = currentCompletedSections;
    },
    [], // 의존성 배열에서 previousCompletedSections 제거
  );

  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  return {
    showCelebration,
    celebrationMessage,
    checkSectionCompletion,
    closeCelebration,
  };
}

/**
 * 인라인 축하 효과 (작은 성공 표시)
 */
export function InlineCelebration({
  show,
  className = "",
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-green-600 text-sm font-medium animate-bounce-once ${className}`}
    >
      <CheckCircle2 className="w-4 h-4" />
      완료
    </span>
  );
}
