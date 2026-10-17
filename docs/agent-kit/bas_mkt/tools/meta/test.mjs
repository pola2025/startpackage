// Offline regression tests (no network): node test.mjs
// Covers the Instagram publishing guards: empty queue, last item, rerun, duplicate block, readback, Page failure.
// Lead ads: everything PAUSED, readback against the standard, no launch on mismatch, resume after a refused step.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { addPosts, runOnce, refreshToken, checkThreadPost } from "./threads.mjs";
import { publishSns, loadPost } from "./publish.mjs";
import { checkConnection, NEED, NEED_ADS } from "./check.mjs";
import { loadAd, toMinor, targetingFor, checkAds, createForm, createAds, launchAds, pauseAds } from "./ads.mjs";
import { checkMedia, captionIssues, readJsonl, ApiError } from "./lib.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "basmkt-meta-"));
const noSleep = async () => {};
let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed++;
  console.log(`✅ ${name}`);
};

function png(file, w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}
function mp4(file, w, h, seconds) {
  const box = (type, payload) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(8 + payload.length, 0);
    head.write(type, 4, "ascii");
    return Buffer.concat([head, payload]);
  };
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt32BE(1000, 12);
  mvhd.writeUInt32BE(seconds * 1000, 16);
  const tkhd = Buffer.alloc(84);
  tkhd.writeUInt32BE(w * 65536, 76);
  tkhd.writeUInt32BE(h * 65536, 80);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, box("moov", Buffer.concat([box("mvhd", mvhd), box("trak", box("tkhd", tkhd))])));
}

// Fake Graph/Threads API: routes by URL and records every call.
function fakeApi(over = {}) {
  const calls = [];
  let n = 0;
  const api = async (method, url, opts = {}) => {
    const u = new URL(url);
    const p = u.pathname;
    const form = opts.form instanceof FormData ? Object.fromEntries([...opts.form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : "<file>"])) : opts.form || {};
    calls.push({ method, path: p, params: opts.params || {}, form });
    for (const [re, fn] of Object.entries(over)) if (new RegExp(re).test(`${method} ${p}`)) return fn({ method, p, form, params: opts.params || {} });
    if (method === "GET" && p.endsWith("/me/permissions")) return { data: ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "pages_manage_posts"].map((permission) => ({ permission, status: "granted" })) };
    if (method === "GET" && p.endsWith("/me/accounts")) return { data: [{ id: "P1", name: "테스트 페이지", access_token: "PT", instagram_business_account: { id: "IG1", username: "test.ig" } }] };
    if (method === "GET" && p === "/v1.0/me") return { id: "TH1", username: "test.th" };
    if (method === "GET" && /\/v1\.0\/TH1\/threads$/.test(p)) return { data: [] };
    if (method === "POST" && p.endsWith("/threads")) return { id: `C${++n}` };
    if (method === "POST" && p.endsWith("/threads_publish")) return { id: `T${++n}` };
    if (method === "GET" && /\/v1\.0\/T\d+$/.test(p)) return { permalink: `https://www.threads.net/@test.th/post/${p.split("/").pop()}` };
    if (method === "GET" && p.endsWith("/IG1/media")) return { data: [] };
    if (method === "POST" && p.endsWith("/P1/photos")) return { id: `PH${++n}` };
    if (method === "GET" && /\/PH\d+$/.test(p)) return { images: [{ width: 720, source: "https://scontent.example/s.jpg" }, { width: 1080, source: `https://scontent.example/${p.split("/").pop()}.jpg` }] };
    if (method === "POST" && p.endsWith("/IG1/media")) return { id: `IGC${++n}`, uri: "https://rupload.example/ig" };
    if (method === "GET" && /\/IGC\d+$/.test(p)) return { status_code: "FINISHED" };
    if (method === "POST" && p.endsWith("/IG1/media_publish")) return { id: "IGM1" };
    if (method === "GET" && p.endsWith("/IGM1")) return { permalink: "https://www.instagram.com/p/TEST/", caption: over.__caption || "" };
    if (method === "POST" && p.endsWith("/P1/feed")) return { id: "P1_POST1" };
    if (method === "POST" && p.endsWith("/P1/videos")) return { id: "V1", post_id: "P1_POST2" };
    if (method === "GET" && /\/P1_POST\d$/.test(p)) return { permalink_url: "https://www.facebook.com/P1/posts/1" };
    if (method === "GET" && p.endsWith("/refresh_access_token")) return { access_token: "NEWTOKEN", expires_in: 5184000 };
    throw new Error(`unexpected ${method} ${p}`);
  };
  return { api, calls };
}

const CAPTION = "📌 정책자금 소식\n창원시 육성자금\n접수가 시작됐습니다.\n\n✅ 지원 규모\n경영안정자금 2,100억 원\n\n#정책자금 #창원시";
const THREAD = { parts: ["정책자금은 신청 시기를 놓치면 다음 공고까지 기다려야 합니다.\n올해 하반기 공고는 대부분 예산 소진 시까지 받습니다.", "준비 서류는 사업자등록증명원과 납세증명서가 기본입니다."], topic: "정책자금" };

await test("쓰레드: 빈 대기열이면 0건 게시하고 멈춤", async () => {
  const root = tmp();
  const { api, calls } = fakeApi();
  const r = await runOnce({ api, env: { THREADS_ACCESS_TOKEN: "t" }, root, sleep: noSleep });
  assert.equal(r.code, 15);
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});

await test("쓰레드: 규칙 위반 글은 넣지 않음(링크·반말·회사명·이미지)", async () => {
  assert.ok(checkThreadPost({ parts: ["자세한 내용은 https://a.com 에서 확인하시면 됩니다."] }).errs.length);
  assert.ok(checkThreadPost({ parts: ["올해 정책자금은 상반기에 몰려서 접수가 빨리 끝났다"] }).errs.some((e) => e.includes("존댓말")));
  assert.ok(checkThreadPost({ parts: ["한빛경영컨설팅이 정책자금 신청 시기를 정리했습니다. 올해는 서둘러야 합니다."] }, { company: "한빛경영컨설팅" }).errs.length);
  assert.ok(checkThreadPost({ ...THREAD, image: "a.png" }).errs.length);
  const root = tmp();
  assert.equal(addPosts({ root, items: [THREAD, { parts: ["무료 상담 신청은 댓글 남겨 주세요. 지금 바로 확인하실 수 있습니다."] }] }).code, 10);
  assert.equal(fs.existsSync(path.join(root, ".private", "threads-queue.json")), false);
});

await test("쓰레드: 마지막 1건을 올리면 대기열이 비고 기록이 남음", async () => {
  const root = tmp();
  assert.equal(addPosts({ root, items: [THREAD] }).code, 0);
  const { api, calls } = fakeApi();
  const r = await runOnce({ api, env: { THREADS_ACCESS_TOKEN: "t" }, root, sleep: noSleep });
  assert.equal(r.code, 0, r.msg);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".private", "threads-queue.json"), "utf8")).length, 0);
  assert.equal(readJsonl(path.join(root, ".private", "logs", "threads-published.jsonl")).length, 1);
  const posts = calls.filter((c) => c.path.endsWith("/threads") && c.method === "POST");
  assert.equal(posts.length, 2);
  assert.equal(posts[0].form.topic_tag, "정책자금");
  assert.ok(posts[1].form.reply_to_id, "추가 글은 첫 글에 답글로 붙음");
  const again = await runOnce({ api, env: { THREADS_ACCESS_TOKEN: "t" }, root, sleep: noSleep });
  assert.equal(again.code, 15, "재실행하면 같은 글을 다시 올리지 않음");
});

await test("쓰레드: 올린 글을 다시 넣으면 막음, 계정에 이미 있는 글은 건너뜀", async () => {
  const root = tmp();
  addPosts({ root, items: [THREAD] });
  await runOnce({ api: fakeApi().api, env: { THREADS_ACCESS_TOKEN: "t" }, root, sleep: noSleep });
  assert.equal(addPosts({ root, items: [THREAD] }).code, 10);
  const root2 = tmp();
  addPosts({ root: root2, items: [THREAD] });
  const { api, calls } = fakeApi({ "GET .*/TH1/threads$": () => ({ data: [{ id: "X", text: THREAD.parts[0] }] }) });
  const r = await runOnce({ api, env: { THREADS_ACCESS_TOKEN: "t" }, root: root2, sleep: noSleep });
  assert.equal(r.code, 8);
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
});

await test("쓰레드: 지난 날짜에 남은 글은 다음 날 올리지 않고 뺌(그날 올릴 글만)", async () => {
  const root = tmp();
  const day1 = Date.parse("2026-10-17T03:00:00Z");
  addPosts({ root, items: [THREAD], now: day1 });
  const { api, calls } = fakeApi();
  const r = await runOnce({ api, env: { THREADS_ACCESS_TOKEN: "t" }, root, now: day1 + 24 * 3600000, sleep: noSleep });
  assert.equal(r.code, 15, r.msg);
  assert.match(r.msg, /지난 날짜 글 1개/);
  assert.equal(calls.filter((c) => c.method === "POST").length, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".private", "threads-queue.json"), "utf8")).length, 0);
});

await test("쓰레드: 토큰은 24시간 뒤, 만료 30일 전부터만 갱신", async () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, ".env"), "META_SYSTEM_USER_TOKEN=m\nTHREADS_ACCESS_TOKEN=old\n");
  const { api, calls } = fakeApi();
  const t0 = Date.parse("2026-10-17T00:00:00Z");
  assert.match((await refreshToken({ api, env: { THREADS_ACCESS_TOKEN: "old" }, root, now: t0 })).msg, /24시간/);
  assert.equal(calls.length, 0);
  const r = await refreshToken({ api, env: { THREADS_ACCESS_TOKEN: "old" }, root, now: t0 + 25 * 3600000 });
  assert.equal(r.code, 0);
  assert.match(fs.readFileSync(path.join(root, ".env"), "utf8"), /THREADS_ACCESS_TOKEN=NEWTOKEN/);
  assert.match(fs.readFileSync(path.join(root, ".env"), "utf8"), /META_SYSTEM_USER_TOKEN=m/);
  const before = calls.length;
  assert.match((await refreshToken({ api, env: { THREADS_ACCESS_TOKEN: "NEWTOKEN" }, root, now: t0 + 26 * 3600000 })).msg, /24시간|불필요/);
  assert.equal(calls.length, before);
});

await test("연결 확인: 계정 이름을 찾고, 페이지가 여럿이면 멈춤", async () => {
  const ok = await checkConnection({ api: fakeApi().api, env: { META_SYSTEM_USER_TOKEN: "m", THREADS_ACCESS_TOKEN: "t" } });
  assert.equal(ok.code, 0, ok.msg);
  assert.match(ok.msg, /@test\.ig .*@test\.th/);
  const two = fakeApi({ "GET .*/me/accounts$": () => ({ data: [{ id: "A", name: "가" }, { id: "B", name: "나" }] }) });
  assert.equal((await checkConnection({ api: two.api, env: { META_SYSTEM_USER_TOKEN: "m", THREADS_ACCESS_TOKEN: "t" } })).code, 4);
  assert.equal((await checkConnection({ api: fakeApi().api, env: { META_SYSTEM_USER_TOKEN: "m" } })).code, 2);
});

function snsFolder(type = "carousel", caption = CAPTION) {
  const root = tmp();
  const dir = path.join(root, "sns", "20261017-test");
  if (type === "reels") mp4(path.join(dir, "reel.mp4"), 1080, 1920, 20);
  else for (const i of [1, 2, 3]) png(path.join(dir, "cards", `0${i}.png`), 1080, 1440);
  const files = type === "reels" ? ["reel.mp4"] : type === "image" ? ["cards/01.png"] : ["cards/01.png", "cards/02.png", "cards/03.png"];
  fs.writeFileSync(path.join(dir, "sns.json"), JSON.stringify({ type, files, caption }));
  return { root, dir };
}
const ACC = { page: { id: "P1" }, instagram: { id: "IG1" } };
const ENV = { META_SYSTEM_USER_TOKEN: "m" };

await test("인스타·페이지: 카드뉴스 동시 게시, 페이지 이미지 주소를 인스타가 사용, 결과 확인", async () => {
  const { root, dir } = snsFolder();
  const { api, calls } = fakeApi({ __caption: CAPTION });
  const r = await publishSns({ api, env: ENV, accounts: ACC, dir, root, sleep: noSleep });
  assert.equal(r.code, 0, r.msg);
  const uploads = calls.filter((c) => c.path.endsWith("/P1/photos"));
  assert.equal(uploads.length, 3);
  assert.ok(uploads.every((c) => c.form.published === "false"));
  const children = calls.filter((c) => c.path.endsWith("/IG1/media") && c.method === "POST" && c.form.is_carousel_item);
  assert.ok(children.every((c) => /scontent\.example\/PH\d+\.jpg/.test(c.form.image_url)), "가장 큰 페이지 이미지 주소를 넘김");
  const feed = calls.find((c) => c.path.endsWith("/P1/feed"));
  assert.equal(JSON.parse(JSON.stringify(feed.form.attached_media)).length, 3);
  assert.equal(readJsonl(path.join(root, ".private", "logs", "meta-published.jsonl")).length, 1);
  const again = await publishSns({ api, env: ENV, accounts: ACC, dir, root, sleep: noSleep });
  assert.equal(again.code, 8, "재실행은 게시 기록으로 막음");
});

await test("인스타·페이지: 인스타에 같은 캡션이 있으면 막음, 검증 모드는 아무것도 공개하지 않음", async () => {
  const { root, dir } = snsFolder();
  const dupe = fakeApi({ "GET .*/IG1/media$": () => ({ data: [{ id: "1", caption: CAPTION, permalink: "https://ig/p/1" }] }) });
  assert.equal((await publishSns({ api: dupe.api, env: ENV, accounts: ACC, dir, root, sleep: noSleep })).code, 8);
  assert.equal(dupe.calls.filter((c) => c.method === "POST").length, 0);
  const { api, calls } = fakeApi();
  const dry = await publishSns({ api, env: ENV, accounts: ACC, dir, root, dryRun: true, sleep: noSleep });
  assert.equal(dry.code, 0, dry.msg);
  assert.equal(calls.filter((c) => c.path.endsWith("/media_publish") || c.path.endsWith("/feed")).length, 0);
});

await test("인스타·페이지: 페이지 게시가 실패하면 12로 멈추고 기록을 남김", async () => {
  const { root, dir } = snsFolder("image");
  const { api } = fakeApi({ __caption: CAPTION, "POST .*/P1/feed$": () => Promise.reject(new Error("permission")) });
  const r = await publishSns({ api, env: ENV, accounts: ACC, dir, root, sleep: noSleep });
  assert.equal(r.code, 12, r.msg);
  assert.equal(readJsonl(path.join(root, ".private", "logs", "meta-published.jsonl")).length, 1);
});

await test("릴스: 1080×1920 영상을 이어 올리기로 업로드", async () => {
  const { root, dir } = snsFolder("reels");
  const { api, calls } = fakeApi({ __caption: CAPTION });
  const uploads = [];
  const fetchImpl = async (url, init) => (uploads.push({ url, headers: init.headers }), { ok: true, status: 200 });
  const r = await publishSns({ api, fetchImpl, env: ENV, accounts: ACC, dir, root, sleep: noSleep });
  assert.equal(r.code, 0, r.msg);
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].headers.Authorization, "OAuth m");
  assert.ok(calls.some((c) => c.path.endsWith("/P1/videos")));
});

await test("크기·캡션 검사: 3:4 기준, 받을 수 없는 비율·영상 크기는 오류", async () => {
  const root = tmp();
  png(path.join(root, "a.png"), 1080, 1440);
  png(path.join(root, "b.png"), 1080, 1350);
  png(path.join(root, "c.png"), 1000, 2000);
  mp4(path.join(root, "d.mp4"), 1920, 1080, 10);
  assert.equal(checkMedia(path.join(root, "a.png")).ok, true);
  assert.ok(checkMedia(path.join(root, "b.png")).warn);
  assert.equal(checkMedia(path.join(root, "c.png")).ok, false);
  assert.equal(checkMedia(path.join(root, "d.mp4")).ok, false);
  const lump = captionIssues("정책자금 신청을 준비하시는 대표님들께 올해 바뀐 점을 한 문단으로 길게 설명드리면 이렇습니다\n\n#정책자금");
  assert.ok(lump.warnings.some((w) => w.includes("22자")));
  assert.ok(lump.warnings.some((w) => w.includes("이모지")));
  const { dir } = snsFolder("carousel", "");
  assert.ok(loadPost(dir).errors.some((e) => e.includes("캡션")));
});

/* ---------- Meta 광고 (ads.mjs) ---------- */
// Fake Marketing API: POSTed bodies are stored and returned on GET, like Meta's readback. An override that returns undefined falls through.
function fakeAds(over = {}) {
  const calls = [], store = {};
  let n = 0;
  const KIND = { leadgen_forms: ["form", "F"], campaigns: ["campaign", "C"], adsets: ["adset", "S"], adcreatives: ["creative", "CR"], ads: ["ad", "A"] };
  const readback = (o) =>
    o.kind === "form"
      ? { id: o.id, name: o.name, status: "ACTIVE", locale: o.locale, questions: o.questions, legal_content: { privacy_policy: o.privacy_policy, custom_disclaimer: o.custom_disclaimer }, thank_you_page: o.thank_you_page }
      : o.kind === "ad"
        ? { id: o.id, name: o.name, status: o.status, effective_status: o.status, adset_id: o.adset_id, creative: { id: o.creative.creative_id } }
        : { ...o, effective_status: o.status };
  const api = async (method, url, opts = {}) => {
    const p = new URL(url).pathname.replace(/^\/v[\d.]+/, "");
    const form = opts.form instanceof FormData ? Object.fromEntries([...opts.form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : "<file>"])) : opts.form || {};
    calls.push({ method, path: p, form, params: opts.params || {} });
    for (const [re, fn] of Object.entries(over)) if (new RegExp(re).test(`${method} ${p}`)) {
      const out = await fn({ form, store });
      if (out !== undefined) return out;
    }
    if (method === "GET" && p === "/me/permissions") return { data: [...NEED, ...NEED_ADS].map((permission) => ({ permission, status: "granted" })) };
    if (method === "GET" && p === "/me/accounts") return { data: [{ id: "P1", name: "테스트 페이지", access_token: "PT" }] };
    if (method === "GET" && p === "/me/adaccounts") return { data: [{ id: "act_1", name: "테스트 광고계정", account_status: 1, currency: "KRW", funding_source_details: { id: "FS1", display_string: "Visa *1234" } }] };
    if (method === "GET" && p === "/P1") return { leadgen_tos_accepted: true };
    if (method === "GET" && /\/(leadgen_forms|campaigns)$/.test(p)) return { data: [] };
    if (method === "POST" && p === "/act_1/adimages") return { images: { "ad.png": { hash: "H1" } } };
    const last = p.split("/").pop();
    if (method === "POST" && KIND[last]) {
      const id = `${KIND[last][1]}${++n}`;
      store[id] = { kind: KIND[last][0], id, ...structuredClone(form) };
      return { id };
    }
    if (method === "POST" && store[last]) return (Object.assign(store[last], form), { success: true });
    if (method === "GET" && store[last]) return readback(store[last]);
    throw new Error(`unexpected ${method} ${p}`);
  };
  return { api, calls, store };
}
function adFolder(over = {}) {
  const root = tmp();
  const brand = { company: "테스트컨설팅", homepage: "https://test.co.kr" };
  const dir = path.join(root, "ads", "20261017-policy-fund");
  png(path.join(dir, "ad.png"), 1080, 1350);
  const ad = { name: "261017_정책자금광고", daily_budget: 28000, image: "ad.png", headline: "정책자금 상담 신청", message: "📌 정책자금 알아보고 계신가요?\n\n👇 아래 신청하기를 눌러\n상담을 신청하세요.", privacy_url: "https://test.co.kr/privacy", ...over };
  fs.writeFileSync(path.join(dir, "ad.json"), JSON.stringify(ad));
  return { root, dir, brand };
}
const ADS_ACC = { page: { id: "P1", name: "테스트 페이지" }, instagram: { id: "IG1", username: "test.ig" }, adAccount: { id: "act_1", name: "테스트 광고계정", currency: "KRW" } };
const posted = (calls, p) => calls.filter((c) => c.method === "POST" && c.path === p);

await test("광고: ad.json 검사(이름 형식·이미지 비율·과장 표현·반경 10km 미만)와 표준 타겟", async () => {
  const { dir } = adFolder({ name: "정책자금 광고", message: "무조건 승인되는 정책자금", region: { name: "창원", lat: 35.2, lng: 128.6, radius_km: 5 } });
  png(path.join(dir, "ad.png"), 1080, 1440);
  const r = loadAd(dir);
  assert.ok(r.errors.some((e) => e.includes("날짜6자리")));
  assert.ok(r.errors.some((e) => e.includes("1080×1440")));
  assert.ok(r.errors.some((e) => e.includes("무조건")));
  assert.ok(r.errors.some((e) => e.includes("10~80")));
  assert.equal(toMinor("KRW", 28000), "28000");
  assert.equal(toMinor("USD", 20), "2000");
  const t = targetingFor({});
  assert.deepEqual(t.geo_locations.countries, ["KR"]);
  assert.equal(t.excluded_geo_locations.regions[0].key, "1999");
  assert.deepEqual(t.locales, [12]);
  assert.deepEqual(t.publisher_platforms, ["instagram"]);
  const tr = targetingFor({ region: { name: "창원", lat: 35.2, lng: 128.6, radius_km: 15 } });
  assert.equal(tr.geo_locations.custom_locations[0].radius, 15);
  assert.equal(tr.excluded_geo_locations, undefined, "지역 광고는 제주 제외를 붙이지 않음");
});

await test("광고 점검: 결제 수단·약관이 없으면 사람이 할 일을 함께 알려 줌", async () => {
  const { api } = fakeAds({ "GET /me/adaccounts$": () => ({ data: [{ id: "act_1", name: "가", account_status: 1, currency: "KRW" }] }), "GET /P1$": () => ({ leadgen_tos_accepted: false }) });
  const r = await checkAds({ api, env: ENV, accounts: ADS_ACC });
  assert.equal(r.code, 17, r.msg);
  assert.match(r.msg, /결제 수단/);
  assert.match(r.msg, /약관/);
  const ok = await checkAds({ api: fakeAds().api, env: ENV, accounts: ADS_ACC });
  assert.equal(ok.code, 0, ok.msg);
  assert.equal(ok.adAccount.currency, "KRW");
});

await test("입력양식: 페이지 토큰으로 표준 질문을 만들고 다시 읽어 대조, 재실행은 새로 만들지 않음", async () => {
  const { root, dir, brand } = adFolder();
  const { api, calls } = fakeAds();
  const r = await createForm({ api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(r.code, 0, r.msg);
  const form = posted(calls, "/P1/leadgen_forms")[0].form;
  assert.equal(form.access_token, "PT");
  assert.deepEqual(form.questions.map((q) => q.label || q.type), ["사업자 종류", "지역 (예: 서울 강남구)", "업종 / 회사명", "직전년도 매출", "FULL_NAME", "PHONE"]);
  assert.equal(form.locale, "ko_KR");
  assert.equal(form.custom_disclaimer.body.text, "접수된 정보는 상담 후 폐기됩니다.");
  assert.equal(form.thank_you_page.title, "상담접수 완료");
  assert.equal((await createForm({ api, env: ENV, accounts: ADS_ACC, dir, brand, root })).code, 0);
  assert.equal(posted(calls, "/P1/leadgen_forms").length, 1);
});

await test("입력양식: 요청 문장의 질문·문구(ad.json form)대로 만들고, 개인정보처리방침은 홈페이지/privacy가 기본", async () => {
  const form = {
    questions: [{ label: "희망 자금", options: ["운전자금", "시설자금", "잘 모름"] }, { label: "업종 / 회사명" }, { auto: "이름" }, { auto: "전화번호" }],
    disclaimer: "접수된 정보는 상담 후 폐기됩니다.",
    done_title: "신청 완료",
    done_body: "곧 연락드리겠습니다.",
  };
  const { root, dir, brand } = adFolder({ privacy_url: undefined, form });
  const { api, calls } = fakeAds();
  const r = await createForm({ api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(r.code, 0, r.msg);
  const sent = posted(calls, "/P1/leadgen_forms")[0].form;
  assert.deepEqual(sent.questions.map((q) => q.label || q.type), ["희망 자금", "업종 / 회사명", "FULL_NAME", "PHONE"]);
  assert.deepEqual(sent.questions[0].options.map((o) => o.value), ["운전자금", "시설자금", "잘 모름"]);
  assert.equal(sent.questions[1].key, "industry_company", "표준 문구는 표준 키를 씀");
  assert.equal(sent.privacy_policy.url, "https://test.co.kr/privacy");
  assert.equal(sent.thank_you_page.title, "신청 완료");
  const bad = adFolder({ form: { ...form, questions: form.questions.slice(0, 3) } });
  assert.ok(loadAd(bad.dir, "form").errors.some((e) => e.includes("전화번호")), "연락처 자동 입력이 없으면 만들지 않음");
});

await test("광고 만들기: 모두 일시 중지로 만들고 표준 대조·검수 화면, 재실행·같은 이름 캠페인은 막음", async () => {
  const { root, dir, brand } = adFolder();
  const { api, calls } = fakeAds();
  assert.equal((await createAds({ api, env: ENV, accounts: ADS_ACC, dir, brand, root })).code, 21, "양식 없이는 광고를 만들지 않음");
  await createForm({ api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  const r = await createAds({ api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(r.code, 0, r.msg);
  const camp = posted(calls, "/act_1/campaigns")[0].form;
  assert.equal(camp.objective, "OUTCOME_LEADS");
  assert.equal(camp.daily_budget, "28000");
  const set = posted(calls, "/act_1/adsets")[0].form;
  assert.equal(set.destination_type, "ON_AD");
  assert.equal(set.targeting.age_min, 25);
  const cr = posted(calls, "/act_1/adcreatives")[0].form;
  assert.equal(cr.object_story_spec.link_data.call_to_action.type, "APPLY_NOW");
  assert.equal(cr.contextual_multi_ads.enroll_status, "OPT_OUT");
  assert.ok([camp, set, posted(calls, "/act_1/ads")[0].form].every((f) => f.status === "PAUSED"));
  assert.equal(calls.filter((c) => c.form.status === "ACTIVE").length, 0, "만들 때는 아무것도 켜지 않음");
  assert.ok(r.rows.every((x) => x.ok));
  assert.ok(fs.existsSync(path.join(dir, "review.html")));
  assert.match(r.msg, /adsmanager\.facebook\.com\/adsmanager\/manage\/campaigns\?act=1&selected_campaign_ids=C\d+/, "광고 관리자 주소를 알려 줌");
  assert.match(r.msg, /business\.facebook\.com\/latest\/leads_center\?asset_id=P1/, "잠재 고객 센터 주소를 알려 줌");
  const before = calls.filter((c) => c.method === "POST").length;
  assert.equal((await createAds({ api, env: ENV, accounts: ADS_ACC, dir, brand, root })).code, 0);
  assert.equal(calls.filter((c) => c.method === "POST").length, before, "재실행은 만든 것을 건너뜀");

  const other = adFolder();
  const dup = fakeAds({ "GET /act_1/campaigns$": () => ({ data: [{ id: "C9", name: "261017_정책자금광고" }] }) });
  await createForm({ api: dup.api, env: ENV, accounts: ADS_ACC, dir: other.dir, brand, root: other.root });
  assert.equal((await createAds({ api: dup.api, env: ENV, accounts: ADS_ACC, dir: other.dir, brand, root: other.root })).code, 8);
  assert.equal(posted(dup.calls, "/act_1/campaigns").length, 0);
});

await test("게재 시작: 다시 읽은 값이 표준과 다르면 켜지 않고, 맞으면 광고 → 세트 → 캠페인을 차례로 켬", async () => {
  const { root, dir, brand } = adFolder();
  const f = fakeAds();
  await createForm({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  await createAds({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  const state = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"));
  f.store[state.adsetId].targeting.age_min = 18;
  const blocked = await launchAds({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(blocked.code, 20, blocked.msg);
  assert.match(blocked.msg, /연령/);
  assert.equal(f.calls.filter((c) => c.form.status === "ACTIVE").length, 0);
  f.store[state.adsetId].targeting.age_min = 25;
  const go = await launchAds({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(go.code, 0, go.msg);
  assert.deepEqual(f.calls.filter((c) => c.form.status === "ACTIVE").map((c) => c.path), [`/${state.adId}`, `/${state.adsetId}`, `/${state.campaignId}`]);
  assert.equal((await pauseAds({ api: f.api, env: ENV, dir, root })).code, 0);
  assert.equal(f.store[state.campaignId].status, "PAUSED");
});

await test("차별 금지 정책 미동의: 19로 멈추고, 동의 뒤 다시 실행하면 이어서 만듦", async () => {
  const { root, dir, brand } = adFolder();
  let refuse = true;
  const f = fakeAds({
    "POST /act_1/adcreatives$": () => {
      if (refuse) throw new ApiError(400, { error: { message: "Unknown method", code: 100, error_subcode: 2859002, error_user_msg: "차별 금지 정책 준수에 동의해야 합니다" } });
    },
  });
  await createForm({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  const r = await createAds({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(r.code, 19, r.msg);
  const s = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"));
  assert.ok(s.campaignId && s.adsetId && !s.creativeId);
  refuse = false;
  const r2 = await createAds({ api: f.api, env: ENV, accounts: ADS_ACC, dir, brand, root });
  assert.equal(r2.code, 0, r2.msg);
  assert.equal(posted(f.calls, "/act_1/campaigns").length, 1, "캠페인을 두 번 만들지 않음");
});

console.log(`\n${passed}개 테스트 통과`);
