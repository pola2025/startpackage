// Image templates (1080px canvases). Each function returns a full HTML document rendered by build.mjs.
// Designs follow the approved 08F wireframe: cover, message card, 3-zone heading band, 4 chart types, photo, CTA A/B/C.
import { esc } from "./text.mjs";

const FONT = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// Shrinks [data-fit] elements until they fit their box, then reports final font sizes for the feed-readability check.
const FIT_SCRIPT = `
(async () => {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]);
  const report = {};
  // Measure the text itself (a Range), not the block box: a block is as wide as its parent even when the text is short.
  const textWidth = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
  for (const el of document.querySelectorAll("[data-fit]")) {
    const maxW = el.dataset.fit === "box" ? el.clientWidth : +el.dataset.fit, maxH = +(el.dataset.fitH || 0), min = +(el.dataset.min || 24);
    let size = parseFloat(getComputedStyle(el).fontSize);
    const over = () => textWidth(el) > maxW + 1 || (maxH && el.scrollHeight > maxH + 1);
    while (over() && size > min) { size -= 2; el.style.fontSize = size + "px"; }
    if (el.dataset.key) report[el.dataset.key] = { size, overflow: over() };
  }
  window.__report = report;
  document.body.dataset.ready = "1";
})();`;

const page = (brand, w, h, inner) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}">
<style>
:root{--accent:${brand.color};--navy:#0B1F3A;--accent-dark:color-mix(in srgb,var(--accent) 62%,#000);--accent-light:color-mix(in srgb,var(--accent) 42%,#fff)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:"Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;word-break:keep-all}
.canvas{position:relative;overflow:hidden;width:${w}px;height:${h}px}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,16,34,.4),rgba(6,16,34,.6) 45%,rgba(6,16,34,.8))}
.scrim~div{text-shadow:0 3px 18px rgba(0,0,0,.55)}
.ai{position:absolute;right:28px;bottom:22px;color:#fff;font-size:24px;font-weight:500;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.nowrap{white-space:nowrap}
.logo{display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:900}
.logo img{max-width:82%;max-height:82%;object-fit:contain}
</style></head><body><div class="canvas">${inner}</div><script>${FIT_SCRIPT}</script></body></html>`;

const logoBox = (brand, size, radius, bg, fg, font) =>
  `<div class="logo" style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${bg};color:${fg};font-size:${font}px">${
    brand.logoData ? `<img src="${brand.logoData}" alt="">` : esc([...brand.company][0] || "")
  }</div>`;
const host = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/* ---------- 표지 1080×1080 ---------- */
export function cover(brand, plan, photo) {
  const c = plan.cover;
  const lines = [...c.lines.map((t) => ({ t, a: false })), ...(c.accent || []).map((t) => ({ t, a: true }))];
  return page(
    brand,
    1080,
    1080,
    `<img class="ph" src="${photo}"><div class="scrim"></div>
    <div style="position:absolute;left:70px;right:70px;top:188px;height:708px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
      <div style="font-size:36px;font-weight:700;border:3px solid var(--accent-light);padding:8px 30px;border-radius:999px;background:color-mix(in srgb,var(--accent) 35%,transparent)">${esc(plan.category || "정부지원사업 소식")}</div>
      <div data-fit="940" data-fit-h="520" data-min="64" data-key="cover" style="margin-top:26px;font-size:124px;font-weight:900;line-height:1.08;letter-spacing:-4px">${lines
        .map((l) => `<div class="nowrap" style="${l.a ? "color:var(--accent-light)" : ""}">${esc(l.t)}</div>`)
        .join("")}</div>
      <div data-fit="940" data-min="26" class="nowrap" style="margin-top:26px;font-size:42px;font-weight:600;opacity:.92">${esc(c.sub || "")}</div>
      <div style="margin-top:18px;font-size:32px;font-weight:700;opacity:.85">${esc(brand.company)}</div>
    </div><div class="ai">AI 생성 이미지</div>`,
  );
}

/* ---------- 메시지 카드 1080×900 ---------- */
export function card(brand, c, n, photo) {
  return page(
    brand,
    1080,
    900,
    `<img class="ph" src="${photo}"><div class="scrim"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
      <div style="font-size:44px;font-weight:800;color:var(--accent-light);letter-spacing:1px">${String(n).padStart(2, "0")} · ${esc(c.label)}</div>
      <div data-fit="940" data-fit-h="300" data-min="72" data-key="card" style="margin-top:34px;font-size:128px;font-weight:900;line-height:1.12;letter-spacing:-4px">${c.lines
        .map((t) => `<div class="nowrap">${esc(t)}</div>`)
        .join("")}</div>
      <div style="margin-top:44px;width:120px;height:8px;border-radius:8px;background:var(--accent-light)"></div>
    </div><div class="ai">AI 생성 이미지</div>`,
  );
}

/* ---------- 소제목 1080×288 (3구역: 회사 · 소제목 · 번호) ---------- */
export function band(brand, heading, n, total, photo) {
  return page(
    brand,
    1080,
    288,
    `<img class="ph" src="${photo}"><div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,20,42,.9),rgba(8,20,42,.78) 50%,rgba(8,20,42,.9))"></div>
    <div style="position:absolute;left:0;top:0;width:367px;height:288px;display:flex;align-items:center;justify-content:center;gap:18px;color:#fff;padding:0 24px">
      ${logoBox(brand, 70, 16, brand.logoData ? "#fff" : "var(--accent)", "#fff", 32)}
      <div data-fit="230" data-min="18" class="nowrap" style="font-size:28px;font-weight:700;opacity:.9">${esc(brand.company)}</div>
    </div>
    <div style="position:absolute;left:367px;width:346px;top:0;height:288px;display:flex;align-items:center;justify-content:center">
      <div data-fit="330" data-fit-h="200" data-min="34" data-key="band" style="width:330px;text-align:center;color:#fff;font-size:52px;font-weight:800;line-height:1.22;letter-spacing:-1.5px">${esc(heading)}</div>
    </div>
    <div style="position:absolute;right:0;top:0;width:367px;height:288px;display:flex;align-items:center;justify-content:center;gap:10px;color:#fff">
      <span style="font-size:72px;font-weight:900;color:var(--accent-light)">${String(n).padStart(2, "0")}</span><span style="font-size:30px;font-weight:600;opacity:.6">/ ${String(total).padStart(2, "0")}</span>
    </div>
    <div style="position:absolute;left:367px;top:56px;bottom:56px;width:2px;background:rgba(255,255,255,.18)"></div>
    <div style="position:absolute;left:713px;top:56px;bottom:56px;width:2px;background:rgba(255,255,255,.18)"></div>`,
  );
}

/* ---------- 차트 1080×810 ---------- */
const fmt = (v) => (typeof v === "number" ? v.toLocaleString("ko-KR") : esc(v));
function chartFrame(brand, ch, sourceLabel, inner) {
  return page(
    brand,
    1080,
    810,
    `<div style="position:absolute;inset:0;background:#fff;color:var(--navy)">
      <div style="position:absolute;left:70px;top:60px;right:70px">
        <div style="font-size:24px;font-weight:800;color:var(--accent)">${esc(brand.company)} 정리</div>
        <div data-fit="940" data-min="34" data-key="chartTitle" class="nowrap" style="font-size:50px;font-weight:900;letter-spacing:-1.5px;margin-top:8px">${esc(ch.title)}</div>
        ${ch.unit ? `<div data-fit="940" data-min="18" class="nowrap" style="font-size:26px;color:#6b7280;margin-top:6px">${esc(ch.unit)}</div>` : ""}
      </div>
      <div style="position:absolute;left:70px;right:70px;top:250px;bottom:110px">${inner}</div>
      <div data-fit="940" data-min="14" class="nowrap" style="position:absolute;left:70px;right:70px;bottom:44px;font-size:22px;color:#9ca3af;border-top:2px solid #eef0f3;padding-top:16px">출처: ${esc(sourceLabel)}</div>
    </div>`,
  );
}
const CHARTS = {
  bar: (ch) => {
    const max = Math.max(...ch.items.map((i) => +i[1] || 0), 1);
    const gap = ch.items.length > 3 ? 26 : 56;
    const h = ch.items.length > 3 ? 64 : 96;
    return ch.items
      .map(
        ([k, v], i) => `<div style="display:flex;align-items:center;gap:24px;margin-bottom:${gap}px">
        <div data-fit="230" data-min="20" class="nowrap" style="width:230px;font-size:36px;font-weight:700">${esc(k)}</div>
        <div style="flex:1;height:${h}px;background:#f1f3f7;border-radius:14px;position:relative"><div style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(2, (v / max) * 100)}%;background:${i === 0 ? "var(--accent)" : "color-mix(in srgb,var(--accent) 45%,#fff)"};border-radius:14px"></div></div>
        <div data-fit="190" data-min="28" class="nowrap" style="width:190px;text-align:right;font-size:52px;font-weight:900">${fmt(v)}</div></div>`,
      )
      .join("");
  },
  table: (ch) =>
    ch.rows
      .map(
        ([a, b], i) => `<div style="display:flex;gap:28px;align-items:center;padding:${ch.rows.length > 3 ? 16 : 26}px 0;border-bottom:2px solid #eef0f3">
        <div data-fit="230" data-min="28" class="nowrap" style="width:230px;flex:none;font-size:${ch.rows.length > 3 ? 46 : 58}px;font-weight:900;color:${i === 0 ? "var(--accent)" : "var(--navy)"}">${esc(a)}</div>
        <div data-fit="680" data-fit-h="${ch.rows.length > 3 ? 90 : 120}" data-min="20" style="width:680px;font-size:${String(b).length > 40 ? 27 : 36}px;font-weight:600;line-height:1.45">${esc(b)}</div></div>`,
      )
      .join(""),
  timeline: (ch) => {
    const tones = ["var(--accent)", "color-mix(in srgb,var(--accent) 55%,#fff)", "color-mix(in srgb,var(--accent) 32%,#fff)", "color-mix(in srgb,var(--accent) 18%,#fff)"];
    return `<div style="display:flex;height:160px;border-radius:18px;overflow:hidden;margin-top:24px">${ch.steps
      .map(
        (s, i) => `<div style="flex:${+s.weight || 1};min-width:0;background:${tones[i] || tones[3]};color:${i === 0 ? "#fff" : "var(--navy)"};display:flex;flex-direction:column;justify-content:center;padding:0 26px">
        <div data-fit="box" data-min="16" class="nowrap" style="font-size:30px;font-weight:700;opacity:.92">${esc(s.label)}</div>
        <div data-fit="box" data-min="24" class="nowrap" style="font-size:58px;font-weight:900">${esc(s.value || "")}</div></div>`,
      )
      .join("")}</div>
      ${ch.note ? `<div data-fit="880" data-min="20" class="nowrap" style="margin-top:70px;font-size:32px;font-weight:600;background:#f6f8fb;border-radius:14px;padding:24px 30px">${esc(ch.note)}</div>` : ""}`;
  },
  stats: (ch) => `<div style="display:grid;grid-template-columns:repeat(${ch.items.length},1fr);gap:24px;height:100%">${ch.items
    .map((it, i) => {
      const warn = ch.warn === i;
      return `<div style="background:${warn ? "#fff4f2" : "#f6f8fb"};border-radius:20px;padding:64px 30px 36px;display:flex;flex-direction:column;justify-content:flex-start;min-width:0">
        <div data-fit="box" data-min="36" class="nowrap" style="font-size:84px;font-weight:900;color:${warn ? "#c2410c" : "var(--accent)"};letter-spacing:-2px">${esc(it.value)}</div>
        <div style="font-size:30px;font-weight:700;color:#6b7280;min-height:36px">${esc(it.suffix || "")}</div>
        <div style="font-size:34px;font-weight:700;margin-top:18px;line-height:1.4">${esc(it.text)}</div></div>`;
    })
    .join("")}</div>`,
};
export const chart = (brand, ch, sourceLabel) => chartFrame(brand, ch, ch.source || sourceLabel, CHARTS[ch.type](ch));
export const CHART_TYPES = Object.keys(CHARTS);

/* ---------- 실사 1080×810 ---------- */
export const photo = (brand, src) => page(brand, 1080, 810, `<img class="ph" src="${src}"><div class="ai">AI 생성 이미지</div>`);

/* ---------- CTA 1080×480 ---------- */
const CTA = {
  A: (b) => `<div style="position:absolute;inset:0;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-dark))">
    <div style="position:absolute;right:-120px;top:-120px;width:520px;height:520px;border-radius:50%;background:rgba(255,255,255,.07)"></div>
    <div style="position:absolute;left:0;top:0;bottom:0;width:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;border-right:2px solid rgba(255,255,255,.18);padding:0 20px">
      ${logoBox(b, 120, 30, "#fff", "var(--accent)", 52)}
      <div data-fit="260" data-min="18" class="nowrap" style="font-size:28px;font-weight:700">${esc(b.company)}</div>
    </div>
    <div style="position:absolute;left:350px;right:60px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
      <div style="font-size:28px;font-weight:700;opacity:.85">정책자금 · 지원사업 상담</div>
      <div style="font-size:60px;font-weight:900;line-height:1.2;letter-spacing:-2px;margin-top:12px">이 공고, 우리 회사도<br>받을 수 있을까요?</div>
      <div style="margin-top:30px;display:flex"><div style="background:#fff;color:var(--accent-dark);font-size:34px;font-weight:800;padding:20px 36px;border-radius:16px">지원 가능 여부 상담하기 →</div></div>
      <div data-fit="660" data-min="18" class="nowrap" style="font-size:26px;opacity:.85;margin-top:22px">☎ ${esc(b.phone || "")} · ${esc(host(b.homepage))}</div>
    </div></div>`,
  B: (b) => `<div style="position:absolute;inset:0;background:#fff;color:var(--navy)">
    <div style="position:absolute;inset:20px;border:4px solid var(--accent);border-radius:28px"></div>
    <div style="position:absolute;left:70px;top:60px;width:560px;bottom:60px;display:flex;flex-direction:column;justify-content:center">
      <div data-fit="540" data-min="18" class="nowrap" style="font-size:26px;font-weight:800;color:var(--accent)">${esc(b.company)}</div>
      <div style="font-size:50px;font-weight:900;letter-spacing:-1.5px;line-height:1.22;margin-top:10px">신청 전, 이 세 가지를<br>같이 확인해 드립니다</div>
      <div style="margin-top:26px;display:flex;flex-direction:column;gap:12px">${["지원 대상 해당 여부", "한도·금리 조건 비교", "제출 서류 준비"]
        .map((t) => `<div style="display:flex;align-items:center;gap:16px;font-size:32px;font-weight:700"><span style="width:40px;height:40px;border-radius:10px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px">✓</span>${t}</div>`)
        .join("")}</div>
    </div>
    <div style="position:absolute;right:60px;top:60px;bottom:60px;width:330px;border-radius:24px;background:var(--accent);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;padding:0 16px">
      ${logoBox(b, 96, 24, "#fff", "var(--accent)", 44)}
      <div style="font-size:44px;font-weight:900">상담 신청 →</div>
      <div data-fit="300" data-min="16" style="font-size:24px;opacity:.9">☎ ${esc(b.phone || "")}<br>${esc(host(b.homepage))}</div>
    </div></div>`,
  C: (b) => `<div style="position:absolute;inset:16px;border-radius:30px;background:var(--navy);overflow:hidden">
    <div style="position:absolute;left:0;top:0;bottom:0;width:690px;padding:0 64px;display:flex;flex-direction:column;justify-content:center;color:#fff">
      <div style="display:flex;align-items:center;gap:16px">${logoBox(b, 64, 16, b.logoData ? "#fff" : "var(--accent)", "#fff", 30)}<div data-fit="460" data-min="18" class="nowrap" style="font-size:30px;font-weight:700">${esc(b.company)}</div></div>
      <div style="font-size:58px;font-weight:900;line-height:1.2;letter-spacing:-2px;margin-top:26px">정책자금 공고,<br>조건부터 함께 확인합니다</div>
      <div data-fit="560" data-min="16" class="nowrap" style="font-size:26px;opacity:.7;margin-top:22px">☎ ${esc(b.phone || "")} · ${esc(host(b.homepage))}</div>
    </div>
    <div style="position:absolute;left:690px;top:0;bottom:0;border-left:4px dashed rgba(255,255,255,.35)"></div>
    <div style="position:absolute;left:672px;top:-20px;width:40px;height:40px;border-radius:50%;background:#fff"></div>
    <div style="position:absolute;left:672px;bottom:-20px;width:40px;height:40px;border-radius:50%;background:#fff"></div>
    <div style="position:absolute;left:694px;right:0;top:0;bottom:0;background:var(--accent);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <div style="font-size:30px;font-weight:700;opacity:.9">지원 가능 여부</div>
      <div style="font-size:64px;font-weight:900;margin-top:8px">상담 신청</div>
      <div style="margin-top:22px;width:84px;height:84px;border-radius:50%;background:#fff;color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:900">→</div>
    </div></div>`,
};
export const cta = (brand) => page(brand, 1080, 480, CTA[brand.cta](brand));

/* ---------- 인스타 카드뉴스 1080×1440 (3:4 프로필 그리드) ---------- */
// The first image is what search and the profile grid show, so the key message is set in large type.
// h 1350 renders the same cover as a 4:5 Instagram feed ad image (cards.mjs --ad).
export function igCover(brand, plan, photo, h = 1440) {
  const c = plan.cover;
  const lines = [...c.lines.map((t) => ({ t, a: false })), ...(c.accent || []).map((t) => ({ t, a: true }))];
  return page(
    brand,
    1080,
    h,
    `<img class="ph" src="${photo}"><div class="scrim"></div>
    <div style="position:absolute;left:70px;right:70px;top:150px;bottom:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
      <div style="font-size:40px;font-weight:700;border:3px solid var(--accent-light);padding:10px 34px;border-radius:999px;background:color-mix(in srgb,var(--accent) 35%,transparent)">${esc(plan.category || "정부지원사업 소식")}</div>
      <div data-fit="940" data-fit-h="${h - 680}" data-min="72" data-key="cover" style="margin-top:40px;font-size:140px;font-weight:900;line-height:1.1;letter-spacing:-4px">${lines
        .map((l) => `<div class="nowrap" style="${l.a ? "color:var(--accent-light)" : ""}">${esc(l.t)}</div>`)
        .join("")}</div>
      <div data-fit="940" data-min="28" class="nowrap" style="margin-top:36px;font-size:46px;font-weight:600;opacity:.92">${esc(c.sub || "")}</div>
      <div style="margin-top:22px;font-size:36px;font-weight:700;opacity:.85">${esc(brand.company)}</div>
    </div><div class="ai">AI 생성 이미지</div>`,
  );
}

export function igCard(brand, c, n, total, photo, pageNo = n) {
  return page(
    brand,
    1080,
    1440,
    `<img class="ph" src="${photo}"><div class="scrim"></div>
    <div style="position:absolute;left:70px;right:70px;top:150px;bottom:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
      <div style="font-size:48px;font-weight:800;color:var(--accent-light);letter-spacing:1px">${String(n).padStart(2, "0")} · ${esc(c.label)}</div>
      <div data-fit="940" data-fit-h="560" data-min="80" data-key="card" style="margin-top:44px;font-size:148px;font-weight:900;line-height:1.12;letter-spacing:-4px">${c.lines
        .map((t) => `<div class="nowrap">${esc(t)}</div>`)
        .join("")}</div>
      <div style="margin-top:56px;width:140px;height:10px;border-radius:10px;background:var(--accent-light)"></div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:64px;text-align:center;color:#fff;font-size:30px;font-weight:600;opacity:.75">${pageNo} / ${total}</div><div class="ai">AI 생성 이미지</div>`,
  );
}

export function igEnd(brand) {
  return page(
    brand,
    1080,
    1440,
    `<div style="position:absolute;inset:0;background:linear-gradient(160deg,var(--navy),var(--accent-dark))"></div>
    <div style="position:absolute;left:80px;right:80px;top:150px;bottom:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
      ${logoBox(brand, 220, 48, "#fff", "var(--accent)", 120)}
      <div data-fit="920" data-min="64" class="nowrap" style="margin-top:56px;font-size:96px;font-weight:900;letter-spacing:-3px">${esc(brand.company)}</div>
      <div style="margin-top:28px;font-size:44px;font-weight:700;color:var(--accent-light)">정책자금 · 지원사업 상담</div>
      <div style="margin-top:72px;font-size:56px;font-weight:800">☎ ${esc(brand.phone)}</div>
      <div style="margin-top:20px;font-size:40px;font-weight:600;opacity:.85">${esc(host(brand.homepage))}</div>
      <div style="margin-top:72px;font-size:36px;font-weight:500;opacity:.8">자세한 신청 방법은 블로그에 정리했습니다</div>
    </div>`,
  );
}
