"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  FileCheck2,
  Monitor,
  ZoomIn,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadProfilePhoto,
  toUploadMessage,
} from "@/lib/submission/uploadProfile";
import { LogoColorSelector } from "@/components/submission/logo-style-selector";
import { ImageModal } from "@/components/ui/image-modal";
import { uploadDisplayImage } from "@/lib/submission/uploadDisplayImage";
import { isDisplayImageField } from "@/lib/constants/displayImageFields";
import {
  checkImageReadable,
  checkUploadFile,
  isImageFile,
} from "@/lib/submission/uploadValidation";
import {
  LOGO_DESCRIPTION_MIN_LENGTH,
  LOGO_DESCRIPTION_REQUIRED_MESSAGE,
  logoChecklist,
  missingItems,
} from "@/lib/submission/parts";
import {
  UPLOAD_TOO_LARGE_MESSAGE,
  VERCEL_UPLOAD_MAX_BYTES,
  shrinkImageForUpload,
  uploadErrorMessage,
} from "@/lib/upload/clientUpload";

/** 인쇄물 시안 옵션 (명함 6종 / 자문계약서 2종) */
export interface PrintStyleOption {
  id: string;
  name: string;
  description: string;
  thumbnails: string[];
  fullImages: string[];
  /** "37/10"(명함 합본) | "1/1.414"(A4) */
  thumbAspect: string;
  /** 모달에서 좌우 비교 모드로 보여줄지 (자문계약서 표지+내지) */
  compareInModal?: boolean;
  /** 카드 썸네일에 부위 라벨(표지/내지) 표시 */
  showPartLabel?: boolean;
}

export interface QuestStep {
  field: string;
  label: string;
  description?: string;
  type:
    | "text"
    | "textarea"
    | "tel"
    | "email"
    | "select"
    | "file"
    | "account-holder"
    | "shipping"
    | "color-picker"
    | "style-grid"
    | "password";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** file step accept (예: "image/*,application/pdf") */
  accept?: string;
  /** account-holder step에서 사용: 사업자대표명 (체크박스 라벨에 표시) */
  representativeName?: string;
  /** 검증 함수 — 반환값이 string이면 에러 메시지 */
  validate?: (value: string) => string | null;
  /** style-grid step용 시안 옵션 목록 */
  styleOptions?: PrintStyleOption[];
  /** style-grid step용 강조 컬러 (gold | indigo) */
  accentColor?: "gold" | "indigo";
  /** PC 권장 안내 박스 표시 여부 (시안 선택 step) */
  showPcRecommendation?: boolean;
  /** mkt@polarad.co.kr 메일 안내 박스 표시 여부 (파일 첨부 step) */
  showMailHint?: boolean;
  /** 최소 글자 수 (text·textarea). 글자 수를 함께 보여 준다 */
  minLength?: number;
  /** 비었거나 minLength 보다 짧을 때 앞에 붙일 안내 (비우면 제작할 수 없는 이유) */
  requiredMessage?: string;
  /** 입력 칸 위에 보이는 주의 안내 */
  notice?: string;
  /** 앞 단계 답에 따라 이 단계를 보일지 (없으면 항상 보임) */
  showIf?: (values: Record<string, string>) => boolean;
  /** 배송지 필수 정책 대상 기수에만 보이는 단계 (shipping step 과 같은 기준) */
  policyOnly?: boolean;
}

/** 마지막 단계 뒤 접수 확인 화면. check 는 빠진 항목 목록을 돌려준다 */
export interface QuestCompletion {
  title: string;
  message: string;
  check: (values: Record<string, string>) => { key: string; label: string; hint?: string }[];
}

/** shipping step 이 한 화면에서 함께 저장하는 필드들 (대표 field = 인쇄물받을주소) */
const SHIPPING_SUBFIELDS = [
  "인쇄물받을주소",
  "받는분이름",
  "수령연락처",
  "우편번호",
] as const;

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 명함 6종 (합본 앞+뒤, 37:10 비율) */
const NAMECARD_THUMB_ASPECT = "37/10";
const NAMECARD_STYLES: PrintStyleOption[] = [
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

/** 자문계약서 2종 (표지+내지, A4 비율, compare 모달) */
const CONTRACT_THUMB_ASPECT = "1/1.414";
const CONTRACT_STYLES: PrintStyleOption[] = [
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

interface StyleGridProps {
  styles: PrintStyleOption[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onPreview: (
    images: string[],
    captions: string[],
    title: string,
    mode: "carousel" | "compare",
  ) => void;
  accentColor: "gold" | "indigo";
  title: string;
}

function StyleGrid({
  styles,
  selectedId,
  onSelect,
  onPreview,
  accentColor,
  title,
}: StyleGridProps) {
  const accent = ACCENT_CLASS[accentColor];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              "relative rounded-xl border-2 p-2.5 transition-all bg-white",
              accent.hover,
              isSelected
                ? cn(accent.border, accent.bg, "shadow-md")
                : "border-gray-200",
            )}
          >
            <button
              type="button"
              onClick={() =>
                onPreview(
                  style.fullImages,
                  buildCaptions(),
                  `${title} · ${style.name}`,
                  style.compareInModal ? "compare" : "carousel",
                )
              }
              className="block w-full focus:outline-none rounded-lg"
              aria-label={`${style.name} 크게 보기`}
            >
              <div className={isMulti ? "space-y-1.5" : ""}>
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
                        alt={`${style.name}${partLabel ? ` ${partLabel}` : ""}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {partLabel && (
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          {partLabel}
                        </div>
                      )}
                      {!isMulti && style.fullImages.length === 1 && (
                        <>
                          <div className="absolute top-1 left-[3%] bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            앞면
                          </div>
                          <div className="absolute top-1 right-[3%] bg-black/40 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            뒷면
                          </div>
                        </>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-90">
                        <ZoomIn className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelect(style.id)}
              className={cn(
                "mt-2 w-full rounded-md py-1.5 text-xs font-semibold transition-all border",
                isSelected
                  ? cn(accent.badge, "border-transparent text-white")
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              {isSelected ? "✓ 선택됨" : "이 스타일 선택"}
            </button>
            <p className="mt-1 text-[11px] text-gray-500 text-center line-clamp-1">
              {style.description}
            </p>

            {isSelected && (
              <div
                className={cn(
                  "absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow",
                  accent.badge,
                )}
              >
                <span className="text-white text-[10px] font-bold">✓</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface QuestWizardDialogProps {
  open: boolean;
  onClose: () => void;
  /** 모달 제목 */
  title: string;
  /** 부제 */
  description?: string;
  /** 위자드 스텝 목록 */
  steps: QuestStep[];
  /** 현재 저장된 값 (있으면 prefill) */
  initialValues?: Record<string, string | null | undefined>;
  /** account-holder step에 표시할 사업자대표명 (선택) */
  representativeName?: string;
  /** 계정 이메일 — 이메일 step이 비어있을 때 기본값으로 채움 */
  accountEmail?: string;
  /** 모달 완료 시 호출 */
  onComplete?: () => void;
  /** 열 때 특정 항목(field)의 스텝으로 바로 진입 (없으면 첫 스텝) */
  initialField?: string | null;
  /** 마지막 단계 저장 뒤 보여 줄 접수 확인 화면 (없으면 바로 닫힘) */
  completion?: QuestCompletion;
}

export default function QuestWizardDialog({
  open,
  onClose,
  title,
  description,
  steps,
  initialValues,
  representativeName,
  accountEmail,
  onComplete,
  initialField,
  completion,
}: QuestWizardDialogProps) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  /** account-holder step의 "사업자대표와 동일" 체크박스 상태 */
  const [holderSame, setHolderSame] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** 마지막 단계 저장 뒤 접수 확인 화면 (missing 이 비어 있으면 접수 완료) */
  const [finished, setFinished] = useState<{
    missing: { key: string; label: string; hint?: string }[];
  } | null>(null);
  /** 고른 파일을 여는 중 (크기·열림 확인) */
  const [fileChecking, setFileChecking] = useState(false);
  /** 방금 저장한 값까지 반영한 값 (접수 판단용) */
  const latestValuesRef = useRef<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** 시안 확대 모달 상태 (style-grid step) */
  const [previewState, setPreviewState] = useState<{
    images: string[];
    captions: string[];
    title: string;
    mode: "carousel" | "compare";
  } | null>(null);

  // 모달 열릴 때 초기값 세팅
  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      const holderInit: Record<string, boolean> = {};
      steps.forEach((s) => {
        const v = initialValues?.[s.field];
        if (v) init[s.field] = String(v);
        // 이메일 미입력 시 가입 계정 이메일을 기본값으로 (수정 가능)
        else if (s.field === "이메일" && accountEmail) init[s.field] = accountEmail;
        if (s.type === "shipping") {
          SHIPPING_SUBFIELDS.forEach((sub) => {
            const subValue = initialValues?.[sub];
            if (subValue) init[sub] = String(subValue);
          });
        }
        if (s.type === "account-holder") {
          // 값이 비어있으면 "대표와 동일"(체크) 기본, 값이 있으면 "다름"(체크 해제)
          holderInit[s.field] = !v;
        }
      });
      setValues(init);
      setPendingFiles({});
      setHolderSame(holderInit);
      // 특정 항목으로 진입 요청이 있으면 해당 스텝부터, 없으면 첫 스텝
      const visibleAtStart = steps.filter((s) => !s.showIf || s.showIf(init));
      const startIdx = initialField
        ? visibleAtStart.findIndex((s) => s.field === initialField)
        : -1;
      setCurrentIdx(startIdx >= 0 ? startIdx : 0);
      setError(null);
      setFinished(null);
      latestValuesRef.current = init;
    }
  }, [open, steps, initialValues, initialField, accountEmail]);

  // 앞 단계 답(예: 로고 새로 제작/기존 로고)에 따라 보이는 단계만 진행한다
  const visibleSteps = steps.filter((s) => !s.showIf || s.showIf(values));
  if (visibleSteps.length === 0) return null;

  const safeIdx = Math.min(currentIdx, visibleSteps.length - 1);
  const step = visibleSteps[safeIdx];
  const currentValue = values[step.field] ?? "";
  const pendingFile = pendingFiles[step.field];
  const isLast = safeIdx === visibleSteps.length - 1;
  const isFirst = safeIdx === 0;
  const progress = ((safeIdx + 1) / visibleSteps.length) * 100;

  const setValue = (v: string) => {
    setValues((prev) => ({ ...prev, [step.field]: v }));
    setError(null);
  };

  /** shipping step 처럼 한 화면에서 여러 필드를 받는 경우 사용 */
  const setSubValue = (field: string, v: string) => {
    setValues((prev) => ({ ...prev, [field]: v }));
    setError(null);
  };

  const setFile = (file: File | null) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      if (file) next[step.field] = file;
      else delete next[step.field];
      return next;
    });
    setError(null);
  };

  const validate = (): boolean => {
    if (step.type === "file") {
      // 이미 업로드되어 있거나, 새 파일을 선택한 경우 통과
      const hasExisting = !!currentValue;
      const hasPending = !!pendingFile;
      if (step.required && !hasExisting && !hasPending) {
        setError("파일을 업로드해주세요.");
        return false;
      }
      return true;
    }
    if (step.type === "shipping") {
      if (!(values["인쇄물받을주소"] || "").trim()) {
        setError("인쇄물을 받으실 주소를 입력해주세요.");
        return false;
      }
      if (!(values["받는분이름"] || "").trim()) {
        setError("받는 분 이름을 입력해주세요.");
        return false;
      }
      const phone = (values["수령연락처"] || "").trim();
      if (!phone) {
        setError("수령 연락처를 입력해주세요.");
        return false;
      }
      if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(phone.replace(/\s/g, ""))) {
        setError("연락처를 010-0000-0000 형식으로 입력해주세요.");
        return false;
      }
      return true;
    }
    if (step.type === "account-holder") {
      // 체크박스가 체크되어 있으면 "대표와 동일" — 통과
      // 체크 해제 상태면 명의자명 입력값이 있어야 함
      if (!holderSame[step.field] && !currentValue.trim()) {
        setError("계좌명의자명을 입력해주세요.");
        return false;
      }
      return true;
    }
    if (step.type === "color-picker") {
      if (step.required && !HEX_PATTERN.test(currentValue)) {
        setError("색상을 선택해주세요.");
        return false;
      }
      return true;
    }
    if (step.type === "style-grid") {
      if (step.required && !currentValue) {
        setError("스타일을 선택해주세요.");
        return false;
      }
      return true;
    }
    const trimmedLength = currentValue.trim().length;
    const tooShort =
      !!step.minLength &&
      (step.required || trimmedLength > 0) &&
      trimmedLength < step.minLength;
    const lengthHint = `${step.minLength}자 이상 적어 주세요. (지금 ${trimmedLength}자)`;
    if (step.requiredMessage && step.required && (trimmedLength === 0 || tooShort)) {
      setError(step.minLength ? `${step.requiredMessage} ${lengthHint}` : step.requiredMessage);
      return false;
    }
    if (step.required && trimmedLength === 0) {
      setError("필수 입력 항목입니다.");
      return false;
    }
    if (tooShort) {
      setError(lengthHint);
      return false;
    }
    if (step.validate) {
      const msg = step.validate(currentValue);
      if (msg) {
        setError(msg);
        return false;
      }
    }
    return true;
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    // 프로필 사진: presigned 직접 업로드 (원본→슬랙, webp 200KB→R2, 최대 20MB)
    if (step.field === "프로필사진URL") {
      try {
        return await uploadProfilePhoto(file);
      } catch (err) {
        setError(toUploadMessage(err));
        return null;
      }
    }

    // 이미지는 R2 직접 업로드: 원본은 슬랙, 관리자 화면 표시용은 webp
    if (isDisplayImageField(step.field) && isImageFile(file)) {
      try {
        return await uploadDisplayImage(file, step.field);
      } catch (err) {
        setError(toUploadMessage(err));
        return null;
      }
    }

    // Vercel 을 거치므로 4MB 를 넘는 사진은 줄여서 보낸다
    const sendable = await shrinkImageForUpload(file);
    if (sendable.size > VERCEL_UPLOAD_MAX_BYTES) {
      setError(UPLOAD_TOO_LARGE_MESSAGE);
      return null;
    }
    const fd = new FormData();
    fd.append("file", sendable);
    fd.append("field", step.field);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setError(await uploadErrorMessage(res, "업로드에 실패했습니다."));
      return null;
    }
    const data = await res.json().catch(() => ({}));
    return data?.url ?? null;
  };

  const saveCurrent = async (): Promise<boolean> => {
    setError(null);
    setSaving(true);
    try {
      let valueToSave = currentValue;

      // shipping step: 배송 필드를 한 번에 저장
      if (step.type === "shipping") {
        const payload: Record<string, string> = {};
        SHIPPING_SUBFIELDS.forEach((sub) => {
          payload[sub] = (values[sub] || "").trim();
        });
        // 바뀐 값이 없으면 보내지 않는다. 발주 뒤에는 배송지가 잠겨서
        // 비어 있던 칸을 빈 문자열로 다시 보내도 409 로 막힌다
        const unchanged = SHIPPING_SUBFIELDS.every(
          (sub) => payload[sub] === String(initialValues?.[sub] ?? "").trim(),
        );
        if (unchanged) {
          latestValuesRef.current = { ...values };
          return true;
        }
        const shippingRes = await fetch("/api/submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!shippingRes.ok) {
          const data = await shippingRes.json().catch(() => ({}));
          setError(data?.error || "저장에 실패했습니다.");
          return false;
        }
        latestValuesRef.current = { ...values };
        return true;
      }

      // account-holder step: 체크 시 빈 문자열, 해제 시 입력값 저장
      if (step.type === "account-holder") {
        valueToSave = holderSame[step.field] ? "" : currentValue.trim();
      }

      // file step: 새 파일이 선택된 경우 업로드 → URL(또는 SLACK_ONLY 마커) 받기
      if (step.type === "file") {
        if (pendingFile) {
          const url = await uploadFile(pendingFile);
          if (!url) return false;
          valueToSave = url;
          setValues((prev) => ({ ...prev, [step.field]: url }));
          setPendingFiles((prev) => {
            const next = { ...prev };
            delete next[step.field];
            return next;
          });
          // SLACK_ONLY 마커도 submission에 저장 (필드 non-null 처리)
        } else {
          valueToSave = currentValue;
        }
      }

      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [step.field]: valueToSave }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "저장에 실패했습니다.");
        return false;
      }
      latestValuesRef.current = { ...values, [step.field]: valueToSave };
      return true;
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (fileChecking) return;
    if (!validate()) return;
    const ok = await saveCurrent();
    if (!ok) return;
    if (isLast) {
      if (completion) {
        // 저장이 끝난 값으로 접수 여부를 판단한다 (파일은 저장 뒤 주소로 바뀜)
        setFinished({ missing: completion.check(latestValuesRef.current) });
        return;
      }
      onComplete?.();
      onClose();
      router.refresh();
    } else {
      setCurrentIdx(safeIdx + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIdx(safeIdx - 1);
      setError(null);
    }
  };

  const closeAfterFinish = () => {
    onComplete?.();
    onClose();
    router.refresh();
  };

  const goToMissing = () => {
    const firstMissing = finished?.missing[0]?.key;
    const index = visibleSteps.findIndex((s) => s.field === firstMissing);
    setFinished(null);
    setCurrentIdx(index >= 0 ? index : 0);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (v) return;
          if (finished) closeAfterFinish();
          else onClose();
        }}
        // 시안 미리보기가 떠 있을 때는 modal=false로 풀어서
        // ImageModal 안의 X/배경 클릭 등 외부 pointer 이벤트가 통과되게 함
        modal={!previewState}
      >
        <DialogContent
          className="sm:max-w-[640px]"
          onPointerDownOutside={(e) => {
            // 시안 미리보기 모달이 떠 있을 땐 위자드를 닫지 않음
            if (previewState) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (previewState) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (previewState) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-gray-600">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          {finished ? (
            finished.missing.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-lg font-bold text-navy-900">{completion?.title}</p>
                <p className="text-sm leading-relaxed text-gray-600">{completion?.message}</p>
                <Button onClick={closeAfterFinish} className="w-full bg-gov-blue hover:bg-gov-blue-700">
                  대시보드로 돌아가기
                </Button>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <p className="text-base font-bold text-rose-700">아직 접수되지 않았어요</p>
                <p className="text-sm text-gray-600">아래 항목을 채워야 디자이너에게 전달됩니다.</p>
                <ul className="space-y-1 text-sm">
                  {finished.missing.map((m) => (
                    <li key={m.key} className="text-rose-700">
                      ✕ {m.label}
                      {m.hint ? ` (${m.hint})` : ""}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeAfterFinish} className="flex-1">
                    나중에 하기
                  </Button>
                  <Button onClick={goToMissing} className="flex-1 bg-gov-blue hover:bg-gov-blue-700">
                    빠진 항목 입력
                  </Button>
                </div>
              </div>
            )
          ) : (
          <>
          {/* 진행 표시 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gov-blue">
                {safeIdx + 1} / {visibleSteps.length} 단계
              </span>
              <span className="text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gov-blue rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <Label htmlFor={step.field} className="text-sm font-semibold">
              {step.label}
              {step.required && <span className="text-rose-500 ml-1">*</span>}
            </Label>
            {step.description && (
              <p className="text-xs text-gray-600 -mt-1.5">
                {step.description}
              </p>
            )}
            {step.notice && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-relaxed text-rose-800">
                {step.notice}
              </div>
            )}

            {/* 시안 선택 step: PC 권장 안내 */}
            {step.showPcRecommendation && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                <div className="flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-amber-900">
                      시안 검수는 PC/노트북에서 권장드려요
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      이미지를 누르면 크게 확인하실 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step.type === "color-picker" ? (
              <LogoColorSelector
                value={currentValue}
                onChange={(v) => setValue(v)}
              />
            ) : step.type === "style-grid" ? (
              <StyleGrid
                styles={step.styleOptions || []}
                selectedId={currentValue || undefined}
                onSelect={(id) => setValue(id)}
                onPreview={(images, captions, title, mode) =>
                  setPreviewState({ images, captions, title, mode })
                }
                accentColor={step.accentColor || "gold"}
                title={step.label}
              />
            ) : step.type === "textarea" ? (
              <div className="space-y-1">
                <Textarea
                  id={step.field}
                  value={currentValue}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={step.placeholder}
                  rows={step.minLength ? 5 : 4}
                  className="resize-none"
                  autoFocus
                />
                {step.minLength ? (
                  <p
                    className={cn(
                      "text-right text-[11px]",
                      currentValue.trim().length >= step.minLength ? "text-emerald-600" : "text-gray-500",
                    )}
                  >
                    {currentValue.trim().length} / {step.minLength}자 이상
                  </p>
                ) : null}
              </div>
            ) : step.type === "select" ? (
              <select
                id={step.field}
                value={currentValue}
                onChange={(e) => setValue(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm"
                autoFocus
              >
                <option value="">선택해주세요</option>
                {step.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : step.type === "shipping" ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    여기에 적어주신 주소로 명함과 인쇄물이 발송됩니다. 시안을
                    확정하면 주소를 바꿀 수 없으니 받으실 곳을 정확히
                    적어주세요.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="받는분이름"
                      className="text-xs font-medium text-gray-700"
                    >
                      받는 분
                    </label>
                    <Input
                      id="받는분이름"
                      type="text"
                      value={values["받는분이름"] ?? ""}
                      onChange={(e) => setSubValue("받는분이름", e.target.value)}
                      placeholder="예) 홍길동"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="수령연락처"
                      className="text-xs font-medium text-gray-700"
                    >
                      수령 연락처
                    </label>
                    <Input
                      id="수령연락처"
                      type="tel"
                      value={values["수령연락처"] ?? ""}
                      onChange={(e) => setSubValue("수령연락처", e.target.value)}
                      placeholder="예) 010-0000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="우편번호"
                    className="text-xs font-medium text-gray-700"
                  >
                    우편번호 <span className="text-gray-400">(선택)</span>
                  </label>
                  <Input
                    id="우편번호"
                    type="text"
                    value={values["우편번호"] ?? ""}
                    onChange={(e) => setSubValue("우편번호", e.target.value)}
                    placeholder="예) 06234"
                    className="max-w-[160px]"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="인쇄물받을주소"
                    className="text-xs font-medium text-gray-700"
                  >
                    받으실 주소
                  </label>
                  <Input
                    id="인쇄물받을주소"
                    type="text"
                    value={values["인쇄물받을주소"] ?? ""}
                    onChange={(e) =>
                      setSubValue("인쇄물받을주소", e.target.value)
                    }
                    placeholder="예) 서울특별시 강남구 테헤란로 000 12층 1201호"
                  />
                  {values["주소"] && !values["인쇄물받을주소"] && (
                    <button
                      type="button"
                      onClick={() =>
                        setSubValue("인쇄물받을주소", values["주소"] ?? "")
                      }
                      className="text-xs text-gov-blue underline underline-offset-2"
                    >
                      사업장 주소와 같습니다
                    </button>
                  )}
                </div>
              </div>
            ) : step.type === "account-holder" ? (
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={holderSame[step.field] ?? true}
                    onChange={(e) =>
                      setHolderSame((prev) => ({
                        ...prev,
                        [step.field]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 w-4 h-4 accent-gov-blue"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-gray-900">
                      계좌명의자가 사업자 대표와 동일합니다
                      {(step.representativeName || representativeName) && (
                        <span className="text-gray-500 font-normal ml-1">
                          ({step.representativeName || representativeName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      체크 해제하면 명의자명을 직접 입력할 수 있습니다.
                    </div>
                  </div>
                </label>
                {!(holderSame[step.field] ?? true) && (
                  <Input
                    id={step.field}
                    type="text"
                    value={currentValue}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="예) 홍길동"
                    autoFocus
                  />
                )}
              </div>
            ) : step.type === "file" ? (
              <div className="space-y-2">
                <input
                  key={step.field}
                  ref={fileInputRef}
                  type="file"
                  accept={step.accept}
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!f) return;
                    // 고른 즉시 검사: 형식·크기, 이미지가 열리는지와 최소 크기
                    const problem = checkUploadFile(f, {
                      allowPdf: (step.accept ?? "").includes("pdf"),
                    });
                    if (problem) {
                      setError(problem);
                      return;
                    }
                    setFileChecking(true);
                    const unreadable = await checkImageReadable(f);
                    setFileChecking(false);
                    if (unreadable) {
                      setError(unreadable);
                      return;
                    }
                    setFile(f);
                  }}
                />
                {pendingFile ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gov-blue-200 bg-gov-blue-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className="w-4 h-4 text-gov-blue flex-shrink-0" />
                      <span className="text-xs text-gov-blue truncate">
                        {pendingFile.name}
                      </span>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {(pendingFile.size / 1024).toFixed(0)}KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-gray-500 hover:text-rose-600"
                    >
                      제거
                    </button>
                  </div>
                ) : currentValue ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs text-emerald-700">
                        이미 업로드됨
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-gray-300 hover:border-gov-blue hover:bg-gov-blue-50/30 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {(step.accept ?? "").includes("pdf")
                        ? "파일 선택 (이미지 20MB · PDF 4MB까지)"
                        : "파일 선택 (이미지 20MB까지)"}
                    </span>
                  </button>
                )}

                {step.showMailHint && (
                  <div className="flex items-start gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2">
                    <Mail className="w-4 h-4 text-gov-blue flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      2장 넘게 보내주고 싶으시면{" "}
                      <a
                        href="mailto:mkt@polarad.co.kr"
                        className="font-semibold text-gov-blue underline underline-offset-2"
                      >
                        mkt@polarad.co.kr
                      </a>{" "}
                      로 메일 부탁드려요!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <Input
                id={step.field}
                type={step.type}
                value={currentValue}
                onChange={(e) => setValue(e.target.value)}
                placeholder={step.placeholder}
                autoFocus
              />
            )}

            {error && <p className="text-xs text-rose-600 mt-1">⚠ {error}</p>}
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirst || saving}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </Button>
            <div className="flex items-center gap-1.5">
              {visibleSteps.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    idx < safeIdx
                      ? "bg-gov-blue"
                      : idx === safeIdx
                        ? "bg-gov-blue-300"
                        : "bg-gray-200",
                  )}
                />
              ))}
            </div>
            <Button
              size="sm"
              onClick={handleNext}
              disabled={saving || fileChecking}
              className="gap-1 bg-gov-blue hover:bg-gov-blue-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLast ? (
                <>
                  완료 <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  다음 <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* 시안 확대 모달 — 위자드(Radix Dialog z-50) 위에 띄움 */}
      {previewState && (
        <ImageModal
          images={previewState.images}
          captions={previewState.captions}
          title={previewState.title}
          initialIndex={0}
          mode={previewState.mode}
          zIndex={100}
          onClose={() => setPreviewState(null)}
        />
      )}
    </>
  );
}

// === 미리 정의된 step 묶음 ===

/** 인쇄물 받을 곳 (2026-10-26 기본 정보로 다시 합침, 정책 대상 기수에만 보인다) */
const SHIPPING_STEPS: QuestStep[] = [
  {
    field: "인쇄물받을주소",
    label: "인쇄물 받을 곳",
    description:
      "명함·대봉투 등 인쇄물을 배송받으실 주소입니다. 시안을 확정하고 발주하기 전에 확인해 주세요.",
    type: "shipping",
    required: true,
  },
];

/** 자문계약서에 들어갈 입금 계좌 (기본 정보와 자문계약서 카드가 같이 쓴다) */
const ACCOUNT_STEPS: QuestStep[] = [
  {
    field: "은행명",
    label: "은행명",
    description: "자문계약서에 기재될 입금 계좌의 은행명을 입력해주세요.",
    type: "text",
    placeholder: "예) 국민은행",
    required: true,
  },
  {
    field: "계좌번호",
    label: "계좌번호",
    description: "자문계약서에 기재될 입금 계좌번호를 입력해주세요.",
    type: "text",
    placeholder: "예) 123-456-7890123",
    required: true,
  },
  {
    field: "계좌명의자명",
    label: "계좌 명의자",
    description:
      "사업자 대표와 동일하면 그대로 다음으로, 다르면 체크 해제 후 명의자명을 입력해주세요.",
    type: "account-holder",
    required: false,
  },
];

export const BASIC_INFO_STEPS: QuestStep[] = [
  {
    field: "사업자등록증URL",
    label: "사업자등록증",
    description:
      "사업자등록증 사본(이미지 또는 PDF)을 업로드해주세요. 제작에 필요한 사업자 정보 확인에 사용됩니다.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
  },
  {
    field: "프로필사진URL",
    label: "프로필 사진",
    description:
      "홈페이지·명함에 사용될 대표 프로필 사진을 업로드해주세요. (선명한 정면 사진 권장)",
    type: "file",
    accept: "image/*",
    required: true,
  },
  {
    field: "브랜드명",
    label: "브랜드명",
    description: "사업장에서 사용하는 정식 브랜드명을 입력해주세요.",
    type: "text",
    placeholder: "예) 폴라애드",
    required: true,
  },
  {
    field: "업종",
    label: "업종",
    description: "사업자등록증에 기재된 업종을 입력해주세요.",
    type: "text",
    placeholder: "예) 광고 대행업",
    required: true,
  },
  {
    field: "주소",
    label: "사업장 주소",
    description: "정식 사업장 주소를 입력해주세요.",
    type: "text",
    placeholder: "예) 서울특별시 강남구 …",
    required: true,
  },
  {
    field: "대표번호",
    label: "대표 연락처",
    description: "명함·홈페이지에 표기될 대표 연락처를 입력해주세요.",
    type: "tel",
    placeholder: "예) 02-0000-0000",
    required: true,
  },
  {
    field: "이메일",
    label: "이메일",
    description:
      "명함·홈페이지에 표기될 이메일 주소입니다. 가입하신 이메일이 기본으로 채워져 있으니 다르면 수정해주세요.",
    type: "email",
    placeholder: "예) contact@brand.co.kr",
    required: true,
    validate: (v) =>
      EMAIL_PATTERN.test(v.trim())
        ? null
        : "올바른 이메일 형식으로 입력해주세요.",
  },
  ...SHIPPING_STEPS,
  ...ACCOUNT_STEPS.map((step) => ({ ...step, policyOnly: true })),
];

export const NAMECARD_ENVELOPE_STEPS: QuestStep[] = [
  {
    field: "명함시안",
    label: "명함 스타일",
    description:
      "6종 중 1개를 선택해주세요. 카드 이미지를 누르면 크게 보실 수 있어요. 선택한 스타일이 명함과 대봉투에 동일하게 적용됩니다.",
    type: "style-grid",
    required: true,
    styleOptions: NAMECARD_STYLES,
    accentColor: "gold",
    showPcRecommendation: true,
  },
  {
    field: "명함색상",
    label: "명함 메인 색상",
    description: "아래 무지개 바를 눌러 명함에 사용할 메인 색상을 골라주세요.",
    type: "color-picker",
    required: true,
  },
];

export const CONTRACT_STEPS: QuestStep[] = [
  {
    field: "계약서시안",
    label: "자문계약서 스타일",
    description:
      "2종 중 1개를 선택해주세요. 카드를 누르면 표지·내지를 좌우 나란히 크게 확인하실 수 있어요.",
    type: "style-grid",
    required: true,
    styleOptions: CONTRACT_STYLES,
    accentColor: "indigo",
    showPcRecommendation: true,
  },
  ...ACCOUNT_STEPS,
];

const isNewLogo = (v: Record<string, string>) => v.로고제작방식 !== "기존로고";

export const LOGO_INFO_STEPS: QuestStep[] = [
  {
    field: "로고제작방식",
    label: "로고를 새로 만드시나요?",
    description:
      "이미 쓰고 있는 로고를 그대로 쓰실 거면 '기존 로고를 쓸게요'를 고르고 로고 파일만 올려 주세요.",
    type: "select",
    required: true,
    options: [
      { value: "신규제작", label: "새로 만들어 주세요" },
      { value: "기존로고", label: "기존 로고를 쓸게요" },
    ],
  },
  {
    field: "로고URL",
    label: "기존 로고 파일",
    description:
      "지금 쓰고 있는 로고 파일을 올려 주세요. AI·EPS 같은 원본 파일이 있으면 mkt@polarad.co.kr로도 보내 주세요.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
    showIf: (v) => v.로고제작방식 === "기존로고",
  },
  {
    field: "로고선호스타일",
    label: "로고 스타일",
    description: "원하는 로고 스타일을 선택해주세요.",
    type: "select",
    required: true,
    showIf: isNewLogo,
    options: [
      { value: "심볼형 (도형기반)", label: "심볼형 (도형 기반)" },
      { value: "워드마크형 (텍스트)", label: "워드마크형 (텍스트 중심)" },
    ],
  },
  {
    field: "로고선호폰트",
    label: "선호 폰트 느낌",
    description: "로고에 사용할 폰트 스타일을 선택해주세요.",
    type: "select",
    required: true,
    showIf: isNewLogo,
    options: [
      { value: "고딕체 (깔끔한)", label: "고딕체 (깔끔한)" },
      { value: "명조체 (전통적인)", label: "명조체 (전통적인)" },
      { value: "손글씨 (감성적인)", label: "손글씨 (감성적인)" },
      { value: "모던 (기하학적)", label: "모던 (기하학적)" },
    ],
  },
  {
    field: "로고선호색상",
    label: "선호 색상",
    description: "아래 무지개 바를 눌러 원하시는 색을 자유롭게 골라주세요.",
    type: "color-picker",
    required: true,
    showIf: isNewLogo,
  },
  {
    field: "로고제작요청사항",
    label: "원하는 로고 설명",
    description:
      "업종, 꼭 넣을 글자·심볼, 원하는 느낌과 피하고 싶은 느낌을 구체적으로 적어 주세요.",
    notice:
      "‘예쁘게’, ‘깔끔하게’, ‘고급스럽게’만으로는 로고를 제작할 수 없습니다. 디자이너가 방향을 잡을 수 있게 구체적으로 적어 주세요.",
    type: "textarea",
    placeholder:
      "예) 세무사무소입니다. 회사 영문 이니셜 TS를 넣고, 신뢰감 있는 남색 계열로 단정하게 만들어 주세요. 귀여운 느낌은 피하고 싶어요.",
    required: true,
    minLength: LOGO_DESCRIPTION_MIN_LENGTH,
    requiredMessage: LOGO_DESCRIPTION_REQUIRED_MESSAGE,
    showIf: isNewLogo,
  },
  {
    field: "로고예시디자인URL",
    label: "참고 로고 이미지 1",
    description:
      "마음에 드는 다른 로고 캡처도 괜찮습니다. 디자이너가 방향을 잡는 데 가장 중요한 자료입니다.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
    showIf: isNewLogo,
  },
  {
    field: "로고예시디자인2URL",
    label: "참고 로고 이미지 2 (선택)",
    description: "추가로 첨부하고 싶은 참고 로고가 있으면 한 장 더 올려 주세요.",
    type: "file",
    accept: "image/*,application/pdf",
    required: false,
    showMailHint: true,
    showIf: isNewLogo,
  },
];

/** 로고 마지막 단계 뒤 접수 확인 (파트 완료 기준은 lib/submission/parts.ts) */
export const LOGO_COMPLETION: QuestCompletion = {
  title: "로고 정보가 접수되었습니다",
  message: "디자이너에게 전달했습니다. 시안은 1~2일 안에 대시보드와 슬랙으로 전달됩니다.",
  check: (values) => missingItems(logoChecklist(values)),
};

const usesSms = (v: Record<string, string>) => v.문자발송사용여부 === "사용";

/** 문자발송 정보: 쓰는 사람만 서류·계정을 낸다 (2026-10-17) */
export const SMS_INFO_STEPS: QuestStep[] = [
  {
    field: "문자발송사용여부",
    label: "문자·알림톡 자동 발송을 쓰시나요?",
    description:
      "고객이 상담을 신청하면 자동 안내 문자를 보내는 기능입니다. 쓰지 않으면 아래 서류는 필요 없습니다.",
    type: "select",
    required: true,
    options: [
      { value: "사용", label: "쓸게요" },
      { value: "미사용", label: "쓰지 않을게요" },
    ],
  },
  {
    field: "대표자신분증URL",
    label: "대표자 신분증",
    description:
      "번호를 가리지 않은 사진을 올려 주세요. 서버에 저장하지 않고 담당자에게 슬랙으로만 전달됩니다.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
    showIf: usesSms,
  },
  {
    field: "통신서비스이용증명원URL",
    label: "통신서비스 이용증명원",
    description:
      "발신번호로 쓸 번호의 이용증명원입니다. 통신사 모바일 앱이나 고객센터에서 발급받을 수 있습니다.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
    showIf: usesSms,
  },
  {
    field: "신용카드앞면URL",
    label: "신용카드 번호 면",
    description:
      "네이버클라우드 결제수단 등록에 씁니다. CVC 번호가 보이게 올려 주세요. 슬랙으로만 전달됩니다.",
    type: "file",
    accept: "image/*,application/pdf",
    required: true,
    showIf: usesSms,
  },
  {
    field: "네이버클라우드ID",
    label: "네이버클라우드 아이디",
    description: "문자 발송을 연결할 네이버클라우드 계정입니다.",
    type: "text",
    required: true,
    showIf: usesSms,
  },
  {
    field: "네이버클라우드PW",
    label: "네이버클라우드 비밀번호",
    description: "암호화해 저장하고 설정 담당자만 확인합니다.",
    type: "password",
    required: true,
    showIf: usesSms,
  },
];

export const HOMEPAGE_INFO_STEPS: QuestStep[] = [
  {
    field: "홈페이지스타일",
    label: "홈페이지 스타일",
    description: "원하시는 홈페이지 스타일을 선택해주세요.",
    type: "select",
    required: true,
    options: [
      { value: "기본스타일", label: "기본 스타일 (폴라애드 추천)" },
      { value: "모던", label: "모던 / 미니멀" },
      { value: "클래식", label: "클래식 / 정통" },
      { value: "친근", label: "친근 / 캐주얼" },
    ],
  },
  {
    field: "홈페이지컬러컨셉",
    label: "메인 컬러",
    description:
      "원하시는 메인 컬러를 16진수 코드(예: #1e3a5f)로 입력해주세요.",
    type: "text",
    placeholder: "#1e3a5f",
    required: true,
    validate: (v) =>
      /^#[0-9A-Fa-f]{6}$/.test(v)
        ? null
        : "올바른 컬러 코드(예: #1e3a5f)를 입력하세요.",
  },
  {
    field: "도메인주소",
    label: "도메인 주소",
    description:
      "사용하실 도메인 주소를 입력해주세요. (없으시면 안내 후 등록 도와드립니다)",
    type: "text",
    placeholder: "예) www.mybrand.co.kr",
    required: false,
  },
];

export const MARKETING_INFO_STEPS: QuestStep[] = [
  {
    field: "네이버검색광고ID",
    label: "네이버 검색광고 ID",
    description: "이미 사용 중인 ID가 있으면 입력, 없으면 비워두셔도 됩니다.",
    type: "text",
    placeholder: "예) brand_marketing",
    required: false,
  },
  {
    field: "네이버검색광고PW",
    label: "네이버 검색광고 비밀번호",
    description: "ID를 입력했다면 비밀번호도 입력해 주세요. 암호화해 저장합니다.",
    type: "password",
    required: false,
  },
];
