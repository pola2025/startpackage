// 콘텐츠 제작 Tip 카테고리 상수

export const CATEGORIES = {
  instagram: {
    id: "instagram",
    name: "인스타그램",
    icon: "📸",
    color: {
      bg: "bg-pink-50",
      text: "text-pink-700",
      border: "border-pink-200",
      badge: "bg-white text-pink-700 border border-pink-300 shadow-sm font-semibold",
    },
    order: 1,
  },
  meta_ads: {
    id: "meta_ads",
    name: "Meta 광고관리자",
    icon: "📊",
    color: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-800",
    },
    order: 2,
  },
  naver_blog: {
    id: "naver_blog",
    name: "네이버 블로그",
    icon: "📝",
    color: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      badge: "bg-green-100 text-green-800",
    },
    order: 3,
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

// 카테고리 배열 (순서대로 정렬됨)
export const CATEGORY_LIST = Object.values(CATEGORIES).sort(
  (a, b) => a.order - b.order
);

// 카테고리 ID 검증
export function isValidCategory(category: string): category is CategoryId {
  return category in CATEGORIES;
}

// 카테고리 정보 가져오기
export function getCategoryInfo(categoryId: CategoryId) {
  return CATEGORIES[categoryId];
}
