"use client";

import { useState } from "react";
import { Globe, ExternalLink, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HOMEPAGE_STYLE_OPTIONS } from "@/lib/homepage-styles";

// 무료 샘플만 노출 (유료옵션 제외)
const FREE_SAMPLES = HOMEPAGE_STYLE_OPTIONS.filter((s) => !s.paid);

export function SamplesGallery() {
  const [styleScrolls, setStyleScrolls] = useState<Record<string, number>>({});
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const handleStyleScroll = (url: string, deltaY: number) => {
    setStyleScrolls((prev) => ({
      ...prev,
      [url]: Math.max(0, Math.min((prev[url] || 0) + deltaY * 0.5, 1500)),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
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
            스타트패키지로 제작 가능한 홈페이지 스타일 {FREE_SAMPLES.length}종을
            미리 살펴보세요. 썸네일을 클릭하면 크게 보거나 새 탭에서 직접 열어볼
            수 있습니다.
          </p>
        </div>
      </header>

      {/* 갤러리 */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {FREE_SAMPLES.map((style) => (
            <Dialog
              key={style.url}
              open={openUrl === style.url}
              onOpenChange={(open) => setOpenUrl(open ? style.url : null)}
            >
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-green-400 hover:shadow-md">
                {/* 썸네일 */}
                <DialogTrigger asChild>
                  <div className="group relative cursor-pointer">
                    <div
                      className="aspect-[4/3] overflow-hidden bg-gray-100"
                      onWheel={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStyleScroll(style.url, e.deltaY);
                      }}
                    >
                      <iframe
                        src={style.url}
                        className="pointer-events-none origin-top-left"
                        style={{
                          width: "300%",
                          height: "300%",
                          transform: `scale(0.33) translateY(-${styleScrolls[style.url] || 0}px)`,
                        }}
                        title={`${style.name} 미리보기`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/10">
                      <div className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        클릭하여 크게 보기
                      </div>
                    </div>
                  </div>
                </DialogTrigger>

                {/* 이름 + 바로가기 */}
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="font-semibold text-gray-900">
                    {style.name}
                  </span>
                  <a
                    href={style.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                  >
                    새 탭 열기
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* 큰 미리보기 */}
              <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto border border-gray-200 bg-white p-2 sm:p-4 md:p-6">
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-base text-gray-900 sm:text-lg md:text-xl">
                    {style.name} 미리보기
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-600 sm:text-sm">
                    웹사이트 전체 미리보기
                  </DialogDescription>
                </DialogHeader>
                <div className="my-2 aspect-[16/9] w-full overflow-hidden rounded-md border border-gray-200 bg-gray-100 sm:my-3 md:my-4">
                  <iframe
                    src={style.url}
                    className="h-[200%] w-[200%] origin-top-left"
                    style={{ transform: "scale(0.5)" }}
                    title={`${style.name} 전체보기`}
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </div>
                <p className="text-center text-xs text-gray-500">
                  미리보기 위에서 스크롤하여 페이지를 탐색할 수 있습니다
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => window.open(style.url, "_blank")}
                    className="w-full bg-green-600 text-sm hover:bg-green-700 sm:text-base"
                  >
                    새 탭에서 사이트 열기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-gray-400">
          ※ 본 샘플은 스타일 참고용이며, 실제 제작물은 업체별 컬러·콘텐츠에 맞춰
          제작됩니다.
        </p>
      </main>
    </div>
  );
}
