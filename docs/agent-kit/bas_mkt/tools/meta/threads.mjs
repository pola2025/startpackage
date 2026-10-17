// Threads: today's posts written to the CEO's concept, posted one per run while the PC is on (4 runs a day).
//   node threads.mjs add <글파일.json>   → checks the rules and adds posts to .private\threads-queue.json
//   node threads.mjs run                → posts the next queued post (called by the scheduled tasks)
//   node threads.mjs status             → queue size, last posts, token expiry
//   node threads.mjs refresh            → refreshes the 60-day token when 30 days or less remain
// <글파일.json>: [{ "parts": ["첫 글", "추가 글", "추가 글"], "topic": "정책자금" }, …]
// Exit codes: 0 ok · 2 token missing · 8 duplicate · 9 posted but readback failed · 10 rule error · 11 API error · 13 another run active · 15 queue empty (nothing posted) · 64 usage
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, THREADS, KEYS, readEnv, writeEnvKey, makeApi, sha, norm, readJsonl, appendJsonl, writeJsonAtomic, takeLock, logLine } from "./lib.mjs";

const files = (root) => ({
  queue: path.join(root, ".private", "threads-queue.json"),
  ledger: path.join(root, ".private", "logs", "threads-published.jsonl"),
  token: path.join(root, ".private", "threads-token.json"),
});
const readQueue = (root) => {
  const f = files(root).queue;
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
};
const postHash = (parts) => sha(parts.map(norm).join("\n---\n"));
// Korean calendar day (posts are set up for the day they go out).
export const kstDay = (ms = Date.now()) => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);

// Rules from the 탑정책자금센터 concept: polite information, no consultation pitch, no links, no company name.
const POLITE = /(?:니다|세요|십시오|습니까|나요|까요|죠|요)[.!?…"」)]*$/;
const BANNED = [
  [/https?:\/\/|www\.|\.(com|co\.kr|kr|net)\b/i, "링크·주소"],
  [/프로필.{0,5}링크|링크.{0,5}(클릭|확인)/, "링크 안내"],
  [/궁금하면|궁금하신 분|상담.{0,5}(남기|신청|받으|문의)|무료.{0,4}상담|DM|디엠|댓글.{0,4}(남겨|주시)/i, "상담·문의 권유"],
  [/해드립니다|다 해줍니다|100%|무조건|보장/, "과장·약속 표현"],
];
export function checkThreadPost(item, { company = "" } = {}) {
  const errs = [];
  const parts = (item.parts || []).map((p) => String(p || "").trim()).filter(Boolean);
  if (!parts.length || parts.length > 3) errs.push(`글은 첫 글 1개와 추가 글 0~2개입니다(지금 ${parts.length}개).`);
  parts.forEach((p, i) => {
    const n = [...p].length;
    const label = i === 0 ? "첫 글" : `추가 글 ${i}`;
    if (n > 500) errs.push(`${label}: ${n}자 · 쓰레드는 한 글에 500자까지입니다.`);
    if (i === 0 && n < 40) errs.push(`${label}: ${n}자 · 정보가 담기도록 40자 이상 씁니다.`);
    for (const [re, what] of BANNED) if (re.test(p)) errs.push(`${label}: ${what}이 들어 있습니다.`);
    if (company && p.includes(company)) errs.push(`${label}: 회사명(${company})을 넣지 않습니다. 정보 전달형으로 씁니다.`);
    const lastLine = p.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).pop() || "";
    if (!POLITE.test(lastLine)) errs.push(`${label}: 존댓말로 끝내야 합니다: "…${lastLine.slice(-12)}"`);
  });
  if (item.image || item.link) errs.push("첫 글에는 이미지·링크를 넣지 않습니다. 검색·노출에 불리합니다.");
  if (item.topic && (String(item.topic).length > 50 || /[.&]/.test(item.topic))) errs.push("topic은 50자 이하이고 마침표·&를 쓰지 않습니다.");
  return { errs, parts };
}

export function addPosts({ root = ROOT, items, company = "", now = Date.now() }) {
  const queue = readQueue(root);
  const done = new Set(readJsonl(files(root).ledger).map((r) => r.hash));
  const have = new Set(queue.map((q) => q.hash));
  const report = [];
  let added = 0;
  items.forEach((item, i) => {
    const { errs, parts } = checkThreadPost(item, { company });
    const hash = postHash(parts);
    if (!errs.length && (done.has(hash) || have.has(hash))) errs.push("이미 올렸거나 대기열에 있는 글과 같습니다.");
    if (errs.length) return report.push(`${i + 1}번 글: ${errs.join(" / ")}`);
    queue.push({ hash, parts, topic: item.topic || "", day: kstDay(now), addedAt: new Date(now).toISOString() });
    have.add(hash);
    added++;
  });
  if (report.length) return { code: 10, msg: `규칙에 맞지 않는 글 ${report.length}개 · 하나도 넣지 않았습니다.\n${report.map((r) => ` - ${r}`).join("\n")}` };
  writeJsonAtomic(files(root).queue, queue);
  return { code: 0, msg: `오늘 올릴 글 ${added}개를 넣었습니다 · 대기 ${queue.length}개. PC가 켜져 있는 동안 정해진 시각에 한 개씩 올라갑니다.` };
}

async function publishPart(api, token, userId, text, extra, sleep) {
  const box = await api("POST", `${THREADS}/${userId}/threads`, { form: { media_type: "TEXT", text, ...extra, access_token: token } });
  await sleep(3000);
  return api("POST", `${THREADS}/${userId}/threads_publish`, { form: { creation_id: box.id, access_token: token } });
}

export async function runOnce({ api, env, root = ROOT, now = Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const token = env[KEYS.threads];
  if (!token) return { code: 2, msg: `.env에 ${KEYS.threads} 값이 없습니다.` };
  const release = takeLock("threads-run", root);
  if (!release) return { code: 13, msg: "다른 쓰레드 게시가 실행 중입니다." };
  const log = (m) => logLine("threads-run.log", m, root);
  try {
    const all = readQueue(root);
    const today = kstDay(now);
    const stale = all.filter((q) => q.day && q.day < today);
    if (stale.length) {
      writeJsonAtomic(files(root).queue, all.filter((q) => !stale.includes(q)));
      log(`지난 날짜 글 ${stale.length}개 건너뜀(게시 안 함)`);
    }
    const queue = all.filter((q) => !stale.includes(q));
    if (!queue.length) {
      log("대기 글 없음 · 게시 0건");
      return { code: 15, msg: `오늘 올릴 글이 없습니다${stale.length ? ` · 지난 날짜 글 ${stale.length}개는 올리지 않고 뺐습니다` : ""}. 같은 글을 반복하지 않고 게시를 멈췄습니다.` };
    }
    const item = queue[0];
    const ledger = readJsonl(files(root).ledger);
    const me = await api("GET", `${THREADS}/me`, { params: { fields: "id,username", access_token: token } });
    const recent = (await api("GET", `${THREADS}/${me.id}/threads`, { params: { fields: "id,text", limit: "25", access_token: token } })).data || [];
    if (ledger.some((r) => r.hash === item.hash) || recent.some((t) => norm(t.text) === norm(item.parts[0]))) {
      writeJsonAtomic(files(root).queue, queue.slice(1));
      log(`중복이라 건너뜀 ${item.hash.slice(0, 12)}`);
      return { code: 8, msg: "이미 올라간 글이라 대기열에서 빼고 이번 회차는 게시하지 않았습니다." };
    }
    const first = await publishPart(api, token, me.id, item.parts[0], item.topic ? { topic_tag: item.topic } : {}, sleep);
    let prev = first.id;
    for (const part of item.parts.slice(1)) prev = (await publishPart(api, token, me.id, part, { reply_to_id: prev }, sleep)).id;
    let permalink = "";
    try {
      permalink = (await api("GET", `${THREADS}/${first.id}`, { params: { fields: "permalink,text", access_token: token } })).permalink || "";
    } catch {}
    appendJsonl(files(root).ledger, { at: new Date().toISOString(), hash: item.hash, id: first.id, permalink, parts: item.parts.length });
    // Remove from the queue, then read it back to confirm the removal.
    writeJsonAtomic(files(root).queue, readQueue(root).filter((q) => q.hash !== item.hash));
    const left = readQueue(root);
    if (left.some((q) => q.hash === item.hash)) log(`대기열 제거 확인 실패 ${item.hash.slice(0, 12)}`);
    log(`게시 ${first.id} ${permalink} 남은 ${left.length}`);
    if (!permalink) return { code: 9, msg: `게시했지만 주소를 확인하지 못했습니다(id ${first.id}). 다시 실행하지 않습니다.` };
    return { code: 0, msg: `[쓰레드 게시] ${permalink} · 오늘 남은 글 ${left.length}개${left.length ? "" : " · 오늘 올릴 글을 모두 올렸습니다."}` };
  } catch (e) {
    log(`실패 ${e.code || e.status} ${e.message}`);
    return { code: 11, msg: `쓰레드 게시 실패(${e.code || e.status}): ${e.message}` };
  } finally {
    release();
  }
}

// The long-lived token lasts 60 days. Refresh when 30 days or less remain; a token must be at least 24 hours old.
export async function refreshToken({ api, env, root = ROOT, now = Date.now() }) {
  const token = env[KEYS.threads];
  if (!token) return { code: 2, msg: `.env에 ${KEYS.threads} 값이 없습니다.` };
  const f = files(root).token;
  const state = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  if (state.tokenHash !== sha(token)) {
    state.tokenHash = sha(token);
    state.firstSeen = new Date(now).toISOString();
    delete state.expiresAt;
    writeJsonAtomic(f, state);
  }
  if (state.expiresAt && Date.parse(state.expiresAt) - now > 30 * 86400000) return { code: 0, msg: `쓰레드 토큰 갱신 불필요 · 만료 ${state.expiresAt.slice(0, 10)}` };
  if (now - Date.parse(state.firstSeen) < 24 * 3600000) return { code: 0, msg: "쓰레드 토큰을 받은 지 24시간이 지나지 않아 내일 갱신합니다." };
  const r = await api("GET", "https://graph.threads.net/refresh_access_token", { params: { grant_type: "th_refresh_token", access_token: token } });
  if (!r.access_token || !(r.expires_in > 86400)) return { code: 11, msg: "쓰레드 토큰 갱신 응답이 올바르지 않습니다." };
  writeEnvKey(KEYS.threads, r.access_token, root);
  const expiresAt = new Date(now + r.expires_in * 1000).toISOString();
  writeJsonAtomic(f, { tokenHash: sha(r.access_token), firstSeen: new Date(now).toISOString(), expiresAt });
  logLine("threads-run.log", `토큰 갱신 · 만료 ${expiresAt}`, root);
  return { code: 0, msg: `쓰레드 토큰을 갱신했습니다 · 만료 ${expiresAt.slice(0, 10)}` };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const [cmd, arg] = process.argv.slice(2);
  const api = makeApi();
  const env = readEnv();
  let r;
  if (cmd === "add" && arg) {
    let items;
    try {
      items = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
    } catch (e) {
      console.error(`글 파일을 읽지 못했습니다: ${e.message}`);
      process.exit(10);
    }
    let company = "";
    try {
      company = JSON.parse(fs.readFileSync(path.join(ROOT, "brand.json"), "utf8")).company || "";
    } catch {}
    r = addPosts({ items: Array.isArray(items) ? items : [items], company });
  } else if (cmd === "run") {
    const t = await refreshToken({ api, env }).catch((e) => ({ code: 11, msg: `토큰 갱신 실패: ${e.message}` }));
    if (t.code) console.log(t.msg);
    r = await runOnce({ api, env: readEnv() });
  } else if (cmd === "refresh") {
    r = await refreshToken({ api, env }).catch((e) => ({ code: 11, msg: `토큰 갱신 실패: ${e.message}` }));
  } else if (cmd === "status") {
    const q = readQueue(ROOT);
    const last = readJsonl(files(ROOT).ledger).slice(-3);
    const tok = fs.existsSync(files(ROOT).token) ? JSON.parse(fs.readFileSync(files(ROOT).token, "utf8")) : {};
    r = { code: 0, msg: [`대기 ${q.length}개 · 토큰 만료 ${tok.expiresAt ? tok.expiresAt.slice(0, 10) : "아직 갱신 전"}`, ...last.map((l) => `최근 ${l.at.slice(0, 16)} ${l.permalink || l.id}`)].join("\n") };
  } else {
    console.error("사용법: node threads.mjs add <글파일.json> | run | status | refresh");
    process.exit(64);
  }
  console.log(r.msg);
  process.exit(r.code);
}
