"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../wizard-context";
import {
  StepCard,
  StepHeader,
  StepNotice,
  OptionalBadge,
} from "../wizard-step";
import { ImageModal } from "@/components/ui/image-modal";
import { Monitor, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Step 5: 인쇄물 시안 선택 (선택)
 *
 * 필드:
 * - 명함시안 (선택)
 * - 계약서시안 (선택)
 * - 대봉투시안 (선택)
 *
 * UX:
 * - 실제 등록된 시안 이미지로 미리보기 제공
 * - 카드 클릭 = 선택 / 돋보기 클릭 = 확대
 * - 시안 검수는 PC/노트북 권장
 */

interface StepNamecardProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

interface PrintStyle {
  id: string;
  name: string;
  description: string;
  thumbnails: string[]; // 카드에 노출되는 썸네일 (1~2장)
  fullImages: string[]; // 확대 모달에 노출되는 전체 이미지 (1~N장)
  /**
   * 카드 썸네일의 가로:세로 비율 (CSS aspect-ratio).
   * - 명함 합본(앞+뒤 좌우): "37/10"
   * - A4 단일 페이지: "1/1.414"
   */
  thumbAspect: string;
  /** 모달에서 이미지를 좌우 나란히 보여줄지 여부 (자문계약서 표지+내지) */
  compareInModal?: boolean;
  /** 카드 썸네일에 부위 라벨을 보여줄지 (표지/내지) */
  showPartLabel?: boolean;
}

/**
 * 명함 시안 (실제 등록 — public/namecard/namecard_X.jpg)
 * 한 파일에 [앞면(정보 多) | 뒷면(로고 中心)] 좌우 합본 구조.
 * 카드 썸네일도 합본 그대로 표시(원본 비율 유지), 모달도 단일 이미지.
 */
const NAMECARD_THUMB_ASPECT = "37/10"; // 측정된 합본 비율 (1149×310 기준)
const NAMECARD_STYLES: PrintStyle[] = [
  {
    id: "style1",
    name: "스타일 1",
    description: "클래식 디자인",
    thumbnails: ["/namecard/namecard_1.jpg"],
    fullImages: ["/namecard/namecard_1.jpg"],
    thumbAspect: NAMECARD_THUMB_ASPECT,
  },
  {
    id: "style2",
    name: "스타일 2",
    description: "모던 디자인",
    thumbnails: ["/namecard/namecard_2.jpg"],
    fullImages: ["/namecard/namecard_2.jpg"],
    thumbAspect: NAMECARD_THUMB_ASPECT,
  },
  {
    id: "style3",
    name: "스타일 3",
    description: "크리에이티브 디자인",
    thumbnails: ["/namecard/namecard_3.jpg"],
    fullImages: ["/namecard/namecard_3.jpg"],
    thumbAspect: NAMECARD_THUMB_ASPECT,
  },
  {
    id: "style4",
    name: "스타일 4",
    description: "미니멀 디자인",
    thumbnails: ["/namecard/namecard_4.jpg"],
    fullImages: ["/namecard/namecard_4.jpg"],
    thumbAspect: NAMECARD_THUMB_ASPECT,
  },
  {
    id: "style5",
    name: "스타일 5",
    description: "2026 신규 디자인",
    thumbnails: ["/namecard/namecard_5.jpg"],
    fullImages: ["/namecard/namecard_5.jpg"],
    thumbAspect: NAMECARD_THUMB_ASPECT,
  },
  {
    id: "style6",
    name: "스타일 6",
    description: "2026 신규 디자인",
    thumbnails: ["/namecard/namecard_6.jpg"],
    fullImages: ["/namecard/namecard_6.jpg"],
    thumbAspect: NAMECARD_THUMB_ASPECT,
  },
];

/**
 * 자문계약서 시안 (표지+내지 별도 2장).
 * 카드 썸네일은 표지/내지를 위아래로 보여주고, 모달은 좌우 나란히(compare).
 */
const CONTRACT_THUMB_ASPECT = "1/1.414"; // A4 비율
const CONTRACT_STYLES: PrintStyle[] = [
  {
    id: "style1",
    name: "스타일 1",
    description: "기본 디자인 (표지+내지 세트)",
    thumbnails: [
      "/guides/print/contract_cover.jpg",
      "/guides/print/contract_inner.jpg",
    ],
    fullImages: [
      "/guides/print/contract_cover.jpg",
      "/guides/print/contract_inner.jpg",
    ],
    thumbAspect: CONTRACT_THUMB_ASPECT,
    compareInModal: true,
    showPartLabel: true,
  },
  {
    id: "style2",
    name: "스타일 2",
    description: "2026 신규 디자인 (표지+내지 세트)",
    thumbnails: [
      "/guides/print/contract_cover_2.jpg",
      "/guides/print/contract_inner_2.jpg",
    ],
    fullImages: [
      "/guides/print/contract_cover_2.jpg",
      "/guides/print/contract_inner_2.jpg",
    ],
    thumbAspect: CONTRACT_THUMB_ASPECT,
    compareInModal: true,
    showPartLabel: true,
  },
];

interface PrintStyleGridProps {
  title: string;
  emoji: string;
  styles: PrintStyle[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onPreview: (
    images: string[],
    captions: string[],
    title: string,
    options?: { mode?: "carousel" | "compare"; startIndex?: number },
  ) => void;
  accentColor: "gold" | "indigo";
  hint?: string;
  /** PC에서 한 줄에 몇 개 카드를 보여줄지 (기본 2) */
  desktopCols?: 1 | 2 | 3;
}

const ACCENT_CLASS = {
  gold: {
    border: "border-gold-500",
    bg: "bg-gold-50",
    ring: "focus:ring-gold-500",
    hover: "hover:border-gold-300",
    badge: "bg-gold-500",
  },
  indigo: {
    border: "border-indigo-500",
    bg: "bg-indigo-50",
    ring: "focus:ring-indigo-500",
    hover: "hover:border-indigo-300",
    badge: "bg-indigo-500",
  },
} as const;

function PrintStyleGrid({
  title,
  emoji,
  styles,
  selectedId,
  onSelect,
  onPreview,
  accentColor,
  hint,
  desktopCols = 2,
}: PrintStyleGridProps) {
  const accent = ACCENT_CLASS[accentColor];
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  }[desktopCols];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <span>{emoji}</span> {title}
        <span className="text-xs font-normal text-gray-500">
          ({styles.length}종 중 1개 선택)
        </span>
      </h3>

      <div className={cn("grid gap-4", colsClass)}>
        {styles.map((style) => {
          const isSelected = selectedId === style.id;
          const isMulti = style.thumbnails.length > 1;
          const buildCaptions = () =>
            style.fullImages.map((_, idx) => {
              if (!isMulti) return `${title} · ${style.name} (앞면 + 뒷면)`;
              const partLabel = idx === 0 ? "표지" : "내지";
              return `${title} · ${style.name} - ${partLabel}`;
            });

          return (
            <div
              key={style.id}
              className={cn(
                "relative rounded-xl border-2 p-3 transition-all bg-white",
                accent.hover,
                isSelected
                  ? cn(accent.border, accent.bg, "shadow-md")
                  : "border-gray-200",
              )}
            >
              {/* 미리보기 영역 (클릭 = 확대) */}
              <button
                type="button"
                onClick={() =>
                  onPreview(
                    style.fullImages,
                    buildCaptions(),
                    `${title} · ${style.name}`,
                    {
                      mode: style.compareInModal ? "compare" : "carousel",
                    },
                  )
                }
                className="block w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-lg"
                aria-label={`${title} ${style.name} 크게 보기`}
              >
                <div className={isMulti ? "space-y-2" : ""}>
                  {style.thumbnails.map((src, idx) => {
                    const partLabel = style.showPartLabel
                      ? idx === 0
                        ? "표지"
                        : "내지"
                      : null;
                    return (
                      <div
                        key={src}
                        className="relative bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm"
                        style={{ aspectRatio: style.thumbAspect }}
                      >
                        <img
                          src={src}
                          alt={`${title} ${style.name}${
                            partLabel ? ` ${partLabel}` : ""
                          }`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        {/* 부위 라벨 (표지/내지) */}
                        {partLabel && (
                          <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {partLabel}
                          </div>
                        )}
                        {/* 명함의 앞/뒤 라벨 (합본일 때) */}
                        {!isMulti && style.fullImages.length === 1 && (
                          <>
                            <div className="absolute top-1.5 left-[3%] bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              앞면
                            </div>
                            <div className="absolute top-1.5 right-[3%] bg-black/40 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              뒷면
                            </div>
                          </>
                        )}
                        {/* 확대 아이콘 오버레이 */}
                        <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white rounded-full p-1.5 opacity-90">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </button>

              {/* 스타일 정보 + 선택 버튼 */}
              <button
                type="button"
                onClick={() => onSelect(style.id)}
                className={cn(
                  "mt-3 w-full rounded-lg py-2 text-sm font-semibold transition-all border",
                  "focus:outline-none focus:ring-2 focus:ring-offset-1",
                  accent.ring,
                  isSelected
                    ? cn(accent.badge, "border-transparent text-white")
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                )}
              >
                {isSelected ? "✓ 선택됨" : "이 스타일 선택"}
              </button>

              <p className="mt-1.5 text-xs text-gray-500 text-center line-clamp-2">
                {style.name} · {style.description}
              </p>

              {/* 좌상단 선택 마크 */}
              {isSelected && (
                <div
                  className={cn(
                    "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow",
                    accent.badge,
                  )}
                >
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hint && <p className="text-xs text-gray-400 text-center">{hint}</p>}
    </div>
  );
}

export function StepNamecard({
  formData,
  onChange,
  errors = {},
}: StepNamecardProps) {
  const { setCanProceed, markStepComplete, currentStep } = useWizard();
  const [previewState, setPreviewState] = useState<{
    images: string[];
    captions: string[];
    title: string;
    startIndex: number;
    mode: "carousel" | "compare";
  } | null>(null);

  // 선택 항목이므로 항상 진행 가능
  useEffect(() => {
    setCanProceed(true);

    if (formData.명함시안 || formData.계약서시안) {
      markStepComplete(currentStep.id);
    }
  }, [
    formData.명함시안,
    formData.계약서시안,
    setCanProceed,
    markStepComplete,
    currentStep.id,
  ]);

  const handlePreview = (
    images: string[],
    captions: string[],
    title: string,
    options?: { mode?: "carousel" | "compare"; startIndex?: number },
  ) => {
    setPreviewState({
      images,
      captions,
      title,
      startIndex: options?.startIndex ?? 0,
      mode: options?.mode ?? "carousel",
    });
  };

  return (
    <>
      <StepCard>
        <StepHeader
          title="인쇄물 디자인 선택"
          description="명함과 자문계약서 디자인을 선택해주세요"
          icon="🖨️"
          badge={<OptionalBadge />}
        />

        {/* PC 권장 안내 (최상단, 강조) */}
        <div className="mb-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 sm:p-4">
          <div className="flex items-start gap-2.5">
            <Monitor className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-bold text-amber-900">
                시안 선택 및 검수는 PC/노트북에서 권장드려요
              </p>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                모바일에서는 시안 디테일이 작게 보일 수 있어요. 큰 화면에서
                꼼꼼히 확인 후 선택해주세요. (이미지를 누르면 확대해서 볼 수
                있어요)
              </p>
            </div>
          </div>
        </div>

        <StepNotice type="info">
          이 단계는 선택사항입니다. 나중에 선택해도 됩니다.
        </StepNotice>

        <div className="space-y-8">
          {/* 명함 — 합본 이미지(앞+뒤)라 카드 1장씩, 그리드는 2열 */}
          <PrintStyleGrid
            title="명함 스타일"
            emoji="💳"
            styles={NAMECARD_STYLES}
            selectedId={formData.명함시안}
            onSelect={(id) => onChange("명함시안", id)}
            onPreview={handlePreview}
            accentColor="gold"
            hint="명함 한 장에 앞면(정보 多) + 뒷면(로고 中心)이 함께 인쇄됩니다. 이미지를 누르면 원본 크기로 크게 보실 수 있어요."
            desktopCols={2}
          />

          <div className="border-t border-gray-200" />

          {/* 자문계약서 — 표지+내지, 모달은 좌우 나란히 */}
          <PrintStyleGrid
            title="자문계약서 스타일"
            emoji="📄"
            styles={CONTRACT_STYLES}
            selectedId={formData.계약서시안}
            onSelect={(id) => onChange("계약서시안", id)}
            onPreview={handlePreview}
            accentColor="indigo"
            hint="표지와 내지 디자인이 세트로 적용됩니다. 클릭하면 표지·내지를 좌우 나란히 크게 확인하실 수 있어요."
            desktopCols={2}
          />
        </div>
      </StepCard>

      {/* 이미지 확대 모달 (시안 이름 표시) */}
      {previewState && (
        <ImageModal
          images={previewState.images}
          captions={previewState.captions}
          title={previewState.title}
          initialIndex={previewState.startIndex}
          mode={previewState.mode}
          onClose={() => setPreviewState(null)}
        />
      )}
    </>
  );
}
