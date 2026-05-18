export type HomepageStyleOption = {
  url: string;
  name: string;
  paid?: boolean;
};

export const HOMEPAGE_STYLE_OPTIONS: HomepageStyleOption[] = [
  { url: "https://www.jnipartners.co.kr", name: "스타일 1" },
  { url: "https://bizcoaching.co.kr/", name: "스타일 2" },
  { url: "https://yjbiz.co.kr/", name: "스타일 3" },
  { url: "https://biznuri.co.kr/", name: "스타일 4" },
  { url: "https://www.wiztion.com/", name: "스타일 5" },
  { url: "https://brpartners.kr/", name: "스타일 6" },
  { url: "https://startpackagedemo.vercel.app/", name: "스타일 7" },
  { url: "https://startpackage-demo2.vercel.app/", name: "스타일 8" },
  { url: "https://startpackage-demo3.vercel.app/", name: "스타일 9" },
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

export function getHomepageStyleName(url?: string | null) {
  const normalizedUrl = normalizeHomepageStyleUrl(url);

  return (
    HOMEPAGE_STYLE_OPTIONS.find(
      (style) => normalizeHomepageStyleUrl(style.url) === normalizedUrl,
    )?.name || null
  );
}
