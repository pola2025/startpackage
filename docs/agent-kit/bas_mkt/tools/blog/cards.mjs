// Turns a finished blog post folder into an Instagram card news set (1080×1440, 3:4 grid).
//   node cards.mjs <글폴더> [<게시폴더>]
//   node cards.mjs <글폴더> --ad <광고폴더>   → only the cover, 1080×1350 (4:5 feed ad), saved as ad.png in <광고폴더>
// Default 게시폴더: C:\bas_mkt\sns\<글폴더 이름>. Writes cards\01.png … and sns.json (the caption is filled in by the agent).
// Order: cover → message cards → company card. The cover and cards keep the blog's large type.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { readJson, loadBrand, dataUri } from "./lib/text.mjs";
import * as P from "./lib/parts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const postDir = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!postDir || !fs.existsSync(path.join(postDir, "plan.json"))) {
  console.error("사용법: node cards.mjs <글폴더> [<게시폴더> | --ad <광고폴더>]  (글폴더 안에 plan.json이 있어야 합니다)");
  process.exit(64);
}
const slug = path.basename(postDir);
const adAt = process.argv.indexOf("--ad");
const adDir = adAt > 0 && process.argv[adAt + 1] ? path.resolve(process.argv[adAt + 1]) : "";
const outDir = process.argv[3] && !process.argv[3].startsWith("--") ? path.resolve(process.argv[3]) : path.join(ROOT, "sns", slug);
const fail = (msg, code = 22) => {
  console.error(`[${slug}] ${msg}`);
  process.exit(code);
};

let brand, plan;
try {
  brand = loadBrand();
  plan = readJson(path.join(postDir, "plan.json"));
} catch (e) {
  fail(e.message);
}
if (!plan.cover?.lines?.length) fail("plan.json의 cover.lines가 비어 있습니다.");
const cards = (plan.cards || []).slice(0, 8);
if (!cards.length) fail("plan.json에 cards가 없습니다. 카드뉴스는 메시지 카드로 만듭니다.");
const coverFile = path.join(postDir, "photos", "cover.png");
if (!fs.existsSync(coverFile)) fail("photos\\cover.png(표지 배경)가 없습니다.");
const photoFiles = fs.readdirSync(path.join(postDir, "photos")).filter((f) => /^photo-\d+\.png$/.test(f)).sort();
if (!photoFiles.length) fail("photos\\photo-1.png 같은 본문 실사가 없습니다.");

brand.logoData = brand.logoFile ? dataUri(brand.logoFile) : "";
const photos = photoFiles.map((f) => dataUri(path.join(postDir, "photos", f)));
const cardsDir = path.join(outDir, "cards");
if (!adDir) {
  fs.rmSync(cardsDir, { recursive: true, force: true });
  fs.mkdirSync(cardsDir, { recursive: true });
}

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
} catch {
  fail("Chrome을 열지 못했습니다. Google Chrome이 설치되어 있는지 확인합니다.", 23);
}
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
if (adDir) {
  // Ad image: the blog cover in 4:5. The cards folder is left untouched.
  fs.mkdirSync(adDir, { recursive: true });
  await page.setContent(P.igCover(brand, plan, dataUri(coverFile), 1350), { waitUntil: "load" });
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 20000 });
  const fit = await page.evaluate(() => /** @type {any} */ (window).__report?.cover || {});
  await page.locator(".canvas").screenshot({ path: path.join(adDir, "ad.png") });
  await browser.close();
  console.log(`[${slug}] 광고 이미지 1080×1350 · ${path.join(adDir, "ad.png")}`);
  if (fit.overflow || fit.size < 110) console.log("⚠ 표지 글자가 작아지거나 넘칩니다. plan.json의 cover.lines를 줄입니다.");
  process.exit(0);
}
const files = [], warnings = [];
async function render(html) {
  const file = `cards/${String(files.length + 1).padStart(2, "0")}.png`;
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 20000 });
  const report = await page.evaluate(() => /** @type {any} */ (window).__report || {});
  for (const [key, v] of Object.entries(report)) {
    if (v.overflow) warnings.push(`${file}: 글자가 칸을 넘칩니다(${key}). 문구를 줄입니다.`);
    else if ((key === "cover" || key === "card") && v.size < 110) warnings.push(`${file}: 글자가 ${v.size}px로 작아졌습니다. 대형 타이포가 되도록 문구를 줄입니다.`);
  }
  await page.locator(".canvas").screenshot({ path: path.join(outDir, file) });
  files.push(file);
}
const total = cards.length + 2;
try {
  await render(P.igCover(brand, plan, dataUri(coverFile)));
  for (const [i, c] of cards.entries()) await render(P.igCard(brand, c, i + 1, total, photos[(c.photo ? c.photo - 1 : i) % photos.length], i + 2));
  await render(P.igEnd(brand));
} catch (e) {
  await browser.close();
  fail(`카드 렌더링 실패: ${e.message.split("\n")[0]}`, 23);
}
await browser.close();

const snsFile = path.join(outDir, "sns.json");
let caption = "";
try {
  caption = JSON.parse(fs.readFileSync(snsFile, "utf8")).caption || "";
} catch {}
fs.writeFileSync(snsFile, JSON.stringify({ type: "carousel", files, caption, source: path.relative(ROOT, postDir).replace(/\\/g, "/") }, null, 2));
console.log(`[${slug}] 카드뉴스 ${files.length}장(1080×1440) · ${outDir}`);
console.log(caption ? "sns.json 캡션은 이전 내용을 유지했습니다." : "sns.json의 caption을 채운 뒤 publish.mjs --check를 실행합니다.");
warnings.forEach((w) => console.log(`⚠ ${w}`));
