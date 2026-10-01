export type HomepageStyleOption = {
  url: string;
  name: string;
  paid?: boolean;
  previewUrl?: string;
  description?: string;
  pageCount?: number;
  category?: "current" | "new";
  localSnapshotFallback?: boolean;
  previewImage?: string;
  previewImageMobile?: string;
};

export const RETIRED_HOMEPAGE_STYLES = [
  { url: "https://www.jnipartners.co.kr", name: "스타일 1" },
  { url: "https://bizcoaching.co.kr/", name: "스타일 2" },
  { url: "https://biznuri.co.kr/", name: "스타일 4" },
  { url: "https://www.wiztion.com/", name: "스타일 5" },
] as const;

export const HOMEPAGE_STYLE_OPTIONS: HomepageStyleOption[] = [
  { url: "https://startpackage-demo-style3.vercel.app/", name: "스타일 3", category: "current", localSnapshotFallback: true, previewImage: "/samples/current-style-previews/existing-3-desktop.png", previewImageMobile: "/samples/current-style-previews/existing-3-mobile.png" },
  { url: "https://brpartners.kr/", name: "스타일 6", category: "current", localSnapshotFallback: true, previewImage: "/samples/current-style-previews/existing-6-desktop.png", previewImageMobile: "/samples/current-style-previews/existing-6-mobile.png" },
  { url: "https://startpackagedemo.vercel.app/", name: "스타일 7", category: "current" },
  { url: "https://hopebizgroup.com/", name: "스타일 8", category: "current", localSnapshotFallback: true, previewImage: "/samples/current-style-previews/existing-8-desktop.png", previewImageMobile: "/samples/current-style-previews/existing-8-mobile.png" },
  { url: "https://gopartners.cc/", name: "스타일 9", category: "current", localSnapshotFallback: true, previewImage: "/samples/current-style-previews/existing-9-desktop.png", previewImageMobile: "/samples/current-style-previews/existing-9-mobile.png" },
  {
    url: "https://polaai.co.kr/samples/funding/selection/index.html",
    previewUrl: "/samples/funding/selection/index.html",
    name: "신규 1 · 선택형",
    category: "new",
    pageCount: 3,
    description: "목적을 고르고 필요한 자금의 안내를 읽는 홈페이지",
  },
  {
    url: "https://polaai.co.kr/samples/funding/dialogue/index.html",
    previewUrl: "/samples/funding/dialogue/index.html",
    name: "신규 2 · 대화형",
    category: "new",
    pageCount: 4,
    description: "질문을 선택하며 안내를 읽고 진행절차까지 확인하는 홈페이지",
  },
  {
    url: "https://polaai.co.kr/samples/funding/proposal/index.html",
    previewUrl: "/samples/funding/proposal/index.html",
    name: "신규 3 · 제안형",
    category: "new",
    pageCount: 3,
    description: "자금 제안서와 준비 내용을 문서 흐름으로 살펴보는 홈페이지",
  },
  {
    url: "https://polaai.co.kr/samples/funding/comparison/index.html",
    previewUrl: "/samples/funding/comparison/index.html",
    name: "신규 4 · 비교형",
    category: "new",
    pageCount: 3,
    description: "두 자금의 차이와 상황별 준비 방향을 나란히 비교하는 홈페이지",
  },
  {
    url: "https://polaai.co.kr/samples/funding/briefing/index.html",
    previewUrl: "/samples/funding/briefing/index.html",
    name: "신규 5 · 브리핑형",
    category: "new",
    pageCount: 4,
    description: "사진과 설명으로 자금안내·상담준비를 읽는 홈페이지",
  },

];

const PAID_HOMEPAGE_STYLE_URLS = [
  "https://jsbizfunding.kr/",
  "https://startpackage-demo4.vercel.app/",
  "https://richway-biz.com/",
  // 레거시 (이전 데이터 호환용) — 유료옵션 3 이전 URL
  "https://startpackagedemo5.vercel.app/",
];

const PAID_HOMEPAGE_STYLE_LABELS = ["유료옵션1", "유료옵션2", "유료옵션3"];

export function normalizeHomepageStyleUrl(url?: string | null) {
  const trimmed = url?.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.search = "";
    const path =
      parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function normalizeHomepageStyleLabel(label?: string | null) {
  return label?.trim().replace(/\s+/g, "") || "";
}

export function isPaidHomepageStyle(url?: string | null) {
  const normalizedUrl = normalizeHomepageStyleUrl(url);
  const normalizedLabel = normalizeHomepageStyleLabel(url);

  return (
    PAID_HOMEPAGE_STYLE_URLS.some(
      (paidUrl) => normalizeHomepageStyleUrl(paidUrl) === normalizedUrl,
    ) || PAID_HOMEPAGE_STYLE_LABELS.includes(normalizedLabel)
  );
}

// 레거시 (이전 데이터 호환용) — 데모 사이트로 저장된 기존 선택값
//
// 목록에서 뺀 URL 도 여기에 남겨야 한다. 지우기만 하면 그 URL 을 고른 기존 제출건이
// `getHomepageStyleName` 에서 null 이 되어 어드민에 스타일 이름이 사라진다.
const LEGACY_HOMEPAGE_STYLE_NAMES: Record<string, string> = {
  "https://jsbizfunding.kr/": "유료옵션 1",
  "https://startpackage-demo4.vercel.app/": "유료옵션 2",
  "https://richway-biz.com/": "유료옵션 3",
  ...Object.fromEntries(RETIRED_HOMEPAGE_STYLES.map((style) => [style.url, style.name])),
  "https://startpackage-demo2.vercel.app/": "스타일 8",
  "https://startpackage-demo3.vercel.app/": "스타일 9",
  // 스타일 3 이력 — jmbiz.imweb.me → yjbiz.co.kr → startpackage-demo-style3
  "https://jmbiz.imweb.me/": "스타일 3",
  "https://yjbiz.co.kr/": "스타일 3",
  // 유료옵션 3 이력 — startpackagedemo5 → richway-biz.com
  "https://startpackagedemo5.vercel.app/": "유료옵션 3",
};

export function getHomepageStyleName(url?: string | null) {
  const normalizedUrl = normalizeHomepageStyleUrl(url);

  const matched = HOMEPAGE_STYLE_OPTIONS.find(
    (style) => normalizeHomepageStyleUrl(style.url) === normalizedUrl,
  )?.name;
  if (matched) return matched;

  const legacy = Object.entries(LEGACY_HOMEPAGE_STYLE_NAMES).find(
    ([legacyUrl]) => normalizeHomepageStyleUrl(legacyUrl) === normalizedUrl,
  )?.[1];

  return legacy || null;
}
