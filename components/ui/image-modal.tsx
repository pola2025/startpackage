"use client";

import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

interface ImageModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  captions?: string[];
  title?: string;
  /**
   * "carousel" (기본) — 한 장씩 좌우 화살표로 넘김
   * "compare" — 모든 이미지를 한 화면에 좌우(또는 상하)로 나란히 표시
   */
  mode?: "carousel" | "compare";
}

export function ImageModal({
  images,
  initialIndex,
  onClose,
  captions,
  title,
  mode = "carousel",
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const isCompare = mode === "compare" && images.length > 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (isCompare) return; // compare 모드는 화살표 비활성
      if (e.key === "ArrowLeft" && currentIndex > 0)
        setCurrentIndex(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1)
        setCurrentIndex(currentIndex + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onClose, isCompare]);

  const handleDownload = () => {
    try {
      const imageUrl = images[currentIndex];

      // URL에서 파일명 추출
      const urlParts = imageUrl.split("/");
      const filename =
        urlParts[urlParts.length - 1] || `image-${currentIndex + 1}.webp`;

      // 간단한 다운로드 방법 (CORS 문제 없음)
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = filename;
      a.target = "_blank"; // 새 탭에서 열기 (다운로드 실패 시 이미지 보기)
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("다운로드 실패:", error);
      alert("다운로드에 실패했습니다. 이미지를 우클릭하여 다운로드해주세요.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* 다운로드 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <Download className="w-6 h-6 text-white" />
      </button>

      {/* 제목 + 이미지 카운터 */}
      {(title || (!isCompare && images.length > 1)) && (
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          {title && (
            <div className="px-3 py-1.5 bg-white/10 rounded-full text-white text-sm font-semibold">
              {title}
            </div>
          )}
          {!isCompare && images.length > 1 && (
            <div className="px-3 py-1.5 bg-white/10 rounded-full text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* 현재 이미지 캡션 (carousel 모드, 하단) */}
      {!isCompare && captions?.[currentIndex] && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/15 backdrop-blur rounded-full text-white text-sm font-medium z-10 max-w-[80vw] text-center">
          {captions[currentIndex]}
        </div>
      )}

      {/* 이전/다음 버튼 (carousel 모드 전용) */}
      {!isCompare && images.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(currentIndex - 1);
          }}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {!isCompare && images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(currentIndex + 1);
          }}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* 이미지 표시 영역 */}
      {isCompare ? (
        <div
          className="flex flex-row gap-4 items-center justify-center max-w-[95vw] max-h-[88vh] px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, idx) => (
            <div key={src} className="flex flex-col items-center gap-2">
              <Image
                src={src}
                alt={captions?.[idx] || `이미지 ${idx + 1}`}
                width={1920}
                height={1920}
                className="max-w-[45vw] max-h-[80vh] object-contain w-auto h-auto bg-white/5 rounded"
                unoptimized
              />
              {captions?.[idx] && (
                <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-white text-xs sm:text-sm font-medium">
                  {captions[idx]}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="relative max-w-[90vw] max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={images[currentIndex]}
            alt={`이미지 ${currentIndex + 1}`}
            width={1920}
            height={1080}
            className="max-w-[90vw] max-h-[90vh] object-contain w-auto h-auto"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
