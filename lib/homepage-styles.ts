export type HomepageStyleOption = {
  url: string;
  name: string;
  paid?: boolean;
};

export const HOMEPAGE_STYLE_OPTIONS: HomepageStyleOption[] = [
  { url: "https://www.jnipartners.co.kr", name: "스타일 1" },
  { url: "https://bizcoaching.co.kr/", name: "스타일 2" },
  { url: "https://startpackage-demo-style3.vercel.app/", name: "스타일 3" },
  { url: "https://biznuri.co.kr/", name: "스타일 4" },
  { url: "https://www.wiztion.com/", name: "스타일 5" },
  { url: "https://brpartners.kr/", name: "스타일 6" },
  { url: "https://startpackagedemo.vercel.app/", name: "스타일 7" },
  { url: "https://hopebizgroup.com/", name: "스타일 8" },
  { url: "https://gopartners.cc/", name: "스타일 9" },
  { url: "https://jsbizfunding.kr/", name: "유료옵션 1", paid: true },
  {
    url: "https://startpackage-demo4.vercel.app/",
    name: "유료옵션 2",
    paid: true,
  },
  {
    url: "https://startpackagedemo5.vercel.app/",
    name: "유료옵션 3",
    paid: true,
  },
];

const PAID_HOMEPAGE_STYLE_URLS = [
  "https://jsbizfunding.kr/",
  "https://startpackage-demo4.vercel.app/",
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
  "https://startpackage-demo2.vercel.app/": "스타일 8",
  "https://startpackage-demo3.vercel.app/": "스타일 9",
  // 스타일 3 이력 — jmbiz.imweb.me → yjbiz.co.kr → startpackage-demo-style3
  "https://jmbiz.imweb.me/": "스타일 3",
  "https://yjbiz.co.kr/": "스타일 3",
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
