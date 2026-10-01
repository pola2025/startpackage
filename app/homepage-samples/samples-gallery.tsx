"use client";

import { Globe } from "lucide-react";
import { HomepageStyleExplorer } from "@/components/submission/homepage-style-explorer";
import { HOMEPAGE_STYLE_OPTIONS } from "@/lib/homepage-styles";

const FREE_SAMPLES = HOMEPAGE_STYLE_OPTIONS.filter((style) => !style.paid);

export function SamplesGallery() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Globe className="h-4 w-4" />
            스타트패키지 · 비즈액터스쿨
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            홈페이지 제작 샘플
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {FREE_SAMPLES.length}개 스타일을 탭으로 바꿔가며 실제 홈페이지의
            메뉴와 상세 페이지를 직접 살펴보세요.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <HomepageStyleExplorer options={FREE_SAMPLES} />
        <p className="mt-8 text-center text-xs leading-relaxed text-gray-500">
          본 샘플은 스타일 참고용이며, 실제 제작물은 업체별 컬러와 콘텐츠에 맞춰
          제작됩니다.
        </p>
      </main>
    </div>
  );
}
