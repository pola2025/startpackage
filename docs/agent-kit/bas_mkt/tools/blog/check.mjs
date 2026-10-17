// Content gate for a post folder.
//   node check.mjs <글폴더> --facts   facts.json·sources.json 인용 대조 + facts.html
//   node check.mjs <글폴더>           전체 검사(사실·숫자·고유명사·리라이팅·분량·모바일 폭·구조·표현) + review.html 갱신
import fs from "node:fs";
import path from "node:path";
import { readJson, width, flat, squash, numbersIn, bodyTexts, bodyChars, LINE_MAX, PARAGRAPH_MAX_LINES, BODY_MIN_CHARS } from "./lib/text.mjs";
import { writeFactsPage, writeReviewPage } from "./lib/pages.mjs";
import { CHART_TYPES } from "./lib/parts.mjs";

const REWRITE_GRAM = 12; // characters (spaces, digits, names removed) that count as a copied phrase
const REWRITE_MAX = 0.2; // share of body characters inside copied phrases
const CARD_LINE_MAX = 7;
const COVER_LINE_MAX = 8;
const HEADING_MAX = 16;
const BANNED = [/보장/, /무조건/, /100\s*%\s*(승인|선정|지원|가능)/, /누구나\s*(받|신청|선정)/, /최대\s*혜택/, /선정\s*(확실|확정)/, /확정\s*지원/, /반드시\s*(선정|승인)/];

const postDir = process.argv[2] ? path.resolve(process.argv[2]) : "";
const factsOnly = process.argv.includes("--facts");
if (!postDir || !fs.existsSync(postDir)) {
  console.error("사용법: node check.mjs <글폴더> [--facts]");
  process.exit(64);
}
const slug = path.basename(postDir);
const srcDir = path.join(postDir, "source");

let facts, sources, notice;
try {
  facts = readJson(path.join(postDir, "facts.json"));
  sources = readJson(path.join(postDir, "sources.json"), []);
  notice = readJson(path.join(srcDir, "notice.json"), {});
} catch (e) {
  console.error(`[${slug}] ${e.message}`);
  process.exit(20);
}
const corpusFiles = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter((f) => f.endsWith(".txt")) : [];
const corpus = corpusFiles.map((f) => fs.readFileSync(path.join(srcDir, f), "utf8")).join("\n");
if (!corpus.trim()) {
  console.error(`[${slug}] source 폴더에 텍스트(.txt)가 없습니다. bizinfo.mjs get을 먼저 실행합니다.`);
  process.exit(20);
}
const corpusSq = squash(corpus);

const results = [];
const warnings = [];
const add = (name, code, errors, okDetail) => results.push({ name, code, ok: !errors.length, detail: errors.length ? errors.slice(0, 6).join(" / ") + (errors.length > 6 ? ` 외 ${errors.length - 6}건` : "") : okDetail, errors });

/* 1. 사실 대조: every quote must exist in the saved source text (whitespace-insensitive). */
{
  const e = [];
  if (!facts.program) e.push("facts.json의 program(사업명)이 비어 있습니다.");
  if (!Array.isArray(facts.names) || !facts.names.includes(facts.program)) e.push("names에 program(사업명)을 넣습니다.");
  if (!facts.sourceLabel) e.push("sourceLabel(차트·출처에 쓸 공고 이름)이 비어 있습니다.");
  if (!squash(corpus).includes(squash(facts.program || "@@"))) e.push(`사업명 "${facts.program}"이 공고 원문에 없습니다.`);
  (facts.items || []).forEach((it, i) => {
    if (!it.key || !it.value || !it.quote) e.push(`items[${i}]에 key·value·quote가 모두 있어야 합니다.`);
    else if (!corpusSq.includes(squash(it.quote))) e.push(`items[${i}] "${it.key}"의 quote가 공고 원문에 없습니다.`);
  });
  if ((facts.items || []).length < 5) e.push(`items가 ${(facts.items || []).length}개입니다. 공고의 대상·규모·내용·기간·방법을 5개 이상 넣습니다.`);
  if (!Array.isArray(sources)) e.push("sources.json은 배열이어야 합니다.");
  else
    sources.forEach((s, i) => {
      const f = s.file ? path.join(postDir, s.file) : "";
      if (!s.title || !s.publisher || !s.date) e.push(`sources[${i}]에 title·publisher·date가 있어야 합니다.`);
      if (!/^https:\/\//.test(s.url || "")) e.push(`sources[${i}].url은 https:// 주소여야 합니다.`);
      if (!f || !fs.existsSync(f)) return e.push(`sources[${i}].file(${s.file || "없음"})이 없습니다.`);
      const txt = squash(fs.readFileSync(f, "utf8"));
      (s.quotes || []).forEach((q, k) => !txt.includes(squash(q)) && e.push(`sources[${i}].quotes[${k}]가 ${s.file}에 없습니다.`));
    });
  add("사실 대조", 20, e, `사실 ${(facts.items || []).length}개·외부 자료 ${(sources || []).length}건 모두 원문과 일치`);
}

if (factsOnly) {
  const r = results[0];
  if (!r.ok) {
    console.error(`[${slug}] 사실 카드 오류 ${r.errors.length}건`);
    r.errors.forEach((x) => console.error(` - ${x}`));
    process.exit(20);
  }
  const file = writeFactsPage(postDir, facts, sources, notice);
  console.log(`[${slug}] 사실 카드 통과 · ${(facts.items || []).length}개 항목 · ${file}`);
  process.exit(0);
}

let plan, post;
try {
  plan = readJson(path.join(postDir, "plan.json"));
  post = readJson(path.join(postDir, "post.json"));
} catch (e) {
  console.error(`[${slug}] ${e.message} build.mjs를 먼저 실행합니다.`);
  process.exit(22);
}
if (fs.statSync(path.join(postDir, "plan.json")).mtimeMs > fs.statSync(path.join(postDir, "post.json")).mtimeMs) {
  console.error(`[${slug}] plan.json이 post.json보다 새것입니다. build.mjs를 다시 실행합니다.`);
  process.exit(22);
}

const body = bodyTexts(plan);
const chartTexts = (ch) => [ch.title, ch.unit, ch.note, ...(ch.items || []).flat().flatMap((x) => (typeof x === "object" ? Object.values(x) : [x])), ...(ch.rows || []).flat(), ...(ch.steps || []).flatMap((s) => [s.label, s.value])].filter((x) => x !== undefined && x !== null).map(String);
const allTexts = [
  ["제목", plan.title],
  ["표지", [...(plan.cover?.lines || []), ...(plan.cover?.accent || []), plan.cover?.sub || ""].join(" ")],
  ...(plan.cards || []).map((c, i) => [`카드 ${i + 1}`, [c.label, ...(c.lines || [])].join(" ")]),
  ...(plan.sections || []).flatMap((s, i) => [[`소제목 ${i + 1}`, s.heading], ...(s.blocks || []).filter((b) => b.chart).map((b, k) => [`섹션 ${i + 1} 차트 ${k + 1}`, chartTexts(b.chart).join(" ")])]),
  ...body,
];

/* 2. 숫자: every number must appear in the source text. */
{
  const e = [];
  const corpusNums = corpus.replace(/,(?=\d{3}\b)/g, "");
  for (const [where, t] of allTexts) {
    for (const n of new Set(numbersIn(t))) {
      const re = new RegExp(`(?<![\\d.])${n.replace(/\./g, "\\.")}(?![\\d])`);
      if (!re.test(corpusNums)) e.push(`${where}: "${n}"이(가) 공고·출처 원문에 없습니다`);
    }
  }
  add("숫자", 20, e, "원고의 모든 숫자가 원문에 있음");
}

/* 3. 고유명사: program verbatim at least once; names never re-spaced. */
{
  const e = [];
  const all = flat(allTexts.map(([, t]) => t).join(" "));
  if (!all.includes(flat(facts.program || ""))) e.push(`사업명 "${facts.program}"을 본문이나 제목에 원문 그대로 한 번 이상 씁니다`);
  for (const name of facts.names || []) {
    const exact = all.split(flat(name)).length - 1;
    const loose = squash(all).split(squash(name)).length - 1;
    if (loose > exact) e.push(`"${name}"의 띄어쓰기·표기가 바뀐 곳이 있습니다`);
  }
  add("고유명사", 20, e, `사업명·기관명 ${(facts.names || []).length}개 원문 표기 유지`);
}

/* 4. 리라이팅: share of body characters that sit inside a 12-char phrase copied from the source. */
{
  const strip = (s) => {
    let x = s;
    for (const n of [...(facts.names || [])].sort((a, b) => b.length - a.length)) x = x.split(n).join(" ");
    return x.replace(/[^\p{L}]/gu, "");
  };
  const src = strip(corpus);
  const grams = new Set();
  for (let i = 0; i + REWRITE_GRAM <= src.length; i++) grams.add(src.slice(i, i + REWRITE_GRAM));
  const mine = strip(body.map(([, t]) => t).join(" "));
  const hit = new Uint8Array(mine.length);
  for (let i = 0; i + REWRITE_GRAM <= mine.length; i++) if (grams.has(mine.slice(i, i + REWRITE_GRAM))) hit.fill(1, i, i + REWRITE_GRAM);
  const ratio = mine.length ? hit.reduce((a, b) => a + b, 0) / mine.length : 0;
  const runs = [];
  for (let i = 0; i < hit.length; ) {
    if (!hit[i]) { i++; continue; }
    let j = i;
    while (j < hit.length && hit[j]) j++;
    runs.push(mine.slice(i, j));
    i = j;
  }
  runs.sort((a, b) => b.length - a.length);
  const pct = (Math.ceil(ratio * 1000) / 10).toFixed(1);
  add("리라이팅", 21, ratio > REWRITE_MAX ? [`원문과 겹치는 구절이 ${pct}%입니다(기준 ${REWRITE_MAX * 100}% 이하). 가장 긴 겹침: "${runs.slice(0, 3).map((r) => r.slice(0, 24)).join('", "')}"`] : [], `원문과 겹치는 구절 ${pct}%`);
  if (ratio <= REWRITE_MAX && runs[0]?.length > 30) warnings.push(`원문과 길게 겹치는 구절이 있습니다: "${runs[0].slice(0, 30)}…"`);
}

/* 5. 분량 */
{
  const n = bodyChars(plan);
  add("분량", 22, n < BODY_MIN_CHARS ? [`본문 ${n.toLocaleString()}자입니다. ${BODY_MIN_CHARS.toLocaleString()}자 이상(공백 포함) 필요`] : [], `본문 ${n.toLocaleString()}자`);
}

/* 6. 모바일 폭 */
{
  const e = [];
  // Check the final post.json text: the same text publish.mjs uploads, including the sources paragraph.
  const finalTexts = post.blocks.filter((b) => b.text).map((b) => [body.find(([, t]) => t.trim() === b.text.trim())?.[0] || "출처 문단", b.text]);
  for (const [where, t] of finalTexts) {
    if (/https?:\/\//i.test(t)) e.push(`${where}: 본문에 주소를 넣지 않습니다`);
    let run = 0, blanks = 0;
    t.replace(/\r/g, "").trim().split("\n").forEach((line, n) => {
      if (!line.trim()) { blanks++; run = 0; if (blanks > 1) e.push(`${where} ${n + 1}줄: 빈 줄은 한 줄만`); return; }
      blanks = 0; run++;
      if (width(line) > LINE_MAX) e.push(`${where} ${n + 1}줄: 한글 ${LINE_MAX}자 초과 "${line.slice(0, 16)}…"`);
      if (run === PARAGRAPH_MAX_LINES + 1) e.push(`${where} ${n + 1}줄: 빈 줄 없이 ${PARAGRAPH_MAX_LINES}줄 초과`);
    });
  }
  add("모바일 폭", 22, e, `한 줄 ${LINE_MAX}자 이하 · 문단 ${PARAGRAPH_MAX_LINES}줄 이하`);
}

/* 7. 구조 */
{
  const e = [];
  const cards = plan.cards || [], secs = plan.sections || [];
  if (cards.length !== 4) warnings.push(`카드 ${cards.length}장 · 권장은 4장입니다(피드 미리보기 5칸 = 표지 + 카드 4장)`);
  cards.forEach((c, i) => {
    if ((c.lines || []).length !== 2) e.push(`카드 ${i + 1}: lines는 2줄`);
    (c.lines || []).forEach((l) => width(l) > CARD_LINE_MAX && e.push(`카드 ${i + 1}: "${l}" ${CARD_LINE_MAX}자 초과`));
    if (!c.label || [...c.label].length > 6) e.push(`카드 ${i + 1}: label은 1~6자`);
    if (!c.text) e.push(`카드 ${i + 1}: 뒤 문단(text)이 없습니다`);
  });
  const coverLines = [...(plan.cover?.lines || []), ...(plan.cover?.accent || [])];
  if (!coverLines.length || coverLines.length > 4) e.push("표지 lines+accent는 1~4줄");
  coverLines.forEach((l) => width(l) > COVER_LINE_MAX && e.push(`표지 "${l}" ${COVER_LINE_MAX}자 초과`));
  if (!secs.length) e.push("소제목(sections)이 없습니다");
  else if (secs.length !== 7) warnings.push(`소제목 ${secs.length}개 · 권장은 7개입니다`);
  secs.forEach((s, i) => {
    if (!s.heading || [...s.heading].length > HEADING_MAX) e.push(`소제목 ${i + 1}: 1~${HEADING_MAX}자`);
    if (/(는지|인지|을지|ㄹ지)\s*$/.test(s.heading || "")) e.push(`소제목 ${i + 1}: "~는지/~인지"로 끝내지 않습니다`);
    if (!(s.blocks || []).some((b) => b.text)) e.push(`섹션 ${i + 1}: 문단이 없습니다`);
  });
  const photoNums = new Set(secs.flatMap((s) => (s.blocks || []).filter((b) => b.photo).map((b) => b.photo)));
  if (photoNums.size < 4 || photoNums.size > 5) warnings.push(`실사 ${photoNums.size}장 · 권장은 4~5장입니다`);
  const charts = secs.flatMap((s) => (s.blocks || []).filter((b) => b.chart).map((b) => b.chart));
  if (charts.length < 2) warnings.push(`차트 ${charts.length}개 · 권장은 2개 이상입니다`);
  charts.forEach((c, i) => !CHART_TYPES.includes(c.type) && e.push(`차트 ${i + 1}: 종류 "${c.type}"`));
  const tags = plan.tags || [];
  if (tags.length < 5 || tags.length > 10) e.push(`태그 ${tags.length}개(5~10개)`);
  if (!(plan.sources || []).length) e.push("sources(출처)가 비어 있습니다");
  // final block order from post.json
  const kinds = post.blocks.map((b) => (b.text ? "text" : (b.image.match(/-(cover|card|band|photo|chart|cta)/) || [])[1] || "image"));
  kinds.forEach((k, i) => i && k !== "text" && kinds[i - 1] !== "text" && e.push(`${i}·${i + 1}번째 블록: 이미지끼리 붙어 있습니다`));
  const imgs = kinds.filter((k) => k !== "text");
  if (imgs[0] !== "cover") e.push("1번 이미지는 표지여야 합니다");
  if (imgs.slice(1, 1 + cards.length).some((k) => k !== "card")) e.push("카드는 표지 바로 다음에 놓아야 합니다");
  if (imgs.at(-1) !== "cta" || kinds.at(-1) !== "cta") e.push("CTA가 맨 아래가 아닙니다");
  for (const b of post.blocks) if (b.image && !fs.existsSync(path.join(postDir, b.image))) e.push(`${b.image} 파일이 없습니다`);
  const rr = readJson(path.join(postDir, "out", "render-report.json"), { report: {} });
  for (const [file, r] of Object.entries(rr.report)) for (const [key, v] of Object.entries(r)) {
    if (v.overflow) e.push(`${file}: 글자가 칸을 넘칩니다(${key})`);
    else if ((key === "cover" || key === "card") && v.size < 100) warnings.push(`${file}: 글자 ${v.size}px · 피드 미리보기에서 작게 보입니다`);
  }
  add("구조", 22, e, `이미지 ${imgs.length}장(카드 ${cards.length}·소제목 ${secs.length}·실사 ${photoNums.size}·차트 ${charts.length}) · CTA 맨 아래`);

  // warnings: card wording should come from its section
  cards.forEach((c, i) => {
    const sec = secs[(c.section || 0) - 1];
    if (!sec) return warnings.push(`카드 ${i + 1}: section(근거 섹션 번호)이 없습니다`);
    const secText = squash([c.text, ...(sec.blocks || []).map((b) => b.text || "")].join(" "));
    const words = (c.lines || []).join(" ").split(/\s+/).filter((w) => /[가-힣]{2}/.test(w));
    const found = words.filter((w) => secText.includes(w.replace(/[^가-힣]/g, "").slice(0, 2))).length;
    if (words.length && found / words.length < 0.5) warnings.push(`카드 ${i + 1} 문구가 근거 섹션 본문 표현과 다릅니다`);
  });
  // warnings: opening sentence shared with another post
  const first = flat(plan.lead || "").split(/[.?!]/)[0];
  const postsDir = path.dirname(postDir);
  for (const other of fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : []) {
    if (other === slug) continue;
    const op = readJson(path.join(postsDir, other, "plan.json"), null);
    if (op && first && flat(op.lead || "").split(/[.?!]/)[0].slice(0, 12) === first.slice(0, 12)) warnings.push(`첫 문장이 다른 글(${other})과 같습니다`);
  }
}

/* 8. 표현 */
{
  const e = [];
  const names = (facts.names || []).join(" ");
  for (const [where, t] of allTexts) for (const re of BANNED) {
    const m = String(t).match(re);
    if (m && !names.includes(m[0])) e.push(`${where}: "${m[0]}" 같은 단정·과장 표현`);
  }
  add("표현", 22, e, "단정·과장 표현 없음");
}

const report = { at: new Date().toISOString(), results: results.map(({ errors, ...r }) => r), warnings };
fs.writeFileSync(path.join(postDir, "check-report.json"), JSON.stringify({ ...report, errors: results.flatMap((r) => r.errors.map((x) => `${r.name}: ${x}`)) }, null, 2));
const review = writeReviewPage(postDir, post, report);

const failed = results.filter((r) => !r.ok);
console.log(`[${slug}] 검사 ${failed.length ? `실패 ${failed.length}개` : "통과"}`);
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.name}: ${r.ok ? r.detail : ""}`);
  if (!r.ok) r.errors.forEach((x) => console.log(`   - ${x}`));
}
warnings.forEach((w) => console.log(`⚠ ${w}`));
console.log(`검수 화면: ${review}`);
process.exit(failed.length ? Math.min(...failed.map((r) => r.code)) : 0);
