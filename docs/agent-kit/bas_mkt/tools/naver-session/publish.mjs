// Naver blog publisher. Uses the profile saved by bootstrap.mjs; it never types an ID or password.
// Editor steps follow our production SmartEditor ONE engine (naver_blog_sectioned_draft.js, 2026-09-15).
//   node publish.mjs <계정> <글폴더> --check                  format check + preview.html only, no browser
//   node publish.mjs <계정> <글폴더>                          type the post, then schedule it about 3 hours later (default)
//   node publish.mjs <계정> <글폴더> --at "YYYY-MM-DD HH:MM"  schedule at that KST time (rounded up to 10 minutes)
//   node publish.mjs <계정> <글폴더> --now                    publish right away (only when the person asks for it)
//   node publish.mjs <계정> <글폴더> --repost                 skip only the local ledger block, after the person deleted the reservation
//   node publish.mjs <계정> <글폴더> --dry-run                do everything up to the last button, then stop: nothing is published or recorded
// Title and body are typed one character at a time. Never paste into the Naver editor
// (no clipboard, no DOM writes): pasted text can be flagged as automated.
// Nothing is published unless the editor shows the title, every paragraph and every image first.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { accountArg, openProfile, nidAuth, readMeta, writeMeta, PRIVATE } from "./common.mjs";

const LINE_MAX = 20; // Hangul width units per line (mobile column ~19 chars)
const PARAGRAPH_MAX_LINES = 4; // longer runs read as a wall of text
const TAG_MAX = 10;
const DEFAULT_DELAY_HOURS = 3;
const GAP_HOURS = 3; // minimum distance between this account's reservations
const RESERVE_LIMIT = 95; // Naver silently drops reservations past 100 (2026-07-21: 32 posts lost)
const FORBIDDEN = ["## ", "**", "|---"]; // markdown left in a manuscript shows up as raw symbols
const BARE_DOMAIN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i; // a domain-only line turns into a link card

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
const width = (s) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) <= 0xff ? 0.5 : 1), 0);
const ZWSP = String.fromCharCode(0x200b); // SmartEditor leaves zero-width spaces in empty paragraphs
const squash = (s) => String(s || "").split(ZWSP).join("").replace(/\s+/g, " ").trim();

const acct = accountArg(process.argv);
const postDir = process.argv[3] ? path.resolve(process.argv[3]) : "";
const checkOnly = process.argv.includes("--check");
const nowMode = process.argv.includes("--now");
const repost = process.argv.includes("--repost"); // Naver-side duplicate checks (reservation list, RSS) still apply
const dryRun = process.argv.includes("--dry-run");
const atIndex = process.argv.indexOf("--at");
const atArg = atIndex > 0 ? process.argv[atIndex + 1] || "" : "";
if (!postDir || !fs.existsSync(path.join(postDir, "post.json"))) {
  console.error('사용법: node publish.mjs <계정> <글폴더> [--check | --at "YYYY-MM-DD HH:MM" | --now] [--repost] [--dry-run]  (글폴더 안에 post.json이 있어야 합니다)');
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
  else if (FORBIDDEN.some((m) => post.title.includes(m))) errors.push("title에 마크다운 기호(##, **, |---)가 있습니다.");
  if (!Array.isArray(post.blocks) || !post.blocks.length) errors.push("blocks가 비어 있습니다.");
  (post.blocks || []).forEach((blk, i) => {
    const at = `blocks[${i}]`;
    if (!!blk.text === !!blk.image) return errors.push(`${at}: text와 image 중 하나만 넣습니다.`);
    if (blk.text) {
      if (blk.link) errors.push(`${at}: link는 image 블록에만 넣습니다.`);
      if (/https?:\/\//i.test(blk.text)) errors.push(`${at}: 본문에 주소를 넣지 않습니다. 링크는 image 블록의 link로 겁니다.`);
      const marks = FORBIDDEN.filter((m) => blk.text.includes(m));
      if (marks.length) errors.push(`${at}: 마크다운 기호(${marks.join(", ").trim()})가 그대로 보입니다. 지웁니다.`);
      let run = 0, blanks = 0;
      blk.text.replace(/\r/g, "").trim().split("\n").forEach((line, n) => {
        if (!line.trim()) { blanks++; run = 0; if (blanks > 1) errors.push(`${at} ${n + 1}줄: 빈 줄은 한 줄만 둡니다.`); return; }
        blanks = 0; run++;
        if (width(line) > LINE_MAX) errors.push(`${at} ${n + 1}줄: 한 줄이 깁니다(한글 ${LINE_MAX}자 이하). "${line.slice(0, 24)}…"`);
        if (run === PARAGRAPH_MAX_LINES + 1) errors.push(`${at} ${n + 1}줄: 빈 줄 없이 ${PARAGRAPH_MAX_LINES}줄을 넘었습니다. 문단을 나눕니다.`);
        if (BARE_DOMAIN.test(line.trim())) errors.push(`${at} ${n + 1}줄: 주소만 있는 줄은 링크 카드로 바뀝니다. 문장 안에 넣거나 지웁니다. "${line.trim()}"`);
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
      if (post.blocks[i + 1]?.image) errors.push(`${at}: 이미지 바로 뒤에 이미지가 있습니다. 사이에 문단을 넣습니다.`);
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
if (already && !repost) {
  console.error(`[${slug}] 이미 발행·예약한 글입니다(${already.at} · ${already.scheduledAt ? `${already.scheduledAt} 예약` : already.url || "주소 미확인"}). 다시 올리지 않습니다.`);
  process.exit(8);
}
if (checkOnly) {
  console.log(`[${slug}] 원고 형식 통과 · 미리보기 ${path.join(postDir, "preview.html")}`);
  process.exit(0);
}

// Reservation time in KST, rounded up to the editor's 10-minute steps, kept GAP_HOURS away
// from this account's other reservations so posts never pile up on one slot.
const KST = 9 * 3600e3;
const ceil10 = (t) => Math.ceil(t / 600e3) * 600e3;
const pad = (n) => String(n).padStart(2, "0");
const kstLabel = (t) => { const k = new Date(t + KST); return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`; };
const fromLabel = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) - KST;
const taken = [...new Set(published.map((p) => p.scheduledAt).filter(Boolean))].map(fromLabel);
const clash = (t) => taken.find((x) => Math.abs(x - t) < GAP_HOURS * 3600e3);
function daytime(t) {
  const k = new Date(t + KST);
  const h = k.getUTCHours();
  if (h < 23 && h >= 7) return t;
  // Late-night slots move to the next morning, 08:00~08:50.
  if (h >= 23) k.setUTCDate(k.getUTCDate() + 1);
  k.setUTCHours(8, rnd(0, 6) * 10, 0, 0);
  return k.getTime() - KST;
}
function scheduleTime() {
  const slot = (t) => { const k = new Date(t + KST); return { y: k.getUTCFullYear(), mo: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours(), mi: k.getUTCMinutes(), label: kstLabel(t) }; };
  if (atArg) {
    const m = atArg.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!m) return { error: `--at 형식은 "YYYY-MM-DD HH:MM"입니다(현재 "${atArg}").` };
    const t = ceil10(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - KST);
    // Typing the post takes about 10 minutes, so the slot must stay in the future after that.
    if (t < Date.now() + 30 * 60e3) return { error: "예약 시각은 지금부터 30분 이후여야 합니다." };
    const c = clash(t);
    if (c) return { error: `같은 계정의 다른 예약(${kstLabel(c)})과 ${GAP_HOURS}시간 이상 떨어뜨려야 합니다.` };
    return slot(t);
  }
  let t = daytime(ceil10(Date.now() + DEFAULT_DELAY_HOURS * 3600e3));
  for (let i = 0; i < 30; i++) {
    const c = clash(t);
    if (!c) return slot(t);
    t = daytime(ceil10(c + GAP_HOURS * 3600e3));
  }
  return { error: "비어 있는 예약 시각을 찾지 못했습니다. --at으로 시각을 정합니다." };
}
const sched = nowMode ? null : scheduleTime();
if (sched?.error) {
  console.error(`[${slug}] ${sched.error}`);
  process.exit(64);
}

const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const readTitle = (t) => {
  let v = String(t || "");
  try { v = decodeURIComponent(v.replace(/\+/g, " ")); } catch {}
  return squash(decode(v));
};
const logFile = path.join(PRIVATE, "logs", `publish-${slug}.log`);
const log = (m) => {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${m}\n`);
};
const record = (entry) => {
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.appendFileSync(ledger, JSON.stringify({ at: new Date().toISOString(), slug, hash, title: post.title, ...entry }) + "\n");
};
const shot = async (page, name) => page?.screenshot({ path: path.join(PRIVATE, "logs", `publish-${slug}-${name}.png`) }).catch(() => {});
const stop = async (ctx, page, code, message) => {
  console.error(`[${slug}] ${message}`);
  log(`STOP ${code} ${message}`);
  fs.mkdirSync(path.join(PRIVATE, "logs"), { recursive: true });
  await shot(page, "stop");
  await ctx.close().catch(() => {});
  process.exit(code);
};

// A post with the same title already public on the blog is never posted again.
const knownBlog = readMeta(acct).blogId;
const rss = knownBlog ? await fetch(`https://rss.blog.naver.com/${knownBlog}.xml`, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }).catch(() => null) : null;
if (rss?.ok && (await rss.text()).split("<title>").some((t) => readTitle(t.split("</title>")[0].replace(/^<!\[CDATA\[|\]\]>$/g, "")) === squash(post.title))) {
  console.error(`[${slug}] 블로그에 같은 제목의 글이 이미 공개되어 있습니다. 다시 올리지 않습니다.`);
  process.exit(8);
}

log(`START ${sched ? `예약 ${sched.label}` : "바로 발행"} · ${post.title}`);
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
page.setDefaultTimeout(25000);
// Browser confirm boxes: accept only publish confirmations, dismiss everything else (production rule).
page.on("dialog", async (d) => {
  log(`DIALOG ${d.type()} ${d.message().slice(0, 120)}`);
  try { if (/발행|등록|공개|게시/.test(d.message())) await d.accept(); else await d.dismiss(); } catch {}
});
// locator.isVisible() ignores its timeout and answers at once, so every wait goes through waitFor.
const visible = (loc, timeout = 1500) => loc.waitFor({ state: "visible", timeout }).then(() => true, () => false);
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
const blogUrl = `https://blog.naver.com/${blogId}`;

// Reservation list (same-origin fetch on blog.naver.com). postDate is epoch ms.
async function reservations() {
  const j = await page.evaluate(async (id) => {
    const r = await fetch(`/PrePostList.naver?blogId=${encodeURIComponent(id)}&editorVersion=4&onlyCount=false`, { credentials: "include" });
    return JSON.parse(await r.text());
  }, blogId).catch(() => null);
  if (!j) return null;
  const list = j.result?.prePostList || j.prePostList || [];
  return { total: Number(j.result?.totalCount ?? j.totalCount ?? list.length), rows: list.map((p) => ({ title: readTitle(p.title), at: p.postDate ? kstLabel(Number(p.postDate)) : "", logNo: p.logNo })) };
}

await page.goto(`${blogUrl}?Redirect=Write&`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
await sleep(rnd(2500, 3500));
if (/nidlogin/.test(page.url())) await stop(ctx, page, 2, "로그인 화면으로 넘어갔습니다. 세션이 끝났습니다. 다시 로그인하지 않습니다.");
if (await challenge()) await stop(ctx, page, 12, "보안문자 또는 보호조치 화면이 나왔습니다. 오늘은 자동화를 멈춥니다.");

const before = await reservations();
log(`RESERVATIONS ${before ? before.total : "unknown"}`);
if (before?.rows.some((r) => r.title === squash(post.title))) await stop(ctx, page, 8, "같은 제목의 글이 이미 예약되어 있습니다. 다시 올리지 않습니다.");
if (sched && before && before.total >= RESERVE_LIMIT) await stop(ctx, page, 15, `예약 대기 글이 ${before.total}건입니다. 100건을 넘으면 네이버가 알림 없이 예약을 버리므로 새로 예약하지 않습니다.`);

const frame = page.frameLocator("iframe#mainFrame");
const editor = () => page.frames().find((f) => /PostWriteForm|SmartEditor|blog\.editor/i.test(f.url())) || page.frame({ name: "mainFrame" });
const title = frame.locator(".se-section-documentTitle .se-text-paragraph, span.se-placeholder, .se_title").first();
if (!(await visible(title, 45000))) await stop(ctx, page, 11, "글쓰기 화면의 제목 칸을 찾지 못했습니다. 네이버 편집기 화면이 바뀌었을 수 있습니다.");

// "작성 중인 글" → 취소 (start a new post); help/guide layers → 닫기. Popups can appear late, so watch a few seconds.
async function closePopups(waitMs) {
  const end = Date.now() + waitMs;
  let closed = 0;
  while (Date.now() < end) {
    let hit = false;
    for (const f of page.frames()) {
      const text = await f.evaluate(() => document.body?.innerText || "").catch(() => "");
      const labels = /작성 중인 글|이어서 작성/.test(text) ? ["취소", "닫기"] : /도움말|가이드|불러오기|복원/.test(text) ? ["닫기", "취소", "나중에"] : null;
      if (!labels) continue;
      for (const name of labels) {
        const b = f.getByRole("button", { name, exact: true }).first();
        if (!(await b.isVisible().catch(() => false))) continue;
        await b.click({ delay: 60 }).catch(() => {});
        log(`POPUP ${name}`);
        hit = true; closed++;
        await sleep(1000);
        break;
      }
    }
    if (closed && !hit) break;
    await sleep(hit ? 300 : 700);
  }
}
await closePopups(6000);

// Editor state read from the SmartEditor DOM (same selectors as the production engine).
async function editorState() {
  const f = editor();
  if (!f) return null;
  return f.evaluate(() => {
    const zw = String.fromCharCode(0x200b);
    // Placeholder hints ("제목", "본문에 #을 …") are not content.
    const plain = (el) => {
      if (!el) return "";
      const c = el.cloneNode(true);
      c.querySelectorAll(".se-placeholder, .__se_placeholder").forEach((n) => n.remove());
      return (c.textContent || "").split(zw).join("").trim();
    };
    let txt = 0;
    document.querySelectorAll(".se-component:not(.se-documentTitle) .se-component-content .se-text-paragraph").forEach((p) => { txt += plain(p).length; });
    // The outer .se-documentTitle also holds editor buttons (위치이동·제목 배경 사진 삭제), so read the inner section only.
    // .se-main-container no longer exists (2026-10-17), so body text is gathered from every non-title component.
    const body = [...document.querySelectorAll(".se-component:not(.se-documentTitle) .se-component-content")];
    // Component order: I = image, T = text with content (empty paragraphs skipped, runs of text merged).
    const seq = [...document.querySelectorAll(".se-component:not(.se-documentTitle)")]
      .map((c) => (c.querySelector(".se-module-image") ? "I" : plain(c) ? "T" : ""))
      .join("")
      .replace(/T+/g, "T");
    return {
      seq,
      title: plain(document.querySelector(".se-section-documentTitle")),
      text: body.map((c) => c.innerText || "").join("\n"),
      txt,
      images: document.querySelectorAll(".se-module-image").length,
      uploaded: [...document.querySelectorAll(".se-module-image img")].filter((i) => /se-image-resource/.test(i.className) || /pstatic\.net/.test(i.src)).length,
    };
  }).catch(() => null);
}
const empty = await editorState();
if (!empty) await stop(ctx, page, 11, "글쓰기 화면을 읽지 못했습니다. 발행하지 않았습니다.");
if (empty.images || empty.txt || empty.title) await stop(ctx, page, 11, "편집기에 이전 글 내용이 남아 있습니다. 발행하지 않았습니다. 글쓰기 화면의 임시저장 글을 사람이 정리한 뒤 다시 실행합니다.");

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

// Upload, then wait until the editor really holds one more image (production waited 9.5 s blind).
async function uploadImage(file, expected) {
  const started = Date.now();
  const btn = frame.locator("button.se-image-toolbar-button, button.se-toolbar-button-image, button[data-name='image']").first();
  try {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 20000 }), btn.click({ delay: 80, timeout: 10000 })]);
    await chooser.setFiles(file);
  } catch {
    await frame.locator('input[type="file"]').first().setInputFiles(file, { timeout: 10000 });
  }
  let s = null;
  while (Date.now() - started < 30000) {
    s = await editorState();
    if (s && s.images >= expected) break;
    await sleep(500);
  }
  if (!s || s.images < expected) return false;
  await sleep(Math.max(0, 9500 - (Date.now() - started))); // let the upload settle before the next keystroke
  return true;
}

// SmartEditor stores image links in its document model only, so verify by reopening the link layer.
async function linkLastImage(href) {
  const open = async () => {
    await frame.locator(".se-component.se-image, .se-image").last().click({ delay: 60, timeout: 3000 });
    await sleep(600);
    const btn = frame.locator("button.se-link-toolbar-button").first();
    if (!(await visible(btn, 4000))) return false;
    await btn.click({ delay: 50 });
    await sleep(700);
    return true;
  };
  try {
    if (!(await open())) return false;
    const input = frame.locator("input.se-custom-layer-link-input").first();
    await input.click({ delay: 40, timeout: 4000 });
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

// Title, then the first body paragraph (never the title paragraph).
await title.click({ delay: 80 });
await typeChars(post.title, 70, 150);
await sleep(rnd(600, 1000));
const bodyStart = frame.locator(".se-component:not(.se-documentTitle) .se-text-paragraph").first();
if (await visible(bodyStart, 5000)) await bodyStart.click({ delay: 80 }).catch(() => {});
else await page.keyboard.press("Enter");
// Formatting toggles left on (취소선·굵게 등) would apply to the whole post.
for (const name of ["취소선", "굵게", "기울임꼴", "기울임", "밑줄"]) {
  const b = frame.getByRole("button", { name, exact: true }).first();
  if ((await b.getAttribute("aria-pressed", { timeout: 800 }).catch(() => null)) === "true") await b.click({ delay: 50 }).catch(() => {});
}

const warnings = [];
const imageTotal = post.blocks.filter((b) => b.image).length;
let uploaded = 0;
try {
  for (let i = 0; i < post.blocks.length; i++) {
    const blk = post.blocks[i];
    if (blk.text) {
      await typeText(blk.text, Boolean(post.blocks[i + 1]?.text));
      continue;
    }
    uploaded++;
    if (!(await uploadImage(path.join(postDir, blk.image), uploaded))) await stop(ctx, page, 11, `이미지가 올라가지 않았습니다(${blk.image}). 발행하지 않았습니다.`);
    if (blk.link && !(await linkLastImage(blk.link)) && !(await linkLastImage(blk.link))) await stop(ctx, page, 11, `이미지 링크를 넣지 못했습니다(${blk.image}). 발행하지 않았습니다.`);
    // The uploaded image stays selected, so keystrokes would not reach the body (production fix 2026-08-07).
    await page.keyboard.press("ArrowDown").catch(() => {});
    await page.keyboard.press("End").catch(() => {});
    await page.keyboard.press("Enter").catch(() => {});
    await sleep(400);
    log(`IMAGE ${uploaded}/${imageTotal} ${blk.image}`);
  }
} catch (e) {
  await stop(ctx, page, 11, `본문을 입력하지 못했습니다(${String(e.message).split("\n")[0].slice(0, 120)}). 발행하지 않았습니다.`);
}

// Nothing is published unless the editor matches the manuscript. Production retypes a missing
// tail paragraph, but these posts end with the CTA image, so a retype would land after it: stop instead.
const textBlocks = post.blocks.filter((b) => b.text);
const firstLine = (b) => squash(b.text.replace(/\r/g, "").split("\n").find((l) => l.trim()) || "");
await sleep(1200);
const state = await editorState();
const problems = [];
if (!state) problems.push("편집기 내용을 읽지 못함");
else {
  if (state.title && squash(state.title) !== squash(post.title)) problems.push(`제목이 다름("${state.title.slice(0, 30)}")`);
  if (!squash(state.text).includes(squash(post.title)) && !state.title) problems.push("제목이 없음");
  const missing = textBlocks.filter((b) => !squash(state.text).includes(firstLine(b)));
  if (missing.length) problems.push(`빠진 문단 ${missing.length}개("${firstLine(missing[0]).slice(0, 20)}…")`);
  if (state.images < imageTotal) problems.push(`이미지 ${state.images}/${imageTotal}장`);
  const wantSeq = post.blocks.map((b) => (b.image ? "I" : "T")).join("").replace(/T+/g, "T");
  if (state.seq !== wantSeq) problems.push(`문단·이미지 순서가 다름(편집기 ${state.seq.slice(0, 24)} · 원고 ${wantSeq.slice(0, 24)})`);
  const marks = FORBIDDEN.filter((m) => state.text.includes(m));
  if (marks.length) problems.push(`마크다운 기호 ${marks.join(" ")}`);
  log(`EDITOR title=${Boolean(state.title)} images=${state.images}/${imageTotal} uploaded=${state.uploaded} missing=${missing.length} order=${state.seq}`);
}
await shot(page, "typed");
if (problems.length) await stop(ctx, page, 11, `편집기 내용이 원고와 다릅니다(${problems.join(" · ")}). 발행하지 않았습니다.`);

// 1st 발행 opens the settings layer; exact "발행" avoids 예약 발행 N건.
try {
  await frame.getByRole("button", { name: "발행", exact: true }).first().click({ timeout: 15000 });
} catch {
  await stop(ctx, page, 11, "발행 버튼을 찾지 못했습니다. 발행하지 않았습니다.");
}
const panelReady = async () => {
  for (const f of page.frames()) {
    const t = await f.evaluate(() => document.body?.innerText || "").catch(() => "");
    if (/발행 설정|공개 설정|태그 편집|발행 시간/.test(t)) return f;
  }
  return null;
};
let panel = null;
for (let waited = 0; waited < 15000 && !(panel = await panelReady()); waited += 500) await sleep(500);
if (!panel) await stop(ctx, page, 11, "발행 설정 창이 열리지 않았습니다. 발행하지 않았습니다.");
await sleep(rnd(1500, 2500));

// Tags: remove chips Naver pre-fills (예: #첫글), type ours, read them back.
async function applyTags(want) {
  for (const f of page.frames()) {
    const input = f.locator('input#tag-input, input[id*="tag"], .tag_input input, input[placeholder*="태그"]').first();
    if (!(await visible(input, 1500))) continue;
    for (let i = 0; i < 12; i++) {
      const del = f.locator('.tag_area button, [class*="tag"] button[class*="del"], [class*="tag"] .btn_del').first();
      if (!(await del.isVisible().catch(() => false))) break;
      await del.click({ timeout: 1500 }).catch(() => {});
      await sleep(250);
    }
    for (const t of want) {
      await input.click({ delay: 60 }).catch(() => {});
      await typeChars(t, 40, 90);
      await sleep(200);
      await page.keyboard.press("Enter");
      await sleep(rnd(250, 450));
    }
    const after = await f.evaluate(() => [...document.querySelectorAll('[class*="tag"] .ell, [class*="tag"] span, .tag_area a')].map((e) => e.textContent.trim()).filter((t) => t.startsWith("#"))).catch(() => []);
    return { found: true, ok: want.every((t) => after.some((a) => a.replace(/^#/, "") === t)) };
  }
  return { found: false, ok: false };
}
const wantTags = (post.tags || []).map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean);
if (wantTags.length) {
  const tags = await applyTags(wantTags);
  if (!tags.found) await stop(ctx, page, 11, "발행 설정 창에서 태그 입력칸을 찾지 못했습니다. 발행하지 않았습니다.");
  if (!tags.ok) warnings.push("태그를 다시 읽어 확인하지 못했습니다. 발행된 글의 태그를 확인합니다.");
}

// Reservation controls from the production engine (2026-09-15). Naver rotates CSS-module
// suffixes, so match class prefixes; wait for the sub-panel instead of a fixed delay.
async function setReserve(s) {
  let f = null;
  for (const x of page.frames()) if (await x.locator("#radio_time2").count().catch(() => 0)) { f = x; break; }
  if (!f) return { ok: false, reason: "예약 선택 버튼 없음" };
  await f.locator("#radio_time2").click({ force: true }).catch(() => {});
  let ready = false;
  for (let waited = 0; waited <= 10000 && !ready; waited += 100) {
    ready = await f.evaluate(() => {
      const r = document.querySelector("#radio_time2");
      const h = document.querySelector('select[class^="hour_option__"]');
      const m = document.querySelector('select[class^="minute_option__"]');
      const d = document.querySelector('input[class^="input_date__"]');
      return !!(r?.checked && h?.options.length && m?.options.length && d?.value);
    }).catch(() => false);
    if (!ready) await sleep(100);
  }
  if (!ready) return { ok: false, reason: "예약 시각 칸이 준비되지 않음" };
  const hourSel = f.locator('select[class^="hour_option__"]');
  const minSel = f.locator('select[class^="minute_option__"]');
  // The minute list only has fixed steps; snap to the nearest one that exists.
  const minutes = await minSel.evaluate((el) => [...el.options].map((o) => o.value)).catch(() => []);
  let mm = pad(s.mi);
  if (minutes.length && !minutes.includes(mm)) {
    const nums = minutes.map(Number).filter((n) => !Number.isNaN(n));
    if (nums.length) mm = pad(nums.reduce((a, b) => (Math.abs(b - s.mi) < Math.abs(a - s.mi) ? b : a)));
  }
  const setSel = async (sel, want) => {
    for (let i = 0; i < 3; i++) {
      await sel.selectOption(want).catch(() => sel.selectOption(String(Number(want))).catch(() => {}));
      await sleep(200);
      const got = await sel.inputValue().catch(() => "");
      if (got !== "" && Number(got) === Number(want)) return true;
      await sleep(300);
    }
    return false;
  };
  if (!(await setSel(hourSel, pad(s.h))) || !(await setSel(minSel, mm))) return { ok: false, reason: "시·분을 넣지 못함" };
  s.mi = Number(mm);
  s.label = `${s.label.slice(0, 11)}${pad(s.h)}:${mm}`;
  await sleep(600);
  const dateInput = f.locator('input[class^="input_date__"]');
  const want = `${s.y}.${pad(s.mo)}.${pad(s.d)}`;
  const dateOk = async () => String(await dateInput.inputValue().catch(() => "")).replace(/\s+/g, "").includes(want);
  if (!(await dateOk())) {
    await dateInput.click({ force: true }).catch(() => {});
    await sleep(900);
    // Move only with the calendar's own header and arrows; other "다음" buttons exist on the page.
    const target = s.y * 12 + s.mo;
    let monthReady = false;
    for (let g = 0; g < 12; g++) {
      const m = (await f.locator(".ui-datepicker-title").first().innerText().catch(() => "")).match(/(\d{4})년\s*(\d{1,2})월/);
      if (!m) break;
      const cur = Number(m[1]) * 12 + Number(m[2]);
      if (cur === target) { monthReady = true; break; }
      const nav = f.locator(cur < target ? "button.ui-datepicker-next" : "button.ui-datepicker-prev").first();
      if (!(await nav.count())) break;
      await nav.click({ force: true });
      await sleep(350);
    }
    if (!monthReady) return { ok: false, reason: `달력을 ${s.y}년 ${s.mo}월로 옮기지 못함` };
    const days = f.locator(".ui-datepicker table td:not(.ui-state-disabled) button.ui-state-default").filter({ hasText: new RegExp(`^\\s*${s.d}\\s*$`) });
    if (!(await days.count())) return { ok: false, reason: `${s.d}일을 고를 수 없음` };
    await days.first().click({ force: true });
    await sleep(800);
    await setSel(hourSel, pad(s.h)); // picking a day can clear the hour/minute selects
    await setSel(minSel, mm);
  }
  const hv = await hourSel.inputValue().catch(() => ""), mv = await minSel.inputValue().catch(() => "");
  const ok = (await f.locator("#radio_time2").isChecked().catch(() => false)) && (await dateOk()) && Number(hv) === s.h && Number(mv) === s.mi;
  return { ok, reason: `날짜 ${await dateInput.inputValue().catch(() => "")} · ${hv}:${mv}` };
}

if (sched) {
  const set = await setReserve(sched);
  log(`RESERVE ${set.ok ? "ok" : "fail"} ${set.reason}`);
  if (!set.ok) await stop(ctx, page, 14, `예약 시각을 ${sched.label}로 맞추지 못했습니다(${set.reason}). 발행하지 않았습니다.`);
  await shot(page, "reserve-set");
}

if (dryRun) {
  log("DRY_RUN stop before the final button");
  await shot(page, "dry-run");
  warnings.forEach((w) => console.warn(`[${slug}] 주의 · ${w}`));
  console.log(`[${slug}] 검증 완료 · 발행하지 않았습니다. 제목, 문단 ${textBlocks.length}개, 이미지 ${imageTotal}장, 태그 ${wantTags.length}개를 편집기에서 확인했습니다${sched ? `. 예약 칸은 ${sched.label}로 맞췄습니다` : ""}. 입력한 글은 네이버 임시저장 목록에 남을 수 있습니다.`);
  await sleep(5000);
  await ctx.close().catch(() => {});
  process.exit(0);
}

// Final button in the settings layer. With 예약 on it is still labelled 발행.
async function clickFinal() {
  const started = Date.now();
  while (Date.now() - started < 90000) {
    for (const f of page.frames()) {
      const btn = f.locator('button[class^="confirm_btn__"]').first();
      if (await btn.count().catch(() => 0)) {
        await btn.click({ force: true }).catch(() => {});
        return (await btn.innerText().catch(() => "")).trim() || "confirm_btn";
      }
    }
    const f = await panelReady();
    const all = f?.getByRole("button", { name: "발행", exact: true });
    if (all && (await all.count().catch(() => 0)) > 1) {
      await all.last().click({ force: true }).catch(() => {});
      return "발행(last)";
    }
    await sleep(2000);
  }
  return "";
}
const clicked = await clickFinal();
if (!clicked) await stop(ctx, page, 11, "발행 설정 창의 마지막 발행 버튼을 찾지 못했습니다. 발행하지 않았습니다.");
log(`FINAL_CLICK ${clicked}`);
await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => {});
await sleep(8000);
await shot(page, "after-click");
const landed = page.url();
const logNo = (landed.match(/[?&]logNo=(\d+)/) || landed.match(/\/(\d{6,})(?:[/?#]|$)/) || [])[1] || "";
const marker = post.title.trim().slice(0, 20);

if (sched) {
  // After a reservation Naver also lands on PostList…&logNo=…&isAfterWrite=true, so the URL proves nothing.
  record({ url: blogUrl, scheduledAt: sched.label, verified: false }); // written first so a rerun can never schedule twice
  let found = null;
  for (let i = 0; i < 6 && !found; i++) {
    if (i) await sleep(5000);
    await page.goto(`https://blog.naver.com/PostList.naver?blogId=${blogId}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    found = (await reservations())?.rows.find((r) => r.title === squash(post.title)) || null;
  }
  await ctx.close().catch(() => {});
  record({ url: blogUrl, scheduledAt: sched.label, reservedAt: found?.at || "", logNo: found?.logNo || "", verified: Boolean(found && found.at === sched.label) });
  log(`VERIFY ${found ? `${found.at} ${found.logNo}` : "not found"}`);
  warnings.forEach((w) => console.warn(`[${slug}] 주의 · ${w}`));
  if (!found) {
    const res = await fetch(`https://rss.blog.naver.com/${blogId}.xml`, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }).catch(() => null);
    const publishedNow = Boolean(res?.ok && decode(await res.text()).includes(marker));
    console.error(publishedNow
      ? `[${slug}] 예약 목록에는 없고 공개 글에 올라왔습니다. 예약 대신 바로 발행된 것으로 보입니다. 다시 실행하지 말고 사람에게 알립니다(${blogUrl}).`
      : `[${slug}] 예약 버튼은 눌렀지만 예약 목록에서 제목을 확인하지 못했습니다. 다시 실행하지 말고 글쓰기 화면의 예약 발행 목록을 사람이 확인합니다(${blogUrl}).`);
    process.exit(9);
  }
  if (found.at !== sched.label) {
    console.error(`[${slug}] 예약은 됐지만 시각이 다릅니다(목표 ${sched.label} · 실제 ${found.at}). 다시 실행하지 말고 사람에게 알립니다.`);
    process.exit(9);
  }
  console.log(`[${slug}] 예약 완료 · ${sched.label} 발행 예정 · ${post.title}`);
  process.exit(0);
}

const url = logNo ? `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}` : blogUrl;
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
log(`VERIFY public=${verified}`);
warnings.forEach((w) => console.warn(`[${slug}] 주의 · ${w}`));
if (!verified) {
  console.error(`[${slug}] 발행 버튼은 눌렀지만 공개 글에서 제목을 확인하지 못했습니다. 다시 발행하지 말고 블로그(${url})를 사람이 확인합니다.`);
  process.exit(9);
}
console.log(`[${slug}] 발행 완료 · ${url}`);
process.exit(0);
