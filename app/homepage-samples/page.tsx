import type { Metadata } from "next";
import { SamplesGallery } from "./samples-gallery";

export const metadata: Metadata = {
  title: "홈페이지 제작 샘플 - 스타트패키지",
  description: "스타트패키지로 제작 가능한 홈페이지 스타일 샘플 모음",
  // 루트 layout에서 전역 noindex 적용 중 (검색엔진 비색인)
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepageSamplesPage() {
  return <SamplesGallery />;
}
