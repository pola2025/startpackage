// Posts one SNS folder to Instagram and the Facebook Page at the same time.
//   node publish.mjs <게시폴더> --check     → validates sizes and caption, writes review.html (no network)
//   node publish.mjs <게시폴더> --dry-run   → uploads to the Page unpublished and prepares the Instagram container, publishes nothing
//   node publish.mjs <게시폴더>             → publishes (only after the person answered "게시")
// <게시폴더>\sns.json: { "type": "carousel" | "image" | "reels", "files": ["cards/01.png", …], "caption": "…" }
// Images: uploaded to the Page unpublished first; the Page's image URL is handed to Instagram, so no extra hosting is needed.
// Reels: Instagram resumable upload from the local file; the Page gets the same video.
// Exit codes: 0 ok · 2 token/accounts missing · 8 already posted · 9 posted but readback failed (do not rerun)
//   · 10 format error · 11 API error before anything went public · 12 Instagram posted, Page post failed (do not rerun) · 13 another run is active · 64 usage
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, GRAPH, GRAPH_VIDEO, KEYS, readEnv, makeApi, ApiError, sha, fileSha, norm, readJsonl, appendJsonl, takeLock, logLine, checkMedia, captionIssues } from "./lib.mjs";

const LEDGER = (root) => path.join(root, ".private", "logs", "meta-published.jsonl");

export function loadPost(dir) {
  const file = path.join(dir, "sns.json");
  if (!fs.existsSync(file)) return { errors: [`${file}이 없습니다.`] };
  let post;
  try {
    post = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    return { errors: [`sns.json을 읽지 못했습니다: ${e.message}`] };
  }
  const errors = [], warnings = [];
  if (!["carousel", "image", "reels"].includes(post.type)) errors.push('type은 "carousel", "image", "reels" 중 하나입니다.');
  const files = (post.files || []).map((f) => path.resolve(dir, f));
  if (post.type === "carousel" && (files.length < 2 || files.length > 10)) errors.push(`캐러셀은 이미지 2~10장입니다(지금 ${files.length}장).`);
  if (post.type !== "carousel" && files.length !== 1) errors.push(`${post.type}은 파일 1개입니다(지금 ${files.length}개).`);
  for (const f of files) {
    const r = checkMedia(f, post.type === "reels" ? "reels" : "image");
    if (!r.ok) errors.push(r.msg);
    else if (r.warn) warnings.push(r.warn);
    if (post.type !== "reels" && /\.(mp4|mov)$/i.test(f)) errors.push(`${path.basename(f)}: 영상은 type "reels"로 올립니다.`);
  }
  const cap = captionIssues(post.caption);
  errors.push(...cap.errors);
  warnings.push(...cap.warnings);
  const hash = errors.length ? "" : sha(JSON.stringify({ caption: norm(post.caption), files: files.map(fileSha) }));
  return { post, files, errors, warnings, hash };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function writeReview(dir, { post, files, errors, warnings }) {
  const media = files
    .map((f) => {
      const rel = path.relative(dir, f).replace(/\\/g, "/");
      return /\.(mp4|mov)$/i.test(f) ? `<video src="${esc(rel)}" controls muted></video>` : `<img src="${esc(rel)}" alt="">`;
    })
    .join("");
  const list = (arr, cls) => arr.map((t) => `<li class="${cls}">${esc(t)}</li>`).join("");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>SNS 게시 전 검수</title><style>
body{margin:0;background:#eef1f5;font-family:"Malgun Gothic",sans-serif;color:#1f2937}
.wrap{display:flex;gap:28px;padding:28px;align-items:flex-start;flex-wrap:wrap}
.phone{width:360px;background:#fff;border-radius:22px;box-shadow:0 8px 30px rgba(0,0,0,.12);overflow:hidden}
.head{padding:12px 14px;font-weight:700;font-size:14px;border-bottom:1px solid #eee}
.media{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.media img,.media video{width:360px;flex:none;scroll-snap-align:start;display:block}
.cap{padding:12px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:keep-all}
.side{flex:1;min-width:300px;max-width:560px}.box{background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:14px}
h2{font-size:15px;margin:0 0 10px}li{margin:6px 0;font-size:14px}.err{color:#b91c1c}.warn{color:#b45309}.ok{color:#047857}
label{display:block;margin:8px 0;font-size:14px}</style></head><body><div class="wrap">
<div class="phone"><div class="head">미리보기 · ${esc(post.type)} · ${files.length}개</div><div class="media">${media}</div><div class="cap">${esc(post.caption || "")}</div></div>
<div class="side"><div class="box"><h2>자동 검사</h2><ul>${errors.length || warnings.length ? list(errors, "err") + list(warnings, "warn") : '<li class="ok">크기·캡션 검사를 통과했습니다.</li>'}</ul></div>
<div class="box"><h2>게시 전 체크리스트</h2>
<label><input type="checkbox"> 이미지·영상 속 글자가 잘리거나 깨지지 않았다</label>
<label><input type="checkbox"> 캡션이 모바일 폭에서 문단으로 읽힌다(문장 덩어리 아님)</label>
<label><input type="checkbox"> 사업명·금액·기간이 원문과 같다</label>
<label><input type="checkbox"> 회사명·전화번호가 맞다</label>
<p style="font-size:13px;color:#6b7280">인스타그램과 페이스북 페이지에 같은 내용이 함께 올라갑니다. 이대로 올리려면 Codex에게 <b>게시</b>라고 답합니다.</p></div></div></div></body></html>`;
  const out = path.join(dir, "review.html");
  fs.writeFileSync(out, html);
  return out;
}

export async function pageToken(api, metaToken, pageId) {
  const pages = (await api("GET", `${GRAPH}/me/accounts`, { token: metaToken, params: { fields: "id,access_token", limit: "100" } })).data || [];
  const p = pages.find((x) => x.id === pageId);
  if (!p?.access_token) throw new ApiError(400, { error: { message: "페이지 접근 토큰을 받지 못했습니다. node check.mjs를 다시 실행합니다." } });
  return p.access_token;
}

async function waitReady(api, token, id, { tries = 40, every = 3000, sleep }) {
  for (let i = 0; i < tries; i++) {
    const s = (await api("GET", `${GRAPH}/${id}`, { token, params: { fields: "status_code" } })).status_code;
    if (s === "FINISHED") return;
    if (s === "ERROR" || s === "EXPIRED") throw new ApiError(400, { error: { message: `인스타그램 미디어 준비 실패(${s})` } });
    await sleep(every);
  }
  throw new ApiError(408, { error: { message: "인스타그램 미디어 준비가 끝나지 않았습니다." } });
}

export async function publishSns({ api, fetchImpl = globalThis.fetch, env, accounts, dir, root = ROOT, dryRun = false, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const loaded = loadPost(dir);
  if (loaded.errors.length) return { code: 10, msg: `형식 오류 ${loaded.errors.length}건\n${loaded.errors.map((e) => ` - ${e}`).join("\n")}` };
  const { post, files, hash } = loaded;
  const metaToken = env[KEYS.meta];
  if (!metaToken || !accounts?.page?.id || !accounts?.instagram?.id) return { code: 2, msg: "토큰이나 계정 정보가 없습니다. node check.mjs를 먼저 실행합니다." };
  const ig = accounts.instagram.id, pageId = accounts.page.id;

  // Duplicate guard: local ledger first, then the account's recent posts.
  if (readJsonl(LEDGER(root)).some((r) => r.hash === hash)) return { code: 8, msg: "이미 올린 게시물입니다(게시 기록에 같은 내용이 있습니다)." };
  const recent = (await api("GET", `${GRAPH}/${ig}/media`, { token: metaToken, params: { fields: "id,caption,permalink", limit: "25" } })).data || [];
  const same = recent.find((m) => norm(m.caption) && norm(m.caption) === norm(post.caption));
  if (same) return { code: 8, msg: `같은 캡션의 게시물이 이미 인스타에 있습니다: ${same.permalink}` };

  const release = takeLock("meta-publish", root);
  if (!release) return { code: 13, msg: "다른 게시 작업이 실행 중입니다." };
  const log = (m) => logLine("meta-publish.log", `[${path.basename(dir)}] ${m}`, root);
  try {
    const pToken = await pageToken(api, metaToken, pageId);
    let igMedia, pagePost;

    if (post.type === "reels") {
      const file = files[0];
      const size = fs.statSync(file).size;
      const box = await api("POST", `${GRAPH}/${ig}/media`, { token: metaToken, form: { media_type: "REELS", upload_type: "resumable", caption: post.caption, share_to_feed: "true" } });
      const up = await fetchImpl(box.uri, { method: "POST", headers: { Authorization: `OAuth ${metaToken}`, offset: "0", file_size: String(size) }, body: fs.readFileSync(file) });
      if (!up.ok) throw new ApiError(up.status, { error: { message: `영상 업로드 실패(HTTP ${up.status})` } });
      log(`IG reels uploaded container=${box.id}`);
      await waitReady(api, metaToken, box.id, { tries: 60, every: 10000, sleep });
      if (dryRun) return { code: 0, msg: `[검증 모드] 인스타 릴스 준비까지 확인했습니다(컨테이너 ${box.id}). 게시하지 않았습니다.` };
      igMedia = await api("POST", `${GRAPH}/${ig}/media_publish`, { token: metaToken, form: { creation_id: box.id } });
      log(`IG published ${igMedia.id}`);
      try {
        const fd = new FormData();
        fd.set("source", await fs.openAsBlob(file), path.basename(file));
        fd.set("description", post.caption);
        fd.set("access_token", pToken);
        pagePost = await api("POST", `${GRAPH_VIDEO}/${pageId}/videos`, { form: fd });
      } catch (e) {
        pagePost = { error: e.message };
      }
    } else {
      // 1) Page: upload every image unpublished and read back its image URL.
      const photos = [];
      for (const f of files) {
        const fd = new FormData();
        fd.set("source", await fs.openAsBlob(f), path.basename(f));
        fd.set("published", "false");
        fd.set("access_token", pToken);
        const up = await api("POST", `${GRAPH}/${pageId}/photos`, { form: fd });
        const info = await api("GET", `${GRAPH}/${up.id}`, { params: { fields: "images", access_token: pToken } });
        const best = (info.images || []).sort((a, b) => b.width - a.width)[0];
        if (!best?.source) throw new ApiError(400, { error: { message: "페이지에 올린 이미지 주소를 받지 못했습니다." } });
        photos.push({ id: up.id, url: best.source });
      }
      log(`page photos uploaded unpublished: ${photos.length}`);

      // 2) Instagram: containers from the Page image URLs.
      let creation;
      try {
        if (post.type === "image") {
          creation = (await api("POST", `${GRAPH}/${ig}/media`, { token: metaToken, form: { image_url: photos[0].url, caption: post.caption } })).id;
        } else {
          const children = [];
          for (const p of photos) children.push((await api("POST", `${GRAPH}/${ig}/media`, { token: metaToken, form: { image_url: p.url, is_carousel_item: "true" } })).id);
          for (const c of children) await waitReady(api, metaToken, c, { sleep });
          creation = (await api("POST", `${GRAPH}/${ig}/media`, { token: metaToken, form: { media_type: "CAROUSEL", children: children.join(","), caption: post.caption } })).id;
        }
        await waitReady(api, metaToken, creation, { sleep });
      } catch (e) {
        log(`IG container failed from page image URL: ${e.code || e.status} ${e.message}`);
        throw new ApiError(e.status, { error: { message: `인스타가 페이지 이미지 주소로 게시물을 준비하지 못했습니다: ${e.message}` } });
      }
      if (dryRun) return { code: 0, msg: `[검증 모드] 페이지 비공개 업로드 ${photos.length}장과 인스타 게시 준비까지 확인했습니다. 게시하지 않았습니다.` };
      igMedia = await api("POST", `${GRAPH}/${ig}/media_publish`, { token: metaToken, form: { creation_id: creation } });
      log(`IG published ${igMedia.id}`);

      // 3) Page post with the same images.
      try {
        pagePost = await api("POST", `${GRAPH}/${pageId}/feed`, { form: { message: post.caption, attached_media: photos.map((p) => ({ media_fbid: p.id })), access_token: pToken } });
      } catch (e) {
        pagePost = { error: e.message };
      }
    }

    // Readback: both channels must show the post.
    let igLink = "", pageLink = "";
    try {
      const m = await api("GET", `${GRAPH}/${igMedia.id}`, { token: metaToken, params: { fields: "permalink,caption" } });
      if (norm(m.caption) === norm(post.caption)) igLink = m.permalink || "";
    } catch {}
    if (pagePost?.id) {
      try {
        pageLink = (await api("GET", `${GRAPH}/${pagePost.post_id || pagePost.id}`, { params: { fields: "permalink_url", access_token: pToken } })).permalink_url || "";
      } catch {}
    }
    appendJsonl(LEDGER(root), { at: new Date().toISOString(), hash, folder: path.basename(dir), type: post.type, instagram: { id: igMedia.id, permalink: igLink }, page: pagePost?.id ? { id: pagePost.post_id || pagePost.id, permalink: pageLink } : { error: pagePost?.error || "" } });
    if (!pagePost?.id) return { code: 12, msg: `인스타에는 올라갔지만 페이지 게시가 실패했습니다: ${pagePost?.error || ""}\n인스타: ${igLink || igMedia.id}` };
    if (!igLink || !pageLink) return { code: 9, msg: `게시는 했지만 확인하지 못한 채널이 있습니다. 다시 실행하지 않습니다.\n인스타: ${igLink || igMedia.id}\n페이지: ${pageLink || pagePost.id}` };
    return { code: 0, msg: `[게시 완료]\n인스타: ${igLink}\n페이지: ${pageLink}`, igLink, pageLink };
  } catch (e) {
    log(`failed ${e.code || e.status} ${e.message}`);
    return { code: 11, msg: `게시 전에 멈췄습니다(${e.code || e.status}): ${e.message}` };
  } finally {
    release();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const dir = process.argv[2] && !process.argv[2].startsWith("--") ? path.resolve(process.argv[2]) : "";
  if (!dir) {
    console.error("사용법: node publish.mjs <게시폴더> [--check | --dry-run]");
    process.exit(64);
  }
  if (process.argv.includes("--check")) {
    const loaded = loadPost(dir);
    if (loaded.post) console.log(`검수 화면: ${writeReview(dir, { ...loaded, files: loaded.files || [] })}`);
    loaded.errors.forEach((e) => console.log(`❌ ${e}`));
    loaded.warnings?.forEach((w) => console.log(`⚠ ${w}`));
    process.exit(loaded.errors.length ? 10 : 0);
  }
  const accFile = path.join(ROOT, ".private", "meta-accounts.json");
  const accounts = fs.existsSync(accFile) ? JSON.parse(fs.readFileSync(accFile, "utf8")) : null;
  const r = await publishSns({ api: makeApi(), env: readEnv(), accounts, dir, dryRun: process.argv.includes("--dry-run") });
  console.log(r.msg);
  process.exit(r.code);
}
