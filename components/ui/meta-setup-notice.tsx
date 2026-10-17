"use client";

import Link from "next/link";
import { ChevronRight, Smartphone } from "lucide-react";
import type { MetaSetupStage } from "@/lib/submission/parts";

export const META_SETUP_HREF = "/dashboard/meta-setup";

// 단계별 문구: 요청 전에는 "필수"를 붙여 교육 전에 요청하도록 이끈다.
function copyFor(stage: MetaSetupStage | null) {
  if (stage === "done")
    return {
      title: "Meta 설정 완료",
      short: "교육용 토큰을 확인하세요",
      banner: "교육용 토큰 확인하기",
      long: "교육에서 쓰는 토큰 2개를 확인하세요",
      required: false,
    };
  if (stage === "requested")
    return {
      title: "Meta 설정요청",
      short: "요청 완료 · 교육 전에 설정해 드려요",
      banner: "요청 완료 · 교육 전 설정",
      long: "요청 완료 · 마케팅 교육 전에 폴라애드가 설정해 드립니다",
      required: false,
    };
  return {
    title: "Meta 설정요청",
    short: "마케팅 교육 전에 꼭 요청하세요",
    // 사이드바 배너는 폭이 좁아 한 줄에 들어가는 길이로 줄인다
    banner: "교육 전에 꼭 요청하세요",
    long: "마케팅 교육 전에 꼭 요청해야 교육에 원활하게 참여할 수 있습니다",
    required: stage === "none",
  };
}

function RequiredTag() {
  return (
    <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      필수
    </span>
  );
}

// 본문 맨 위 얇은 띠 (인쇄물 발주 안내 띠와 같은 모양)
export function MetaSetupStrip({ stage }: { stage: MetaSetupStage | null }) {
  const copy = copyFor(stage);
  return (
    <Link
      href={META_SETUP_HREF}
      className="flex items-center gap-2 border-b border-white/10 bg-gov-blue px-3 py-2 text-white outline-none hover:bg-gov-blue-700 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 sm:px-4 md:px-6"
    >
      <Smartphone
        className="h-4 w-4 shrink-0 text-gold-300"
        aria-hidden="true"
      />
      <span className="shrink-0 text-xs font-bold sm:text-sm">
        {copy.title}
      </span>
      {copy.required && <RequiredTag />}
      <span className="min-w-0 truncate text-xs text-white/70">
        <span className="sm:hidden">{copy.short}</span>
        <span className="hidden sm:inline">{copy.long}</span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 opacity-70"
        aria-hidden="true"
      />
    </Link>
  );
}

// 사이드바의 인쇄물 발주 안내 배너 위에 두는 배너
export function MetaSetupBanner({
  stage,
  onClick,
}: {
  stage: MetaSetupStage | null;
  onClick?: () => void;
}) {
  const copy = copyFor(stage);
  return (
    <Link
      href={META_SETUP_HREF}
      onClick={onClick}
      className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl bg-gov-blue p-3 text-white outline-none hover:bg-gov-blue-700 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Smartphone className="h-4 w-4 text-gold-300" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-xs font-bold">
          {copy.title}
          {copy.required && <RequiredTag />}
        </span>
        <span className="block text-[11px] text-white/70">{copy.banner}</span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 opacity-70"
        aria-hidden="true"
      />
    </Link>
  );
}
