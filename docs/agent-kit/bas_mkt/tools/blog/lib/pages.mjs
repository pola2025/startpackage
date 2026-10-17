// Human-facing pages: facts.html (사실 카드 확인) and review.html (발행 전 검수).
import fs from "node:fs";
import path from "node:path";
import { esc } from "./text.mjs";

const BASE_CSS = `*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#111827;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;word-break:keep-all}
header{background:#fff;border-bottom:1px solid #e5e7eb;padding:20px 24px}header small{color:#6b7280}header h1{margin:6px 0 0;font-size:22px;line-height:1.4}
.box{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}.box h2{margin:0 0 10px;font-size:15px}
.hint{background:#fffbeb;border:1px solid #fde68a;color:#78350f;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.6}`;

export function writeFactsPage(postDir, facts, sources, notice) {
  const rows = (facts.items || [])
    .map(
      (it) => `<tr><th>${esc(it.key)}</th><td class="v">${esc(it.value)}</td><td><div class="q">${esc(it.quote)}</div></td></tr>`,
    )
    .join("");
  const ext = (sources || [])
    .map((s) => `<li><b>${esc(s.title)}</b> · ${esc(s.publisher)} · ${esc(s.date)}${(s.quotes || []).map((q) => `<div class="q">${esc(q)}</div>`).join("")}</li>`)
    .join("");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>사실 카드 · ${esc(facts.program)}</title>
<style>${BASE_CSS}
main{max-width:1080px;margin:20px auto;padding:0 16px 40px;display:grid;gap:16px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #eef0f3;padding:10px 8px;text-align:left;vertical-align:top}
thead th{background:#f8fafc;font-size:12px;color:#6b7280}tbody th{width:120px;white-space:nowrap}td.v{width:32%;font-weight:700;line-height:1.55}
.q{background:#f3f4f6;border-left:3px solid #9ca3af;border-radius:6px;padding:8px 10px;color:#374151;line-height:1.55;white-space:pre-wrap;margin-top:4px}
ul{margin:0;padding-left:18px;font-size:14px;line-height:1.6}li{margin-bottom:10px}
@media(max-width:720px){td.v{width:auto}table,thead,tbody,tr,th,td{display:block}thead{display:none}tbody th{border:0;padding-bottom:0}}</style></head>
<body><header><small>사실 카드 · 기업마당 ${esc(notice?.id || "")}</small><h1>${esc(facts.program)}</h1>
<small>${esc(facts.sourceLabel || "")}${notice?.period ? ` · 신청기간 ${esc(notice.period)}` : ""}</small></header>
<main>
<div class="hint">왼쪽 "글에 쓸 내용"이 오른쪽 "공고 원문"과 같은지 확인해 주세요. 같으면 Codex에게 <b>확인</b>이라고 답하고, 다르면 어느 항목이 어떻게 다른지 알려 주세요.</div>
<div class="box"><h2>공고에서 확인한 사실 ${(facts.items || []).length}개</h2><table><thead><tr><th>항목</th><th>글에 쓸 내용</th><th>공고 원문</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="box"><h2>글에 그대로 쓸 이름</h2><ul>${(facts.names || []).map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
${ext ? `<div class="box"><h2>공고 밖에서 가져온 자료 ${(sources || []).length}건</h2><ul>${ext}</ul></div>` : ""}
</main></body></html>`;
  fs.writeFileSync(path.join(postDir, "facts.html"), html);
  return path.join(postDir, "facts.html");
}

const CHECKLIST = [
  "사업명·기관명이 공고와 똑같은가",
  "금액·기간·비율이 사실 카드와 같은가",
  "표지와 카드 4장 문구가 본문 내용과 맞는가",
  "이미지 속 글자가 깨지거나 잘리지 않았는가",
  "CTA의 회사명·전화번호·주소가 맞는가",
];

export function writeReviewPage(postDir, post, report) {
  const imgs = post.blocks.filter((b) => b.image);
  const body = post.blocks
    .map((b) => (b.text ? `<p>${esc(b.text.trim())}</p>` : `<figure><img src="${esc(b.image)}" alt="">${b.link ? `<figcaption>클릭하면 이동: ${esc(b.link)}</figcaption>` : ""}</figure>`))
    .join("\n");
  const feed = (k) => imgs.slice(0, 5).map((b) => `<div class="cell ${k}"><img src="${esc(b.image)}" alt=""></div>`).join("");
  const checks = report
    ? report.results.map((r) => `<li>${r.ok ? "✅" : "❌"} <b>${esc(r.name)}</b> ${esc(r.detail)}</li>`).join("") +
      (report.warnings || []).map((w) => `<li>⚠ ${esc(w)}</li>`).join("")
    : "<li>아직 check.mjs를 실행하지 않았습니다.</li>";
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>검수 · ${esc(post.title)}</title>
<style>${BASE_CSS}
.wrap{max-width:1180px;margin:20px auto;padding:0 16px 40px;display:flex;gap:20px;align-items:flex-start}
.phone{flex:none;width:390px;max-width:100%;background:#fff;border:8px solid #111827;border-radius:28px;overflow:hidden}
.phone h1{font-size:19px;line-height:1.4;margin:0;padding:18px 18px 12px;border-bottom:1px solid #eef0f3}
.post{padding:16px 18px}.post p{white-space:pre-line;font-size:15.5px;line-height:1.85;margin:0 0 18px;color:#1f2937}
.post figure{margin:0 0 18px}.post img{width:100%;display:block;border-radius:6px}figcaption{font-size:12px;color:#2563eb;margin-top:4px}.tags{color:#16794d;font-size:14px}
.side{flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:16px;position:sticky;top:12px}.side>*{min-width:0}
.feed{display:flex;gap:6px;overflow-x:auto}.cell{flex:none;overflow:hidden;border-radius:6px;background:#ddd}.cell img{width:100%;height:100%;object-fit:cover;object-position:center}
.s1{width:126px;height:104px}.s2{width:189px;height:156px}
ul.r{list-style:none;margin:0;padding:0;font-size:14px;line-height:1.7}
label{display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.6;margin:4px 0}
@media(max-width:860px){.wrap{flex-direction:column}.side{position:static;width:100%}.phone{margin:0 auto}}</style></head>
<body><header><small>발행 전 검수 · ${esc(path.basename(postDir))}</small><h1>${esc(post.title)}</h1>
<small>이미지 ${imgs.length}장 · 문단 ${post.blocks.length - imgs.length}개 · 태그 ${(post.tags || []).length}개</small></header>
<div class="wrap">
<div class="phone"><h1>${esc(post.title)}</h1><div class="post">${body}<p class="tags">${(post.tags || []).map((t) => `#${esc(String(t).replace(/^#/, ""))}`).join(" ")}</p></div></div>
<div class="side">
<div class="hint">아래 체크리스트로 확인한 뒤, 이대로 올리려면 Codex에게 <b>발행</b>이라고 답해 주세요. 고칠 곳이 있으면 어느 이미지·문단인지 알려 주세요.</div>
<div class="box"><h2>앞 5칸 미리보기 (네이버 피드)</h2><div class="feed">${feed("s1")}</div><div class="feed" style="margin-top:8px">${feed("s2")}</div></div>
<div class="box"><h2>발행 전 체크리스트</h2>${CHECKLIST.map((c) => `<label><input type="checkbox"> ${esc(c)}</label>`).join("")}</div>
<div class="box"><h2>자동 검사 결과</h2><ul class="r">${checks}</ul></div>
</div></div></body></html>`;
  fs.writeFileSync(path.join(postDir, "review.html"), html);
  return path.join(postDir, "review.html");
}
