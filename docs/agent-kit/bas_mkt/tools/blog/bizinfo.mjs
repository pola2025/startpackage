// Bizinfo (기업마당) collector.
//   node bizinfo.mjs list "<목록 주소>" [--pages 2] [--json]   공고 목록과 접수 상태
//   node bizinfo.mjs get "<공고 주소 또는 PBLN_번호>" <글폴더>   공고 요약·본문·첨부를 글폴더\source에 저장
import fs from "node:fs";
import path from "node:path";
import { extractText, htmlToText } from "./lib/extract.mjs";

const HOST = "https://www.bizinfo.go.kr";
const LIST_BASE = `${HOST}/sii/siia/selectSIIA200View.do`;
const VIEW_BASE = `${HOST}/sii/siia/selectSIIA200Detail.do`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const MAX_PAGES = 5; // one run reads at most 5 list pages (75 rows)
const MAX_FILES = 8; // attachments per announcement

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => s.replace(/\s+/g, " ").trim();

async function fetchBuf(url, tries = 2) {
  for (let n = 0; ; n++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Referer: `${HOST}/` }, signal: AbortSignal.timeout(30000) });
      if (res.status === 429) throw Object.assign(new Error("요청이 많아 기업마당이 잠시 막았습니다(429)."), { final: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { buf: Buffer.from(await res.arrayBuffer()), headers: res.headers };
    } catch (e) {
      if (e.final || n >= tries) throw e;
      await sleep(1500 * 2 ** n);
    }
  }
}
const fetchText = async (url) => (await fetchBuf(url)).buf.toString("utf8");

function kstToday() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

// 신청기간 → 접수중 / 접수예정 / 마감 / 상시
function status(period, today = kstToday()) {
  if (/소진|상시|수시|별도|공고문/.test(period) && !/\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/.test(period)) return "상시";
  const m = period.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return "확인 필요";
  if (today < m[1]) return "접수예정";
  if (today > m[2]) return "마감";
  return "접수중";
}

function parseList(html) {
  const rows = [];
  for (const tr of html.match(/<tr[\s>][\s\S]*?<\/tr>/g) || []) {
    const id = (tr.match(/pblancId=(PBLN_\d+)/) || [])[1];
    if (!id) continue;
    const tds = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map((td) => clean(htmlToText(td)));
    if (tds.length < 7) continue;
    const [no, field, title, period, ministry, agency, registered] = tds;
    rows.push({ no, field, title, period, ministry, agency, registered, id, url: `${VIEW_BASE}?pblancId=${id}`, status: status(period) });
  }
  return rows;
}

function pageUrl(url, page) {
  const u = new URL(url || LIST_BASE);
  if (!/selectSIIA200View|list\.do/.test(u.pathname)) throw new Error("기업마당 지원사업 목록 주소가 아닙니다.");
  if (/list\.do/.test(u.pathname)) return `${LIST_BASE}?rows=15&cpage=${page}`;
  u.searchParams.set("rows", "15");
  u.searchParams.set("cpage", String(page));
  return u.toString();
}

async function list(url, pages, asJson) {
  const all = [];
  for (let p = 1; p <= pages; p++) {
    const rows = parseList(await fetchText(pageUrl(url, p)));
    if (!rows.length) break;
    all.push(...rows);
    if (p < pages) await sleep(800);
  }
  if (!all.length) {
    console.error("목록에서 공고를 찾지 못했습니다. 주소를 확인합니다.");
    process.exit(30);
  }
  if (asJson) return console.log(JSON.stringify(all, null, 2));
  console.log(`기업마당 공고 ${all.length}건 (오늘 ${kstToday()} 기준 접수 상태)\n`);
  for (const r of all) console.log(`[${r.status}] ${r.id} | ${r.field} | ${r.title} | ${r.period} | ${r.ministry} · ${r.agency} | 등록 ${r.registered}`);
}

function field(html, label) {
  const re = new RegExp(`<span class="s_title">\\s*${label}\\s*</span>\\s*<div class="txt"[^>]*>([\\s\\S]*?)</div>`);
  const m = html.match(re);
  return m ? htmlToText(m[1]) : "";
}

function resolveId(target) {
  const m = String(target).match(/PBLN_\d+/);
  if (!m) throw new Error("공고 주소에서 PBLN_ 번호를 찾지 못했습니다.");
  return m[0];
}

const safeName = (s) => s.replace(/[\\/:*?"<>|]/g, "_").slice(-120);

async function get(target, postDir) {
  const id = resolveId(target);
  const url = `${VIEW_BASE}?pblancId=${id}`;
  const html = await fetchText(url);
  const title = clean(htmlToText((html.match(/<h2 class="title">([\s\S]*?)<\/h2>/) || [])[1] || ""));
  if (!title) {
    console.error(`[${id}] 공고 화면을 읽지 못했습니다. 주소를 브라우저로 열어 확인합니다.`);
    process.exit(31);
  }
  const notice = {
    id,
    url,
    title,
    ministry: clean(field(html, "소관부처·지자체")),
    agency: clean(field(html, "사업수행기관")),
    period: clean(field(html, "신청기간")),
    summary: field(html, "사업개요"),
    howToApply: field(html, "사업신청 방법"),
    contact: clean(field(html, "문의처")),
    hashtags: [...new Set((html.match(/>#([^<\s]+)</g) || []).map((t) => t.slice(2, -1)))],
    fetchedAt: new Date().toISOString(),
    files: [],
  };
  const src = path.join(postDir, "source");
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, "notice.html"), html);

  const listHtml = (html.match(/<div class="attached_file_list">([\s\S]*?)<\/ul>/) || [])[1] || "";
  const items = [...listHtml.matchAll(/<div class="file_name">([\s\S]*?)<\/div>[\s\S]*?fileDown\.do\?atchFileId=(FILE_\d+)&(?:amp;)?fileSn=(\d+)/g)].slice(0, MAX_FILES);
  const parts = [
    `# ${title}`,
    `출처: 기업마당 ${url}`,
    `소관부처·지자체: ${notice.ministry}`,
    `사업수행기관: ${notice.agency}`,
    `신청기간: ${notice.period}`,
    `사업개요:\n${notice.summary}`,
    `사업신청 방법:\n${notice.howToApply}`,
    `문의처: ${notice.contact}`,
  ];
  const unread = [];
  for (const [, rawName, fileId, sn] of items) {
    const name = clean(htmlToText(rawName));
    const file = path.join(src, safeName(name));
    try {
      const { buf } = await fetchBuf(`${HOST}/cmm/fms/fileDown.do?atchFileId=${fileId}&fileSn=${sn}`);
      fs.writeFileSync(file, buf);
      const text = (await extractText(buf, name)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
      notice.files.push({ name, saved: path.basename(file), chars: text.length });
      parts.push(`\n===== 첨부: ${name} =====\n${text}`);
    } catch (e) {
      notice.files.push({ name, saved: fs.existsSync(file) ? path.basename(file) : "", error: e.message });
      unread.push(`${name} (${e.message})`);
    }
    await sleep(500);
  }
  fs.writeFileSync(path.join(src, "notice.json"), JSON.stringify(notice, null, 2));
  fs.writeFileSync(path.join(src, "source.txt"), parts.join("\n\n") + "\n");
  const total = notice.files.reduce((n, f) => n + (f.chars || 0), 0);
  console.log(`[${id}] ${title}`);
  console.log(`신청기간 ${notice.period} · ${notice.ministry} · ${notice.agency}`);
  console.log(`첨부 ${notice.files.length}개 · 첨부 텍스트 ${total.toLocaleString()}자 → ${path.join(src, "source.txt")}`);
  if (unread.length) {
    console.log(`읽지 못한 첨부 ${unread.length}개:`);
    unread.forEach((u) => console.log(` - ${u}`));
    process.exit(32);
  }
  if (!items.length) console.log("첨부 공고문이 없습니다. 공고 요약만으로 글감이 부족할 수 있습니다.");
}

const [cmd, a1, a2] = process.argv.slice(2);
const opt = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
try {
  if (cmd === "list") await list(a1, Math.min(MAX_PAGES, Math.max(1, +opt("--pages", 1) || 1)), process.argv.includes("--json"));
  else if (cmd === "get" && a1 && a2) await get(a1, path.resolve(a2));
  else {
    console.error('사용법: node bizinfo.mjs list "<목록 주소>" [--pages 2] [--json]\n       node bizinfo.mjs get "<공고 주소 또는 PBLN_번호>" <글폴더>');
    process.exit(64);
  }
} catch (e) {
  console.error(`기업마당 요청 실패: ${e.message}`);
  process.exit(33);
}
