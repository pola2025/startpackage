// Naver blog publisher. Uses the profile saved by bootstrap.mjs; it never types an ID or password.
// Editor steps follow the verified SmartEditor ONE publisher (selectors calibrated 2026-07).
//   node publish.mjs <계정> <글폴더> --check                  format check + preview.html only, no browser
//   node publish.mjs <계정> <글폴더>                          type the post, then schedule it 3 hours later (default)
//   node publish.mjs <계정> <글폴더> --at "YYYY-MM-DD HH:MM"  schedule at that KST time (rounded up to 10 minutes)
//   node publish.mjs <계정> <글폴더> --now                    publish right away (only when the person asks for it)
// Title and body are typed one character at a time. Never paste into the Naver editor
// (no clipboard, no insertText, no DOM writes): pasted text can be flagged as automated.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { accountArg, openProfile, nidAuth, readMeta, writeMeta, PRIVATE } from "./common.mjs";

const LINE_MAX = 20; // Hangul width units per line (mobile column ~19 chars)
const PARAGRAPH_MAX_LINES = 4; // longer runs read as a wall of text
const TAG_MAX = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
const width = (s) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) <= 0xff ? 0.5 : 1), 0);

const acct = accountArg(process.argv);
const postDir = process.argv[3] ? path.resolve(process.argv[3]) : "";
const checkOnly = process.argv.includes("--check");
const nowMode = process.argv.includes("--now");
const atIndex = process.argv.indexOf("--at");
const atArg = atIndex > 0 ? process.argv[atIndex + 1] || "" : "";
const DEFAULT_DELAY_HOURS = 3;
if (!postDir || !fs.existsSync(path.join(postDir, "post.json"))) {
  console.error('사용법: node publish.mjs <계정> <글폴더> [--check | --at "YYYY-MM-DD HH:MM" | --now]  (글폴더 안에 post.json이 있어야 합니다)');
  process.exit(64);
}
const slug = path.basename(postDir);

function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString("ascii", 0, 3) === "GIF") return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9; ) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

function validate(post) {
  const errors = [];
  if (typeof post.title !== "string" || !post.title.trim()) errors.push("title이 비어 있습니다.");
  else if (post.title.length > 100) errors.push("title은 100자 이하여야 합니다.");
  if (!Array.isArray(post.blocks) || !post.blocks.length) errors.push("blocks가 비어 있습니다.");
  (post.blocks || []).forEach((blk, i) => {
    const at = `blocks[${i}]`;
    if (!!blk.text === !!blk.image) return errors.push(`${at}: text와 image 중 하나만 넣습니다.`);
    if (blk.text) {
      if (blk.link) errors.push(`${at}: link는 image 블록에만 넣습니다.`);
      if (/https?:\/\//i.test(blk.text)) errors.push(`${at}: 본문에 주소를 넣지 않습니다. 링크는 image 블록의 link로 겁니다.`);
      let run = 0, blanks = 0;
      blk.text.replace(/\r/g, "").trim().split("\n").forEach((line, n) => {
        if (!line.trim()) { blanks++; run = 0; if (blanks > 1) errors.push(`${at} ${n + 1}줄: 빈 줄은 한 줄만 둡니다.`); return; }
        blanks = 0; run++;
        if (width(line) > LINE_MAX) errors.push(`${at} ${n + 1}줄: 한 줄이 깁니다(한글 ${LINE_MAX}자 이하). "${line.slice(0, 24)}…"`);
        if (run === PARAGRAPH_MAX_LINES + 1) errors.push(`${at} ${n + 1}줄: 빈 줄 없이 ${PARAGRAPH_MAX_LINES}줄을 넘었습니다. 문단을 나눕니다.`);
      });
    }
    if (blk.image) {
      const file = path.join(postDir, blk.image);
      if (!fs.existsSync(file)) return errors.push(`${at}: 이미지 파일이 없습니다(${blk.image}).`);
      if (!/\.(png|jpe?g|gif)$/i.test(file)) return errors.push(`${at}: png·jpg·gif만 올립니다(${blk.image}).`);
      const size = imageSize(file);
      if (!size) errors.push(`${at}: 이미지 크기를 읽지 못했습니다(${blk.image}).`);
      else if (size.h > size.w * 1.05) errors.push(`${at}: 세로 이미지입니다(${size.w}x${size.h}). 가로 이미지만 올립니다.`);
      if (blk.link && !/^https:\/\/\S+$/.test(blk.link)) errors.push(`${at}: link는 https:// 주소여야 합니다.`);
    }
  });
  const tags = post.tags || [];
  if (!Array.isArray(tags)) errors.push("tags는 배열이어야 합니다.");
  else {
    if (tags.length > TAG_MAX) errors.push(`tags는 ${TAG_MAX}개 이하입니다(현재 ${tags.length}개).`);
    tags.forEach((t, i) => { if (!String(t).replace(/^#/, "").trim()) errors.push(`tags[${i}]가 비어 있습니다.`); });
  }
  return errors;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function writePreview(post) {
  const body = post.blocks.map((blk) => blk.text
    ? `<p>${esc(blk.text.trim())}</p>`
    : `<figure><img src="${esc(blk.image)}" alt="">${blk.link ? `<figcaption>클릭하면 이동: ${esc(blk.link)}</figcaption>` : ""}</figure>`).join("\n");
  const tags = (post.tags || []).map((t) => `#${esc(String(t).replace(/^#/, ""))}`).join(" ");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>미리보기 · ${esc(post.title)}</title>
<style>body{margin:0;background:#eef1f5;font-family:"Malgun Gothic",sans-serif}main{max-width:390px;margin:24px auto;padding:24px 18px;background:#fff;border-radius:14px}h1{font-size:22px;line-height:1.35;word-break:keep-all}p{white-space:pre-line;font-size:16px;line-height:1.8;margin:0 0 18px}img{width:100%;border-radius:6px}figure{margin:0 0 18px}figcaption{font-size:12px;color:#2563eb}.tags{color:#16794d;font-size:14px}</style></head>
<body><main><h1>${esc(post.title)}</h1>\n${body}\n<p class="tags">${tags}</p></main></body></html>`;
  fs.writeFileSync(path.join(postDir, "preview.html"), html);
}

const post = JSON.parse(fs.readFileSync(path.join(postDir, "post.json"), "utf8"));
const errors = validate(post);
if (errors.length) {
  console.error(`[${slug}] 원고 형식 오류 ${errors.length}건`);
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(10);
}
writePreview(post);
const hash = crypto.createHash("sha256").update(JSON.stringify({ title: post.title, blocks: post.blocks })).digest("hex").slice(0, 16);
const ledger = path.join(PRIVATE, "logs", `naver-published-${acct}.jsonl`);
const published = fs.existsSync(ledger) ? fs.readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const already = published.find((p) => p.hash === hash || p.slug === slug);
if (already) {
  console.error(`[${slug}] 이미 발행한 글입니다(${already.at} · ${already.url || "주소 미확인"}). 다시 발행하지 않습니다.`);
  process.exit(8);
}
if (checkOnly) {
  console.log(`[${slug}] 원고 형식 통과 · 미리보기 ${path.join(postDir, "preview.html")}`);
  process.exit(0);
}

// Reservation time in KST, rounded up to the editor's 10-minute steps.
const KST = 9 * 3600e3;
function scheduleTime() {
  let t;
  if (atArg) {
    const m = atArg.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!m) return { error: `--at 형식은 "YYYY-MM-DD HH:MM"입니다(현재 "${atArg}").` };
    t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - KST;
  } else {
    t = Math.ceil((Date.now() + DEFAULT_DELAY_HOURS * 3600e3) / 600e3) * 600e3;
    const k = new Date(t + KST);
    const h = k.getUTCHours();
    if (h >= 23 || h < 7) {
      // Late-night slots move to 08:00 the next morning.
      if (h >= 23) k.setUTCDate(k.getUTCDate() + 1);
      k.setUTCHours(8, 0, 0, 0);
      t = k.getTime() - KST;
    }
  }
  t = Math.ceil(t / 600e3) * 600e3;
  // Typing the post takes about 10 minutes, so the slot must stay in the future after that.
  if (t < Date.now() + 30 * 60e3) return { error: "예약 시각은 지금부터 30분 이후여야 합니다." };
  const k = new Date(t + KST);
  const p = (n) => String(n).padStart(2, "0");
  const v = { y: k.getUTCFullYear(), mo: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours(), mi: k.getUTCMinutes() };
  return { ...v, label: `${v.y}-${p(v.mo)}-${p(v.d)} ${p(v.h)}:${p(v.mi)}` };
}
const sched = nowMode ? null : scheduleTime();
if (sched?.error) {
  console.error(`[${slug}] ${sched.error}`);
  process.exit(64);
}

const record = (entry) => {
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.appendFileSync(ledger, JSON.stringify({ at: new Date().toISOString(), slug, hash, title: post.title, ...entry }) + "\n");
};
const stop = async (ctx, page, code, message) => {
  console.error(`[${slug}] ${message}`);
  fs.mkdirSync(path.join(PRIVATE, "logs"), { recursive: true });
  if (page) await page.screenshot({ path: path.join(PRIVATE, "logs", `publish-${slug}-stop.png`) }).catch(() => {});
  await ctx.close().catch(() => {});
  process.exit(code);
};

let ctx;
try {
  ctx = await openProfile(acct, { headless: false });
} catch {
  console.error(`[${acct}] 브라우저 프로필을 열지 못했습니다. 다른 도구(touch.mjs 등)나 열린 창이 같은 프로필을 쓰는 중일 수 있습니다. 잠시 뒤 다시 실행합니다.`);
  process.exit(13);
}
const auth = await nidAuth(ctx);
if (!auth) await stop(ctx, null, 2, "세션 없음 · 다시 로그인하지 않습니다. 사람의 bootstrap.mjs가 필요합니다.");
if (!auth.persistent) await stop(ctx, null, 3, "세션 쿠키 상태라 발행하지 않습니다. 내일 사람이 bootstrap.mjs로 다시 로그인합니다.");

const page = ctx.pages()[0] || (await ctx.newPage());
const challenge = async () => /자동입력 방지|보안문자|보호조치|captcha|2단계 인증|새로운 기기/i
  .test(await page.evaluate(() => document.body?.innerText.slice(0, 800) || "").catch(() => ""));

// Resolve the blog id once from the logged-in "my blog" redirect.
const meta = readMeta(acct);
let blogId = meta.blogId;
if (!blogId) {
  await page.goto("https://blog.naver.com/MyBlog.naver", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await sleep(2500);
  if (/nidlogin/.test(page.url())) await stop(ctx, page, 2, "로그인 화면으로 넘어갔습니다. 세션이 끝났습니다. 다시 로그인하지 않습니다.");
  blogId = (page.url().match(/[?&]blogId=([A-Za-z0-9_-]+)/) || page.url().match(/blog\.naver\.com\/([A-Za-z0-9_-]+)(?:[/?#]|$)/) || [])[1];
  if (!blogId) await stop(ctx, page, 11, `블로그 아이디를 확인하지 못했습니다(${page.url()}).`);
  writeMeta(acct, { ...meta, blogId });
}

await page.goto(`https://blog.naver.com/${blogId}?Redirect=Write&`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
await sleep(rnd(2500, 3500));
if (/nidlogin/.test(page.url())) await stop(ctx, page, 2, "로그인 화면으로 넘어갔습니다. 세션이 끝났습니다. 다시 로그인하지 않습니다.");
if (await challenge()) await stop(ctx, page, 12, "보안문자 또는 보호조치 화면이 나왔습니다. 오늘은 자동화를 멈춥니다.");

const frame = page.frameLocator("iframe#mainFrame");
const clickExact = async (names, timeout = 1200) => {
  for (const name of names) {
    const b = frame.getByRole("button", { name, exact: true }).first();
    if (await b.isVisible({ timeout }).catch(() => false)) { await b.click({ delay: 60 }); await sleep(900); return name; }
  }
  return "";
};
// "작성 중인 글" → 취소(new post). Exact names only: has-text('취소') once hit the 취소선 toolbar button.
for (let pass = 0; pass < 3 && (await clickExact(["새로 작성", "새 글 작성", "취소", "닫기", "나중에"])); pass++);

const title = frame.locator(".se-section-documentTitle .se-text-paragraph, span.se-placeholder, .se_title").first();
if (!(await title.isVisible({ timeout: 20000 }).catch(() => false))) await stop(ctx, page, 11, "글쓰기 화면의 제목 칸을 찾지 못했습니다. 네이버 편집기 화면이 바뀌었을 수 있습니다.");
await title.click({ delay: 80 });
await typeChars(post.title, 70, 150);
await page.keyboard.press("Enter");
await sleep(rnd(600, 1000));
await frame.locator(".se-component-content .se-text-paragraph, .se-module-text").first().click({ delay: 80, timeout: 15000 }).catch(() => {});
// Formatting toggles left on (취소선·굵게 등) would apply to the whole post.
for (const name of ["취소선", "굵게", "기울임꼴", "기울임", "밑줄"]) {
  const b = frame.getByRole("button", { name, exact: true }).first();
  if ((await b.getAttribute("aria-pressed", { timeout: 800 }).catch(() => null)) === "true") await b.click({ delay: 50 }).catch(() => {});
}

// One character at a time with uneven gaps, the way a person types.
async function typeChars(text, min = 45, max = 120) {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await sleep(rnd(min, max) + (/[.,!?]/.test(ch) ? rnd(150, 400) : 0));
  }
}

async function typeText(text, blankAfter) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) await typeChars(lines[i]);
    await page.keyboard.press("Enter");
    await sleep(rnd(150, 450));
  }
  if (blankAfter) await page.keyboard.press("Enter");
  await sleep(rnd(300, 700));
}

async function uploadImage(file) {
  const btn = frame.locator("button.se-image-toolbar-button, button.se-toolbar-button-image, button[data-name='image']").first();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), btn.click({ timeout: 10000 })]);
  await chooser.setFiles(file);
  await sleep(rnd(3000, 4200));
}

// SmartEditor stores image links in its document model only, so verify by reopening the link layer.
async function linkLastImage(href) {
  const open = async () => {
    await frame.locator(".se-component.se-image, .se-image").last().click({ delay: 60, timeout: 3000 });
    await sleep(600);
    const btn = frame.locator("button.se-link-toolbar-button").first();
    if (!(await btn.isVisible({ timeout: 2500 }).catch(() => false))) return false;
    await btn.click({ delay: 50 });
    await sleep(700);
    return true;
  };
  try {
    if (!(await open())) return false;
    const input = frame.locator("input.se-custom-layer-link-input").first();
    await input.click({ delay: 40, timeout: 2500 });
    await typeChars(href, 30, 70);
    await frame.locator("button.se-custom-layer-link-apply-button").first().click({ delay: 50 });
    await sleep(800);
    let ok = false;
    if (await open()) {
      ok = String(await input.inputValue().catch(() => "")).includes(href);
      await frame.locator("button.se-link-toolbar-button").first().click({ delay: 50 }).catch(() => {});
    }
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(300);
    return ok;
  } catch {
    return false;
  }
}

const warnings = [];
try {
  for (let i = 0; i < post.blocks.length; i++) {
    const blk = post.blocks[i];
    if (blk.text) await typeText(blk.text, Boolean(post.blocks[i + 1]?.text));
    else {
      await uploadImage(path.join(postDir, blk.image));
      if (blk.link && !(await linkLastImage(blk.link))) warnings.push(`이미지 링크 미확인: ${blk.image}`);
    }
  }
} catch (e) {
  await stop(ctx, page, 11, `본문을 입력하지 못했습니다(${String(e.message).split("\n")[0].slice(0, 120)}). 발행하지 않았습니다.`);
}
await clickExact(["확인"], 1500);

// 1st 발행 opens the settings layer; exact "발행" avoids 예약 발행.
try {
  await frame.getByRole("button", { name: "발행", exact: true }).first().click({ timeout: 15000 });
} catch {
  await stop(ctx, page, 11, "발행 버튼을 찾지 못했습니다. 발행하지 않았습니다.");
}
await sleep(rnd(1600, 2400));
const tagInput = frame.locator("input#tag-input, input[placeholder*='태그']").first();
if (await tagInput.isVisible({ timeout: 4000 }).catch(() => false)) {
  for (const t of post.tags || []) {
    await tagInput.pressSequentially(String(t).replace(/^#/, "").trim(), { delay: rnd(25, 55) });
    await page.keyboard.press("Enter");
    await sleep(rnd(150, 350));
  }
} else if ((post.tags || []).length) warnings.push("태그 입력칸을 찾지 못해 태그 없이 발행했습니다.");

// Reservation controls, as verified on the 2026-09-11 live run (34 posts). Naver rotates the
// CSS-module suffixes, so match class prefixes. The final button stays labelled 발행 when 예약 is on.
async function frameWith(selector) {
  for (const f of page.frames()) if (await f.locator(selector).count().catch(() => 0)) return f;
  return null;
}
async function setReserve(s) {
  const f = await frameWith("#radio_time2");
  if (!f) return { ok: false, reason: "예약 선택 버튼 없음" };
  await f.locator("#radio_time2").click({ force: true }).catch(() => {});
  await sleep(900);
  if (!(await f.locator("#radio_time2").isChecked().catch(() => false))) return { ok: false, reason: "예약이 선택되지 않음" };
  const hourSel = f.locator('select[class*="hour_option__"]');
  const minSel = f.locator('select[class*="minute_option__"]');
  if (!(await hourSel.count()) || !(await minSel.count())) return { ok: false, reason: "시·분 선택 칸 없음" };
  const hh = String(s.h).padStart(2, "0"), mm = String(s.mi).padStart(2, "0");
  const setTime = async () => {
    await hourSel.selectOption(hh).catch(() => hourSel.selectOption(String(s.h)).catch(() => {}));
    await minSel.selectOption(mm).catch(() => minSel.selectOption(String(s.mi)).catch(() => {}));
    await sleep(500);
  };
  await setTime();
  const dateInput = f.locator('input[class*="input_date__"]');
  const want = `${s.y}.${String(s.mo).padStart(2, "0")}.${String(s.d).padStart(2, "0")}`;
  const dateOk = async () => String(await dateInput.inputValue().catch(() => "")).replace(/\s+/g, "").includes(want);
  if (!(await dateOk())) {
    await dateInput.click({ force: true }).catch(() => {});
    await sleep(900);
    const shown = () => f.evaluate(() => {
      for (const el of document.querySelectorAll("strong,span,em,b,div,th,caption,button,a")) {
        const t = (el.innerText || "").trim();
        const m = t.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*월?/);
        if (m && t.length <= 24) return +m[1] * 12 + (+m[2] - 1);
      }
      return null;
    }).catch(() => null);
    const target = s.y * 12 + (s.mo - 1);
    for (let g = 0; g < 3 && ((await shown()) ?? target) < target; g++) {
      const before = await shown();
      for (const sel of ['button[aria-label*="다음"]', 'button[title*="다음"]', '[class*="btn_next" i]', '[class*="next" i]']) {
        const loc = f.locator(sel).first();
        if (!(await loc.isVisible().catch(() => false))) continue;
        await loc.click({ force: true }).catch(() => {});
        await sleep(450);
        if ((await shown()) !== before) break;
      }
    }
    const days = f.locator("button.ui-state-default, table a.ui-state-default");
    for (let i = 0, n = await days.count().catch(() => 0); i < n; i++) {
      if ((await days.nth(i).innerText().catch(() => "")).trim() !== String(s.d)) continue;
      await days.nth(i).click({ force: true }).catch(() => {});
      break;
    }
    await sleep(800);
    await setTime(); // picking a day can clear the hour/minute selects
  }
  const hv = await hourSel.inputValue().catch(() => ""), mv = await minSel.inputValue().catch(() => "");
  const ok = (await dateOk()) && +hv === s.h && +mv === s.mi;
  return { ok, reason: `날짜 ${await dateInput.inputValue().catch(() => "")} · ${hv}:${mv}` };
}

if (sched) {
  const set = await setReserve(sched);
  if (!set.ok) await stop(ctx, page, 14, `예약 시각을 ${sched.label}로 맞추지 못했습니다(${set.reason}). 발행하지 않았습니다.`);
}
try {
  await frame.getByRole("button", { name: "발행", exact: true }).last().click({ timeout: 15000 });
} catch {
  await stop(ctx, page, 11, "발행 설정 창의 발행 버튼을 찾지 못했습니다. 발행하지 않았습니다.");
}
await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => {});
await sleep(8000);
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const marker = post.title.trim().slice(0, 20);

if (sched) {
  const blogUrl = `https://blog.naver.com/${blogId}`;
  record({ url: blogUrl, scheduledAt: sched.label, verified: false }); // written first so a rerun can never schedule twice
  const readTitle = (t) => {
    let v = String(t || "");
    try { v = decodeURIComponent(v.replace(/\+/g, " ")); } catch {}
    return decode(v);
  };
  let found = null;
  for (let i = 0; i < 6 && !found; i++) {
    if (i) await sleep(5000);
    await page.goto(`https://blog.naver.com/PostList.naver?blogId=${blogId}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    const rows = await page.evaluate(async (id) => {
      const r = await fetch(`/PrePostList.naver?blogId=${encodeURIComponent(id)}&editorVersion=4&onlyCount=false`, { credentials: "include" });
      const j = JSON.parse(await r.text());
      return j.prePostList || j.result?.prePostList || [];
    }, blogId).catch(() => []);
    found = rows.find((r) => readTitle(r.title).includes(marker)) || null;
  }
  await ctx.close().catch(() => {});
  record({ url: blogUrl, scheduledAt: sched.label, logNo: found?.logNo || "", verified: Boolean(found) });
  warnings.forEach((w) => console.warn(`[${slug}] 주의 · ${w}`));
  if (!found) {
    console.error(`[${slug}] 예약 버튼은 눌렀지만 예약 목록에서 제목을 확인하지 못했습니다. 다시 실행하지 말고 글쓰기 화면의 예약 발행 목록을 사람이 확인합니다(${blogUrl}).`);
    process.exit(9);
  }
  console.log(`[${slug}] 예약 완료 · ${sched.label} 발행 예정 · ${post.title}`);
  process.exit(0);
}

const landed = page.url();
const logNo = (landed.match(/[?&]logNo=(\d+)/) || landed.match(/\/(\d{6,})(?:[/?#]|$)/) || [])[1] || "";
const url = logNo ? `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}` : `https://blog.naver.com/${blogId}`;
record({ url, verified: false }); // written before verification so a rerun can never post twice
await ctx.close().catch(() => {});

// Public check from outside the logged-in browser.
let verified = false;
for (let i = 0; i < 12 && !verified; i++) {
  await sleep(5000);
  for (const target of [logNo ? url : "", `https://rss.blog.naver.com/${blogId}.xml`].filter(Boolean)) {
    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }).catch(() => null);
    if (res?.ok && decode(await res.text()).includes(marker)) { verified = true; break; }
  }
}
record({ url, verified });
warnings.forEach((w) => console.warn(`[${slug}] 주의 · ${w}`));
if (!verified) {
  console.error(`[${slug}] 발행 버튼은 눌렀지만 공개 글에서 제목을 확인하지 못했습니다. 다시 발행하지 말고 블로그(${url})를 사람이 확인합니다.`);
  process.exit(9);
}
console.log(`[${slug}] 발행 완료 · ${url}`);
process.exit(0);
