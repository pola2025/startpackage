// Builds a post folder: plan.json + photos/ → out/*.png, post.json (publish.mjs format), review.html.
//   node build.mjs <글폴더>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { readJson, loadBrand, dataUri, wrapKo } from "./lib/text.mjs";
import * as P from "./lib/parts.mjs";
import { writeReviewPage } from "./lib/pages.mjs";

const postDir = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!postDir || !fs.existsSync(path.join(postDir, "plan.json"))) {
  console.error("사용법: node build.mjs <글폴더>  (글폴더 안에 plan.json이 있어야 합니다)");
  process.exit(64);
}
const slug = path.basename(postDir);
const fail = (msg, code = 22) => {
  console.error(`[${slug}] ${msg}`);
  process.exit(code);
};

let brand, plan, facts;
try {
  brand = loadBrand();
  plan = readJson(path.join(postDir, "plan.json"));
  facts = readJson(path.join(postDir, "facts.json"));
} catch (e) {
  fail(e.message);
}

// Minimal shape checks so rendering never runs on a broken plan. Full rules live in check.mjs.
const photoFile = (n) => path.join(postDir, "photos", `photo-${n}.png`);
const errs = [];
if (!plan.title) errs.push("title이 비어 있습니다.");
if (!plan.cover?.lines?.length) errs.push("cover.lines가 비어 있습니다.");
if (!Array.isArray(plan.cards)) errs.push("cards가 없습니다. 카드를 쓰지 않으면 빈 배열([])로 둡니다.");
if (!plan.sections?.length) errs.push("sections가 비어 있습니다.");
if (!fs.existsSync(path.join(postDir, "photos", "cover.png"))) errs.push("photos\\cover.png(표지 배경)가 없습니다.");
const photoNums = [...new Set((plan.sections || []).flatMap((s) => (s.blocks || []).filter((b) => b.photo).map((b) => +b.photo)))];
photoNums.forEach((n) => !fs.existsSync(photoFile(n)) && errs.push(`photos\\photo-${n}.png가 없습니다.`));
if (!photoNums.length) errs.push("본문에 실사({ \"photo\": 1 })가 없습니다.");
(plan.sections || []).forEach((s, i) =>
  (s.blocks || []).forEach((b, k) => {
    if (b.chart && !P.CHART_TYPES.includes(b.chart.type)) errs.push(`섹션 ${i + 1} 블록 ${k + 1}: 차트 종류는 ${P.CHART_TYPES.join(", ")} 중 하나입니다.`);
    if (b.chart?.type === "bar" && !(b.chart.items || []).every((it) => typeof it[1] === "number")) errs.push(`섹션 ${i + 1} 블록 ${k + 1}: bar 차트 값은 숫자여야 합니다.`);
  }),
);
if (errs.length) fail(`plan.json 오류 ${errs.length}건\n${errs.map((e) => ` - ${e}`).join("\n")}`);

brand.logoData = brand.logoFile ? dataUri(brand.logoFile) : "";
const out = path.join(postDir, "out");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const photos = Object.fromEntries(photoNums.map((n) => [n, dataUri(photoFile(n))]));
const cycle = photoNums.map((n) => photos[n]);
const coverPhoto = dataUri(path.join(postDir, "photos", "cover.png"));

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
} catch {
  fail("Chrome을 열지 못했습니다. Google Chrome이 설치되어 있는지 확인합니다.", 23);
}
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
const report = {};
let seq = 0;
async function render(kind, html) {
  const file = `out/${String(++seq).padStart(2, "0")}-${kind}.png`;
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 20000 });
  report[file] = await page.evaluate(() => /** @type {any} */ (window).__report || {});
  await page.locator(".canvas").screenshot({ path: path.join(postDir, file) });
  return file;
}

const blocks = [];
const text = (t) => t && t.trim() && blocks.push({ text: t.replace(/\r/g, "").trim() });
const counts = { cover: 0, card: 0, band: 0, photo: 0, chart: 0, cta: 0 };
const add = (kind, file, extra = {}) => {
  counts[kind]++;
  blocks.push({ image: file, ...extra });
};

try {
  add("cover", await render("cover", P.cover(brand, plan, coverPhoto)));
  text(plan.lead);
  for (const [i, c] of plan.cards.entries()) {
    const bg = photos[c.photo] || cycle[i % cycle.length];
    add("card", await render(`card-${i + 1}`, P.card(brand, c, i + 1, bg)));
    text(c.text);
  }
  const photoDone = {};
  for (const [i, s] of plan.sections.entries()) {
    add("band", await render(`band-${i + 1}`, P.band(brand, s.heading, i + 1, plan.sections.length, cycle[i % cycle.length])));
    for (const [k, b] of (s.blocks || []).entries()) {
      if (b.text) text(b.text);
      else if (b.photo) {
        photoDone[b.photo] ||= await render(`photo-${b.photo}`, P.photo(brand, photos[b.photo]));
        add("photo", photoDone[b.photo]);
      } else if (b.chart) add("chart", await render(`chart-${i + 1}-${k + 1}`, P.chart(brand, b.chart, facts.sourceLabel || facts.program)));
    }
  }
  text(plan.closing);
  if (plan.sources?.length) {
    // One paragraph per source so no paragraph runs past 4 lines (publish.mjs rule).
    const paras = plan.sources.map((s) => wrapKo(String(s)));
    const long = paras.find((x) => x.split("\n").length > 4);
    if (long) throw new Error(`출처 한 줄이 너무 깁니다. 80자 안으로 줄입니다: "${long.replace(/\n/g, " ").slice(0, 30)}…"`);
    text(["출처", ...paras].join("\n\n"));
  }
  add("cta", await render("cta", P.cta(brand)), { link: brand.homepage });
} catch (e) {
  await browser.close();
  fail(`이미지 렌더링 실패: ${e.message.split("\n")[0]}`, 23);
}
await browser.close();

// Feed-readability: preview cells shrink 1080px images to 126px, so key text under ~100px stops being legible.
const warnings = [];
for (const [file, r] of Object.entries(report)) {
  for (const [key, v] of Object.entries(r)) {
    if (v.overflow) warnings.push(`${file}: 글자가 칸을 넘칩니다(${key}). 문구를 줄입니다.`);
    else if ((key === "cover" || key === "card") && v.size < 100) warnings.push(`${file}: 글자가 ${v.size}px로 작아져 검색 결과 미리보기에서 읽기 어렵습니다. 문구를 줄입니다.`);
  }
}
fs.writeFileSync(path.join(out, "render-report.json"), JSON.stringify({ report, warnings }, null, 2));

const post = { title: plan.title, blocks, tags: (plan.tags || []).map((t) => String(t).replace(/^#/, "")) };
fs.writeFileSync(path.join(postDir, "post.json"), JSON.stringify(post, null, 2));
const review = writeReviewPage(postDir, post, null);
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`[${slug}] 이미지 ${total}장(표지 ${counts.cover}·카드 ${counts.card}·소제목 ${counts.band}·실사 ${counts.photo}·차트 ${counts.chart}·CTA ${counts.cta}) · 문단 ${blocks.length - total}개`);
console.log(`post.json · ${review}`);
warnings.forEach((w) => console.log(`⚠ ${w}`));
