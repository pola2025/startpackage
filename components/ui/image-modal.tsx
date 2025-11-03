"use client"

import { X, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useEffect, useState } from "react"
import Image from "next/image"

interface ImageModalProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export function ImageModal({ images, initialIndex, onClose }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && currentIndex > 0) setCurrentIndex(currentIndex - 1)
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, images.length, onClose])

  const handleDownload = () => {
    try {
      const imageUrl = images[currentIndex]

      // URL에서 파일명 추출
      const urlParts = imageUrl.split('/')
      const filename = urlParts[urlParts.length - 1] || `image-${currentIndex + 1}.webp`

      // 간단한 다운로드 방법 (CORS 문제 없음)
      const a = document.createElement("a")
      a.href = imageUrl
      a.download = filename
      a.target = "_blank" // 새 탭에서 열기 (다운로드 실패 시 이미지 보기)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error("다운로드 실패:", error)
      alert("다운로드에 실패했습니다. 이미지를 우클릭하여 다운로드해주세요.")
    }
  }

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
          e.stopPropagation()
          handleDownload()
        }}
        className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <Download className="w-6 h-6 text-white" />
      </button>

      {/* 이미지 카운터 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/10 rounded-full text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* 이전 버튼 */}
      {images.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setCurrentIndex(currentIndex - 1)
          }}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* 다음 버튼 */}
      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setCurrentIndex(currentIndex + 1)
          }}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* 이미지 */}
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={images[currentIndex]}
          alt={`이미지 ${currentIndex + 1}`}
          width={1920}
          height={1080}
          className="max-w-[90vw] max-h-[90vh] object-contain w-auto h-auto"
          unoptimized
        />
      </div>
    </div>
  )
}
