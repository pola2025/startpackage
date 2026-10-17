// Meta lead ads (instant form) with the polarad standard settings. Everything is created PAUSED; delivery starts only after the person answers "게재 시작".
//   node ads.mjs check [--account act_<id>]   → ad account · payment method · lead ads terms; saves the ad account to .private\meta-accounts.json
//   node ads.mjs form <광고폴더> --check       → validates ad.json and prints the form it will create (only the privacy page is fetched)
//   node ads.mjs form <광고폴더>               → creates the instant form written in ad.json "form" (standard when omitted), reads it back and compares
//   node ads.mjs create <광고폴더>             → image · campaign · ad set · creative · ad, all PAUSED; reads back, compares, writes review.html
//   node ads.mjs launch <광고폴더>             → compares again, then turns ad · ad set · campaign ACTIVE (only after "게재 시작")
//   node ads.mjs pause <광고폴더>              → turns the campaign off
//   node ads.mjs status <광고폴더>             → delivery and review status
// <광고폴더>\ad.json and the standard values: rules\ads-meta.md. Created ids are kept in <광고폴더>\state.json, so a rerun skips what exists.
// Exit codes: 0 ok · 2 token/accounts missing · 3 permission missing · 4 several ad accounts · 5 no ad account · 7 token rejected
//   · 8 same name already exists · 10 ad.json error · 11 API error · 13 another run is active · 16 ad account not active
//   · 17 no payment method · 18 lead ads terms not accepted · 19 non-discrimination policy not accepted
//   · 20 readback differs from the standard · 21 an earlier step is missing · 64 usage
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, GRAPH, KEYS, readEnv, makeApi, ApiError, norm, appendJsonl, writeJsonAtomic, takeLock, logLine, imageSize } from "./lib.mjs";
import { NEED_ADS } from "./check.mjs";
import { pageToken } from "./publish.mjs";

/* ---------- polarad standard (validated against the Marketing API, 2026-10-17) ---------- */
export const JEJU = "1999"; // search?type=adgeolocation&location_types=["region"]&country_code=KR → Jeju-do
export const KOREAN = 12; // search?type=adlocale&q=한국 → 한국어 (23 is Spanish)
export const IG_POSITIONS = ["stream", "explore", "reels", "profile_feed"]; // same as polarad's live Instagram-only ad set
const ZERO_DECIMAL = new Set(["KRW", "JPY", "VND", "IDR", "CLP", "COP", "CRC", "HUF", "ISK", "PYG"]);
export const toMinor = (currency, amount) => String(Math.round(ZERO_DECIMAL.has(currency) ? Number(amount) : Number(amount) * 100));
const fromMinor = (currency, minor) => (ZERO_DECIMAL.has(currency) ? Number(minor) : Number(minor) / 100);
const money = (currency, amount) => (currency === "KRW" ? `${Number(amount).toLocaleString("ko-KR")}원` : `${amount} ${currency}`);
const BANNED = ["무조건", "100%", "100프로", "보장", "누구나 승인", "즉시 승인", "승인 확정"];
const STATUS = { 2: "비활성", 3: "미결제 잔액 있음", 7: "위험 검토 중", 8: "정산 대기", 9: "유예 기간", 100: "종료 대기", 101: "종료" };
const DELIVERY = { ACTIVE: "게재 중", PAUSED: "일시 중지", CAMPAIGN_PAUSED: "캠페인 꺼짐", ADSET_PAUSED: "광고 세트 꺼짐", PENDING_REVIEW: "검토 중", IN_PROCESS: "처리 중", DISAPPROVED: "승인 거부", WITH_ISSUES: "문제 있음", PENDING_BILLING_INFO: "결제 정보 필요", PREAPPROVED: "사전 승인", ARCHIVED: "보관됨", DELETED: "삭제됨" };
const ko = (s) => DELIVERY[s] || s || "?";
const LEDGER = (root) => path.join(root, ".private", "logs", "meta-ads.jsonl");

/* ---------- instant form spec ---------- */
// Standard instant form (user decision 2026-10-17). ad.json "form" replaces it with what the person wrote in the request sentence.
export const STANDARD_FORM = {
  questions: [{ label: "사업자 종류", options: ["개인사업자", "법인사업자"] }, { label: "지역 (예: 서울 강남구)" }, { label: "업종 / 회사명" }, { label: "직전년도 매출" }, { auto: "이름" }, { auto: "전화번호" }],
  disclaimer: "접수된 정보는 상담 후 폐기됩니다.",
  done_title: "상담접수 완료",
  done_body: "담당자 확인후 1일 이내 연락드릴 예정입니다.",
};
const AUTO = { 이름: ["FULL_NAME", "full_name"], 전화번호: ["PHONE", "phone_number"], 이메일: ["EMAIL", "email"] };
const AUTO_LABEL = { FULL_NAME: "이름", PHONE: "전화번호", EMAIL: "이메일" };
// Readable lead field keys for the standard wording; other questions get q1, q2 … and options o1, o2 …
const FIELD_KEYS = { "사업자 종류": "business_type", "지역 (예: 서울 강남구)": "region", "업종 / 회사명": "industry_company", "직전년도 매출": "last_year_revenue", 개인사업자: "individual", 법인사업자: "corporate" };

export function formIssues(f) {
  if (!f || typeof f !== "object" || !Array.isArray(f.questions)) return ["form.questions가 없습니다(rules\\ads-meta.md §3)."];
  const errors = [], labels = new Set();
  if (f.questions.length < 2 || f.questions.length > 12) errors.push(`질문은 2~12개입니다(지금 ${f.questions.length}개).`);
  for (const q of f.questions) {
    if (q.auto) {
      if (!AUTO[q.auto]) errors.push(`자동 입력은 이름·전화번호·이메일만 됩니다: ${q.auto}`);
      continue;
    }
    const l = String(q.label || "").trim();
    if (!l || [...l].length > 80) errors.push(`질문 문구는 1~80자입니다: "${l.slice(0, 20)}"`);
    if (labels.has(l)) errors.push(`같은 질문이 두 번 있습니다: ${l}`);
    labels.add(l);
    if (q.options && (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10 || q.options.some((o) => !String(o).trim() || [...String(o)].length > 80))) errors.push(`선택지는 2~10개, 각 80자 안입니다: ${l}`);
  }
  const autos = f.questions.map((q) => q.auto).filter(Boolean);
  if (!autos.includes("이름") || !autos.includes("전화번호")) errors.push("상담 연락을 받으려면 이름·전화번호 자동 입력이 있어야 합니다.");
  for (const k of ["disclaimer", "done_title", "done_body"]) if (!String(f[k] || "").trim()) errors.push(`form.${k}가 비어 있습니다.`);
  return errors;
}

/* ---------- ad.json ---------- */
// need "form": name, privacy_url and form only (the image may not exist yet). need "ad": everything.
export function loadAd(dir, need = "ad") {
  const file = path.join(dir, "ad.json");
  if (!fs.existsSync(file)) return { errors: [`${file}이 없습니다.`], warnings: [] };
  let ad;
  try {
    ad = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    return { errors: [`ad.json을 읽지 못했습니다: ${e.message}`], warnings: [] };
  }
  const errors = [], warnings = [];
  if (!/^\d{6}_\S{2,40}$/.test(ad.name || "")) errors.push('name은 "날짜6자리_소재·목표명"입니다(예: 261017_정책자금광고). 빈칸 없이 씁니다.');
  if (ad.privacy_url && !/^https:\/\/\S+$/.test(ad.privacy_url)) errors.push("privacy_url은 https:// 주소입니다. 모르면 빼 두면 홈페이지 주소 뒤에 /privacy를 붙여 씁니다.");
  if (ad.form) errors.push(...formIssues(ad.form));
  let imageFile = "";
  if (need === "ad") {
    if (!(Number(ad.daily_budget) > 0)) errors.push("daily_budget(하루 예산)은 숫자입니다(원화 계정 28000, 달러 계정 20).");
    imageFile = ad.image ? path.resolve(dir, ad.image) : "";
    if (!imageFile || !fs.existsSync(imageFile)) errors.push("image 파일이 없습니다(1080×1350 또는 1080×1080 PNG·JPG).");
    else {
      const s = imageSize(imageFile);
      if (!s || !["png", "jpeg"].includes(s.format)) errors.push(`${path.basename(imageFile)}: PNG 또는 JPG로 저장합니다.`);
      else if (!(s.w === 1080 && (s.h === 1350 || s.h === 1080))) errors.push(`${path.basename(imageFile)}: ${s.w}×${s.h} · 광고 이미지는 1080×1350(4:5) 또는 1080×1080입니다. 늘리거나 자르지 말고 다시 만듭니다.`);
    }
    const msg = String(ad.message || "").trim(), headline = String(ad.headline || "").trim();
    if (!msg) errors.push("message(광고 본문)가 비어 있습니다.");
    else if ([...msg].length > 1000) errors.push(`광고 본문이 ${[...msg].length}자입니다. 1,000자 안으로 줄입니다.`);
    if (!headline) errors.push("headline(광고 제목)이 비어 있습니다.");
    else if ([...headline].length > 40) warnings.push(`광고 제목이 ${[...headline].length}자입니다. 40자 안쪽을 권장합니다.`);
    const hit = BANNED.filter((w) => msg.includes(w) || headline.includes(w));
    if (hit.length) errors.push(`승인·결과를 약속하는 표현이 있습니다: ${hit.join(", ")}. 광고 검토에서 거부됩니다.`);
    if (msg && !msg.includes("신청하기")) warnings.push("본문 끝에 '👇 아래 신청하기를 눌러 …' 안내 줄을 넣습니다.");
    if (ad.region) {
      const r = ad.region;
      if (!r.name || !(r.lat >= 33 && r.lat <= 39) || !(r.lng >= 124 && r.lng <= 132)) errors.push("region은 { name, lat, lng, radius_km }입니다. 좌표는 한국 안이어야 합니다.");
      if (!(r.radius_km >= 10 && r.radius_km <= 80)) errors.push("region.radius_km는 10~80입니다. 목표 지역 전체를 덮는 중심 좌표 하나에 반경 10km 이상으로 잡습니다.");
    }
  }
  return { ad, errors, warnings, imageFile };
}

export function readBrand(root = ROOT) {
  try {
    const b = JSON.parse(fs.readFileSync(path.join(root, "brand.json"), "utf8").replace(/^﻿/, ""));
    return b.company && /^https:\/\/\S+$/.test(b.homepage || "") ? b : null;
  } catch {
    return null;
  }
}
const readState = (dir) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"));
  } catch {
    return {};
  }
};
const saveState = (dir, s) => writeJsonAtomic(path.join(dir, "state.json"), s);

/* ---------- request bodies ---------- */
export function formPayload(ad, brand) {
  const f = ad.form || STANDARD_FORM;
  let n = 0;
  const questions = f.questions.map((q) => {
    if (q.auto) return { type: AUTO[q.auto][0], key: AUTO[q.auto][1] };
    const label = String(q.label).trim();
    const out = { type: "CUSTOM", key: FIELD_KEYS[label] || `q${++n}`, label };
    if (q.options) out.options = q.options.map((o, i) => ({ key: FIELD_KEYS[String(o).trim()] || `o${i + 1}`, value: String(o).trim() }));
    return out;
  });
  return {
    name: ad.name,
    locale: "ko_KR",
    block_display_for_non_targeted_viewer: true,
    is_optimized_for_quality: false,
    questions,
    privacy_policy: { url: ad.privacy_url || `${brand.homepage.replace(/\/+$/, "")}/privacy`, link_text: `${brand.company} 개인정보처리방침` },
    custom_disclaimer: { title: "개인정보 수집·이용 안내", body: { text: String(f.disclaimer).trim() } },
    thank_you_page: { title: String(f.done_title).trim(), body: String(f.done_body).trim(), button_type: "VIEW_WEBSITE", button_text: "웹사이트 보기", website_url: brand.homepage },
    follow_up_action_url: brand.homepage,
  };
}

export function targetingFor(ad) {
  const t = {
    geo_locations: ad.region
      ? { custom_locations: [{ latitude: ad.region.lat, longitude: ad.region.lng, radius: ad.region.radius_km, distance_unit: "kilometer" }], location_types: ["home", "recent"] }
      : { countries: ["KR"], location_types: ["home", "recent"] },
    locales: [KOREAN],
    age_min: 25,
    publisher_platforms: ["instagram"],
    instagram_positions: IG_POSITIONS,
    device_platforms: ["mobile"],
    targeting_automation: { advantage_audience: 0 },
  };
  // meta-geo-narrow-ok: user decision 2026-10-17 "대한민국(제주 제외)" — the whole country minus one province, not a narrow target.
  if (!ad.region) t.excluded_geo_locations = { regions: [{ key: JEJU }] };
  return t;
}

export const campaignBody = (ad, currency) => ({ name: ad.name, objective: "OUTCOME_LEADS", status: "PAUSED", special_ad_categories: [], buying_type: "AUCTION", daily_budget: toMinor(currency, ad.daily_budget), bid_strategy: "LOWEST_COST_WITHOUT_CAP" });
export const adsetBody = (ad, campaignId, pageId) => ({ name: ad.name, campaign_id: campaignId, status: "PAUSED", billing_event: "IMPRESSIONS", optimization_goal: "LEAD_GENERATION", destination_type: "ON_AD", promoted_object: { page_id: pageId }, targeting: targetingFor(ad) });
// link "http://fb.me/" is Meta's placeholder for a form-only ad (one conversion location, no website).
export const creativeBody = (ad, { pageId, igId, imageHash, formId }) => ({
  name: ad.name,
  object_story_spec: { page_id: pageId, instagram_user_id: igId, link_data: { image_hash: imageHash, message: ad.message, name: ad.headline, link: "http://fb.me/", call_to_action: { type: "APPLY_NOW", value: { lead_gen_form_id: formId } } } },
  contextual_multi_ads: { enroll_status: "OPT_OUT" },
});

/* ---------- readback and comparison ---------- */
const FORM_FIELDS = "id,name,status,locale,questions,legal_content,thank_you_page,block_display_for_non_targeted_viewer,is_optimized_for_quality";
const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && b.every((x) => a.map(String).includes(String(x)));
const row = (rows) => (label, want, got, ok) => rows.push({ label, want: String(want ?? ""), got: String(got ?? ""), ok: !!ok });

export function formRows(f, want) {
  const rows = [], add = row(rows);
  const label = (q) => (q.type === "CUSTOM" ? q.label : AUTO_LABEL[q.type] || q.type);
  add("양식 이름", want.name, f.name, f.name === want.name);
  add("양식 언어", "한국어", f.locale, /^ko_kr$/i.test(f.locale || ""));
  const got = (f.questions || []).map(label), wq = want.questions.map(label);
  add("질문 순서", wq.join(" → "), got.join(" → "), got.join("|") === wq.join("|"));
  const optsOf = (qs) => qs.filter((q) => q.options?.length).map((q) => `${q.label}: ${q.options.map((o) => o.value).join("/")}`).join(" · ");
  const wo = optsOf(want.questions), go = optsOf(f.questions || []);
  add("선택지", wo || "없음", go || "없음", wo === go);
  const lc = f.legal_content || {}, cd = lc.custom_disclaimer || {};
  add("개인정보처리방침", want.privacy_policy.url, lc.privacy_policy?.url, lc.privacy_policy?.url === want.privacy_policy.url);
  const disc = typeof cd.body === "string" ? cd.body : cd.body?.text || "";
  add("정보 취급 설명", want.custom_disclaimer.body.text, disc, norm(disc) === norm(want.custom_disclaimer.body.text));
  const t = f.thank_you_page || {}, wt = want.thank_you_page;
  add("완료 화면", `${wt.title} / ${wt.body}`, `${t.title || ""} / ${t.body || ""}`, norm(t.title) === norm(wt.title) && norm(t.body) === norm(wt.body));
  return rows;
}

export function adRows(live, { ad, currency, accounts, state }) {
  const rows = [], add = row(rows);
  const c = live.campaign, s = live.adset, a = live.ad, t = s.targeting || {};
  const story = live.creative.object_story_spec || {}, ld = story.link_data || {};
  add("이름 통일", ad.name, [c.name, s.name, a.name].join(" / "), [c.name, s.name, a.name].every((n) => n === ad.name));
  // A matching value is shown in Korean; a different one keeps Meta's raw value so the person can report it as is.
  add("목표", "잠재 고객", c.objective === "OUTCOME_LEADS" ? "잠재 고객" : c.objective, c.objective === "OUTCOME_LEADS");
  add("하루 예산", money(currency, ad.daily_budget), c.daily_budget ? money(currency, fromMinor(currency, c.daily_budget)) : "없음", c.daily_budget === toMinor(currency, ad.daily_budget));
  add("입찰 전략", "최고 볼륨", c.bid_strategy === "LOWEST_COST_WITHOUT_CAP" ? "최고 볼륨" : c.bid_strategy, c.bid_strategy === "LOWEST_COST_WITHOUT_CAP");
  const onForm = s.destination_type === "ON_AD" && s.optimization_goal === "LEAD_GENERATION";
  add("전환 위치", "인스턴트 양식", onForm ? "인스턴트 양식" : `${s.destination_type} · ${s.optimization_goal}`, onForm);
  add("페이지", accounts.page.name, s.promoted_object?.page_id === accounts.page.id ? accounts.page.name : s.promoted_object?.page_id, s.promoted_object?.page_id === accounts.page.id);
  const g = t.geo_locations || {};
  if (ad.region) {
    const cl = (g.custom_locations || [])[0] || {};
    const ok = Math.abs(cl.latitude - ad.region.lat) < 0.001 && Math.abs(cl.longitude - ad.region.lng) < 0.001 && Number(cl.radius) === Number(ad.region.radius_km) && (cl.distance_unit || "kilometer") === "kilometer";
    add("위치", `${ad.region.name} 반경 ${ad.region.radius_km}km`, cl.radius ? `좌표 반경 ${cl.radius}${cl.distance_unit === "mile" ? "mi" : "km"}` : JSON.stringify(g), ok);
  } else {
    const jeju = (t.excluded_geo_locations?.regions || []).some((r) => String(r.key) === JEJU);
    add("위치", "대한민국 (제주 제외)", `${(g.countries || []).join(",")}${jeju ? " · 제주 제외" : ""}`, sameSet(g.countries, ["KR"]) && jeju);
  }
  add("언어", "한국어", JSON.stringify(t.locales || []), sameSet(t.locales, [KOREAN]));
  add("연령", "25세 이상", `${t.age_min}~${t.age_max || 65}`, t.age_min === 25);
  add("타겟 자동 확장", "끔", t.targeting_automation?.advantage_audience === 0 ? "끔" : "켜짐", t.targeting_automation?.advantage_audience === 0);
  const others = ["facebook_positions", "audience_network_positions", "messenger_positions", "threads_positions"].filter((k) => t[k]?.length);
  add("노출 위치", "인스타그램만 (피드·탐색·릴스·프로필 피드)", `${(t.publisher_platforms || []).join(",")} · ${(t.instagram_positions || []).join(",")}`, sameSet(t.publisher_platforms, ["instagram"]) && sameSet(t.instagram_positions, IG_POSITIONS) && !others.length);
  add("노출 위치가 아닌 곳에도 노출", "끔", s.placement_soft_opt_out ? "켜짐" : "끔", !s.placement_soft_opt_out);
  add("다른 광고와 함께 게시", "끔", live.creative.contextual_multi_ads?.enroll_status === "OPT_OUT" ? "끔" : "켜짐", live.creative.contextual_multi_ads?.enroll_status === "OPT_OUT");
  add("인스타 계정", `@${accounts.instagram.username}`, story.instagram_user_id === accounts.instagram.id ? `@${accounts.instagram.username}` : story.instagram_user_id, story.instagram_user_id === accounts.instagram.id);
  add("행동 유도 버튼", "신청하기", ld.call_to_action?.type === "APPLY_NOW" ? "신청하기" : ld.call_to_action?.type, ld.call_to_action?.type === "APPLY_NOW");
  add("연결 양식", state.formId, ld.call_to_action?.value?.lead_gen_form_id, ld.call_to_action?.value?.lead_gen_form_id === state.formId);
  add("본문 · 제목", "ad.json과 같음", norm(ld.message) === norm(ad.message) && ld.name === ad.headline ? "같음" : "다름", norm(ld.message) === norm(ad.message) && ld.name === ad.headline);
  add("광고 연결", "캠페인 → 광고 세트 → 광고", a.adset_id === state.adsetId && a.creative?.id === state.creativeId ? "연결됨" : "어긋남", a.adset_id === state.adsetId && a.creative?.id === state.creativeId);
  return rows;
}

async function readLive(api, token, state) {
  const g = (id, fields) => api("GET", `${GRAPH}/${id}`, { token, params: { fields } });
  return {
    campaign: await g(state.campaignId, "id,name,status,effective_status,objective,daily_budget,bid_strategy,special_ad_categories"),
    adset: await g(state.adsetId, "id,name,status,effective_status,destination_type,optimization_goal,promoted_object,targeting,placement_soft_opt_out"),
    creative: await g(state.creativeId, "id,object_story_spec,contextual_multi_ads"),
    ad: await g(state.adId, "id,name,status,effective_status,adset_id,creative{id},ad_review_feedback"),
  };
}
const readForm = (api, pt, id) => api("GET", `${GRAPH}/${id}`, { params: { fields: FORM_FIELDS, access_token: pt } });

function errCode(e) {
  const text = `${e.message} ${e.userMsg || ""}`;
  if (e.subcode === 2859002 || /차별|discriminat/i.test(text)) return 19;
  if (/잠재 고객 확보 서비스 약관|lead ?ads? terms|leadgen.*(tos|terms)/i.test(text)) return 18;
  if (/결제 수단|payment method|funding source/i.test(text)) return 17;
  return 11;
}
const errMsg = (e) => `${e.userMsg || e.message}${e.code ? ` (${e.code}${e.subcode ? `/${e.subcode}` : ""})` : ""}`;
const table = (rows) => rows.map((r) => ` ${r.ok ? "✅" : "❌"} ${r.label}: ${r.got}${r.ok ? "" : ` (표준: ${r.want})`}`).join("\n");

/* ---------- check ---------- */
export async function checkAds({ api, env, accounts, accountId = "" }) {
  const token = env[KEYS.meta];
  if (!token || !accounts?.page?.id) return { code: 2, msg: "토큰이나 계정 정보가 없습니다. node check.mjs를 먼저 실행합니다." };
  let granted;
  try {
    granted = ((await api("GET", `${GRAPH}/me/permissions`, { token })).data || []).filter((p) => p.status === "granted").map((p) => p.permission);
  } catch (e) {
    return { code: 7, msg: `시스템사용자 토큰을 Meta가 받지 않았습니다(${e.code || e.status}): ${e.message}` };
  }
  const lack = NEED_ADS.filter((p) => !granted.includes(p));
  if (lack.length) return { code: 3, msg: `시스템사용자 토큰에 광고 권한이 없습니다: ${lack.join(", ")}` };
  const list = (await api("GET", `${GRAPH}/me/adaccounts`, { token, params: { fields: "id,name,account_status,currency,disable_reason,funding_source_details", limit: "50" } })).data || [];
  if (!list.length) return { code: 5, msg: "토큰에 연결된 광고 계정이 없습니다." };
  const acc = list.length === 1 ? list[0] : list.find((a) => a.id === accountId || a.id === `act_${accountId}`);
  if (!acc) return { code: 4, msg: `광고 계정이 ${list.length}개 보입니다. 어느 계정인지 확인이 필요합니다.`, list: list.map((a) => ({ id: a.id, name: a.name, currency: a.currency })) };
  const tos = await api("GET", `${GRAPH}/${accounts.page.id}`, { token, params: { fields: "leadgen_tos_accepted" } });
  const problems = [];
  if (acc.account_status !== 1) problems.push({ code: 16, msg: `광고 계정 상태가 '${STATUS[acc.account_status] || acc.account_status}'입니다. 광고 관리자의 계정 개요에서 원인을 확인합니다.` });
  if (!acc.funding_source_details?.id) problems.push({ code: 17, msg: "광고 계정에 결제 수단이 없습니다(교육 05장)." });
  // Polarad accepts the lead ads terms and the non-discrimination policy in advance; a miss here goes back to polarad.
  if (!tos.leadgen_tos_accepted) problems.push({ code: 18, msg: `페이지 '${accounts.page.name}'에 잠재 고객 광고 약관 동의가 아직 반영되지 않았습니다. 폴라애드에 알립니다.` });
  const adAccount = { id: acc.id, name: acc.name, currency: acc.currency };
  const head = `광고 계정 '${acc.name}'(${acc.id}) · 통화 ${acc.currency} · 결제 수단 ${acc.funding_source_details?.display_string || "없음"} · 잠재 고객 약관 ${tos.leadgen_tos_accepted ? "동의함" : "동의 안 함"}`;
  if (problems.length) return { code: problems[0].code, adAccount, msg: `[광고 준비 필요] ${head}\n${problems.map((p) => ` - ${p.msg}`).join("\n")}` };
  return { code: 0, adAccount, msg: `[광고 준비 완료] ${head}` };
}

/* ---------- form ---------- */
export async function checkForm({ dir, brand, fetchImpl = globalThis.fetch }) {
  const { ad, errors, warnings = [] } = loadAd(dir, "form");
  if (!ad) return { code: 10, msg: errors.join("\n") };
  if (!brand) errors.push("brand.json(회사명·홈페이지)이 없습니다. AGENTS.md §6.0의 회사 정보를 먼저 등록합니다.");
  let summary = "";
  if (!errors.length) {
    const want = formPayload(ad, brand), url = want.privacy_policy.url;
    try {
      const res = await fetchImpl(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10000) });
      if (!res.ok) warnings.push(`개인정보처리방침 주소가 열리지 않습니다(HTTP ${res.status}): ${url}`);
    } catch {
      warnings.push(`개인정보처리방침 주소에 연결하지 못했습니다: ${url}`);
    }
    const qs = want.questions.map((q) => (q.type === "CUSTOM" ? `${q.label}${q.options ? `(${q.options.map((o) => o.value).join("/")})` : ""}` : `${AUTO_LABEL[q.type]}(자동 입력)`));
    summary = [
      `[양식 점검] '${want.name}' · ${ad.form ? "요청 문장의 양식" : "표준 양식"}`,
      ` 질문 ${qs.length}개: ${qs.join(" → ")}`,
      ` 정보 취급 설명: ${want.custom_disclaimer.body.text}`,
      ` 완료 화면: ${want.thank_you_page.title} / ${want.thank_you_page.body}`,
      ` 개인정보처리방침: ${url}`,
    ].join("\n");
  }
  return { code: errors.length ? 10 : 0, msg: [summary, ...errors.map((e) => `❌ ${e}`), ...warnings.map((w) => `⚠ ${w}`)].filter(Boolean).join("\n") };
}

export async function createForm({ api, env, accounts, dir, brand, root = ROOT }) {
  const { ad, errors } = loadAd(dir, "form");
  if (errors.length) return { code: 10, msg: `ad.json 오류\n${errors.map((e) => ` - ${e}`).join("\n")}` };
  if (!brand) return { code: 10, msg: "brand.json(회사명·홈페이지)이 없습니다. AGENTS.md §6.0의 회사 정보를 먼저 등록합니다." };
  const token = env[KEYS.meta];
  if (!token || !accounts?.page?.id) return { code: 2, msg: "토큰이나 계정 정보가 없습니다. node check.mjs를 먼저 실행합니다." };
  const release = takeLock("meta-ads", root);
  if (!release) return { code: 13, msg: "다른 광고 작업이 실행 중입니다." };
  const log = (m) => logLine("meta-ads.log", `[${ad.name}] ${m}`, root);
  const state = readState(dir), want = formPayload(ad, brand);
  try {
    const pt = await pageToken(api, token, accounts.page.id);
    if (!state.formId) {
      // A leadgen form cannot be edited after it is created, so a same-name form is reused only when it already matches the standard.
      const forms = (await api("GET", `${GRAPH}/${accounts.page.id}/leadgen_forms`, { params: { fields: "id,name,status", limit: "100", access_token: pt } })).data || [];
      const same = forms.find((f) => f.name === ad.name);
      if (same) {
        if (!formRows(await readForm(api, pt, same.id), want).every((r) => r.ok)) return { code: 8, msg: `같은 이름의 양식이 이미 있고 표준과 다릅니다(id ${same.id}). ad.json의 name을 바꿉니다.` };
        state.formId = same.id;
        log(`form reused ${same.id}`);
      } else {
        state.formId = (await api("POST", `${GRAPH}/${accounts.page.id}/leadgen_forms`, { form: { ...want, access_token: pt } })).id;
        log(`form created ${state.formId}`);
      }
      saveState(dir, state);
    }
    const live = await readForm(api, pt, state.formId);
    const rows = formRows(live, want);
    if (rows.some((r) => !r.ok)) return { code: 20, rows, msg: `양식을 만들었지만 표준과 다른 항목이 있습니다(id ${state.formId}).\n${table(rows)}` };
    return { code: 0, rows, msg: `[양식 완료] '${ad.name}' (id ${state.formId}) · 질문 ${live.questions.length}개 · 완료 화면 '${live.thank_you_page?.title}'\n${table(rows)}` };
  } catch (e) {
    log(`form failed ${e.code || e.status} ${e.message}`);
    return { code: errCode(e), msg: `양식을 만들지 못했습니다: ${errMsg(e)}` };
  } finally {
    release();
  }
}

/* ---------- create (PAUSED) ---------- */
async function compareAll({ api, token, accounts, state, ad, brand }) {
  const live = await readLive(api, token, state);
  const pt = await pageToken(api, token, accounts.page.id);
  const rows = [...adRows(live, { ad, currency: accounts.adAccount.currency, accounts, state }), ...formRows(await readForm(api, pt, state.formId), formPayload(ad, brand))];
  return { live, rows };
}

export async function createAds({ api, env, accounts, dir, brand, root = ROOT }) {
  const { ad, errors, warnings, imageFile } = loadAd(dir, "ad");
  if (errors.length) return { code: 10, msg: `ad.json 오류\n${errors.map((e) => ` - ${e}`).join("\n")}` };
  if (!brand) return { code: 10, msg: "brand.json(회사명·홈페이지)이 없습니다. AGENTS.md §6.0의 회사 정보를 먼저 등록합니다." };
  const token = env[KEYS.meta];
  if (!token || !accounts?.page?.id || !accounts?.instagram?.id) return { code: 2, msg: "토큰이나 계정 정보가 없습니다. node check.mjs를 먼저 실행합니다." };
  if (!accounts.adAccount?.id) return { code: 2, msg: "광고 계정 정보가 없습니다. node ads.mjs check를 먼저 실행합니다." };
  const state = readState(dir);
  if (!state.formId) return { code: 21, msg: "입력양식이 아직 없습니다. node ads.mjs form <광고폴더>를 먼저 실행합니다." };
  const act = accounts.adAccount.id;
  const release = takeLock("meta-ads", root);
  if (!release) return { code: 13, msg: "다른 광고 작업이 실행 중입니다." };
  const log = (m) => logLine("meta-ads.log", `[${ad.name}] ${m}`, root);
  const step = async (key, fn) => {
    if (state[key]) return;
    state[key] = await fn();
    saveState(dir, state);
    log(`${key} ${state[key]}`);
  };
  try {
    await step("imageHash", async () => {
      const fd = new FormData();
      fd.set("filename", await fs.openAsBlob(imageFile), path.basename(imageFile));
      fd.set("access_token", token);
      const hash = Object.values((await api("POST", `${GRAPH}/${act}/adimages`, { form: fd })).images || {})[0]?.hash;
      if (!hash) throw new ApiError(400, { error: { message: "광고 이미지 업로드 결과에 hash가 없습니다." } });
      return hash;
    });
    if (!state.campaignId) {
      const found = (await api("GET", `${GRAPH}/${act}/campaigns`, { token, params: { fields: "id,name", filtering: [{ field: "name", operator: "CONTAIN", value: ad.name }], limit: "25" } })).data || [];
      const same = found.filter((c) => c.name === ad.name);
      if (same.length) return { code: 8, msg: `같은 이름의 캠페인이 이미 있습니다(id ${same.map((c) => c.id).join(", ")}). 같은 광고를 다시 만들지 않습니다.` };
    }
    await step("campaignId", async () => (await api("POST", `${GRAPH}/${act}/campaigns`, { token, form: campaignBody(ad, accounts.adAccount.currency) })).id);
    await step("adsetId", async () => (await api("POST", `${GRAPH}/${act}/adsets`, { token, form: adsetBody(ad, state.campaignId, accounts.page.id) })).id);
    await step("creativeId", async () => (await api("POST", `${GRAPH}/${act}/adcreatives`, { token, form: creativeBody(ad, { pageId: accounts.page.id, igId: accounts.instagram.id, imageHash: state.imageHash, formId: state.formId }) })).id);
    await step("adId", async () => (await api("POST", `${GRAPH}/${act}/ads`, { token, form: { name: ad.name, adset_id: state.adsetId, creative: { creative_id: state.creativeId }, status: "PAUSED" } })).id);

    const { live, rows } = await compareAll({ api, token, accounts, state, ad, brand });
    const paused = [live.campaign, live.adset, live.ad].every((x) => x.status === "PAUSED");
    rows.push({ label: "상태", want: "모두 일시 중지 (게재 전)", got: [live.campaign, live.adset, live.ad].map((x) => ko(x.status)).join(" / "), ok: paused });
    const review = writeAdReview(dir, { ad, accounts, state, rows, imageFile, warnings });
    appendJsonl(LEDGER(root), { at: new Date().toISOString(), action: "created", name: ad.name, ids: state, allPass: rows.every((r) => r.ok) });
    const head = `광고 '${ad.name}'을 일시 중지 상태로 만들었습니다 · 하루 예산 ${money(accounts.adAccount.currency, ad.daily_budget)}\n검수 화면: ${review}\n${linkLines(accounts, state)}`;
    if (rows.some((r) => !r.ok)) return { code: 20, rows, msg: `${head}\n표준과 다른 항목이 있습니다. 게재를 시작하지 않습니다.\n${table(rows)}` };
    return { code: 0, rows, msg: `[광고 준비 완료] ${head}\n${table(rows)}` };
  } catch (e) {
    log(`create failed ${e.code || e.status}/${e.subcode || ""} ${e.message}`);
    return { code: errCode(e), msg: `광고를 만들다 멈췄습니다(만든 것은 state.json에 남아 다시 실행하면 이어서 합니다): ${errMsg(e)}` };
  } finally {
    release();
  }
}

/* ---------- launch · pause · status ---------- */
export async function launchAds({ api, env, accounts, dir, brand, root = ROOT }) {
  const { ad, errors } = loadAd(dir, "ad");
  if (errors.length) return { code: 10, msg: `ad.json 오류\n${errors.map((e) => ` - ${e}`).join("\n")}` };
  const token = env[KEYS.meta], state = readState(dir);
  if (!token || !accounts?.adAccount?.id || !brand) return { code: 2, msg: "토큰·계정·회사 정보가 없습니다. check.mjs와 ads.mjs check를 먼저 실행합니다." };
  if (!state.adId) return { code: 21, msg: "광고가 아직 없습니다. node ads.mjs create <광고폴더>를 먼저 실행합니다." };
  const release = takeLock("meta-ads", root);
  if (!release) return { code: 13, msg: "다른 광고 작업이 실행 중입니다." };
  try {
    const { rows } = await compareAll({ api, token, accounts, state, ad, brand });
    if (rows.some((r) => !r.ok)) return { code: 20, rows, msg: `표준과 다른 항목이 있어 게재를 시작하지 않았습니다.\n${table(rows)}` };
    for (const id of [state.adId, state.adsetId, state.campaignId]) await api("POST", `${GRAPH}/${id}`, { token, form: { status: "ACTIVE" } });
    const live = await readLive(api, token, state);
    appendJsonl(LEDGER(root), { at: new Date().toISOString(), action: "launched", name: ad.name, campaign: live.campaign.effective_status, ad: live.ad.effective_status });
    logLine("meta-ads.log", `[${ad.name}] launched campaign=${live.campaign.effective_status} ad=${live.ad.effective_status}`, root);
    return { code: 0, msg: `[게재 시작] '${ad.name}' · 캠페인 ${ko(live.campaign.effective_status)} · 광고 세트 ${ko(live.adset.effective_status)} · 광고 ${ko(live.ad.effective_status)}\nMeta 광고 검토가 끝나면 노출이 시작됩니다. 보통 몇 분에서 24시간 걸립니다.\n${linkLines(accounts, state)}` };
  } catch (e) {
    logLine("meta-ads.log", `[${ad.name}] launch failed ${e.code || e.status}/${e.subcode || ""} ${e.message}`, root);
    return { code: errCode(e), msg: `게재를 시작하지 못했습니다: ${errMsg(e)}` };
  } finally {
    release();
  }
}

export async function pauseAds({ api, env, dir, root = ROOT }) {
  const token = env[KEYS.meta], state = readState(dir);
  if (!state.campaignId) return { code: 21, msg: "이 폴더로 만든 캠페인이 없습니다." };
  try {
    await api("POST", `${GRAPH}/${state.campaignId}`, { token, form: { status: "PAUSED" } });
    const c = await api("GET", `${GRAPH}/${state.campaignId}`, { token, params: { fields: "name,status,effective_status" } });
    appendJsonl(LEDGER(root), { at: new Date().toISOString(), action: "paused", name: c.name, status: c.status });
    return { code: c.status === "PAUSED" ? 0 : 20, msg: `[광고 끔] '${c.name}' · 캠페인 ${ko(c.effective_status)}` };
  } catch (e) {
    return { code: errCode(e), msg: `광고를 끄지 못했습니다: ${errMsg(e)}` };
  }
}

export async function statusAds({ api, env, dir }) {
  const token = env[KEYS.meta], state = readState(dir);
  if (!state.adId) return { code: 21, msg: "이 폴더로 만든 광고가 없습니다." };
  try {
    const live = await readLive(api, token, state);
    const fb = Object.values(live.ad.ad_review_feedback?.global || {});
    return { code: 0, msg: `[광고 상태] '${live.campaign.name}' · 캠페인 ${ko(live.campaign.effective_status)} · 광고 세트 ${ko(live.adset.effective_status)} · 광고 ${ko(live.ad.effective_status)}${fb.length ? `\n검토 의견: ${fb.join(" / ")}` : ""}` };
  } catch (e) {
    return { code: errCode(e), msg: `상태를 읽지 못했습니다: ${errMsg(e)}` };
  }
}

// Links the person clicks to check settings (Ads Manager) and incoming leads (Leads Center in Meta Business Suite).
export function metaLinks(accounts, state) {
  const act = String(accounts.adAccount?.id || "").replace(/^act_/, "");
  return {
    adsManager: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${act}${state.campaignId ? `&selected_campaign_ids=${state.campaignId}` : ""}`,
    leadsCenter: `https://business.facebook.com/latest/leads_center?asset_id=${accounts.page?.id || ""}`,
  };
}
const linkLines = (accounts, state) => {
  const l = metaLinks(accounts, state);
  return `광고 관리자: ${l.adsManager}\n잠재 고객 센터: ${l.leadsCenter}`;
};

/* ---------- review pages ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const CSS = `body{margin:0;background:#eef1f5;font-family:"Malgun Gothic",sans-serif;color:#1f2937}
.wrap{display:flex;gap:24px;padding:28px;align-items:flex-start;flex-wrap:wrap}
.phone{width:340px;background:#fff;border-radius:22px;box-shadow:0 8px 30px rgba(0,0,0,.12);overflow:hidden}
.head{padding:12px 14px;font-weight:700;font-size:14px;border-bottom:1px solid #eee}
.side{flex:1;min-width:320px;max-width:640px}.box{background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:14px}
h2{font-size:15px;margin:0 0 10px}li{margin:6px 0;font-size:14px}.err{color:#b91c1c}.warn{color:#b45309}.ok{color:#047857}
label{display:block;margin:8px 0;font-size:14px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #eee;padding:7px 6px;text-align:left;vertical-align:top;word-break:keep-all;overflow-wrap:anywhere}td:nth-child(2){min-width:120px;font-weight:700}
.img{width:100%;display:block}.cta{display:flex;justify-content:space-between;padding:10px 14px;background:#f3f4f6;font-weight:700;font-size:14px}
.cap{padding:10px 14px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:keep-all}.note{font-size:13px;color:#6b7280}`;
const page = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;

export function writeAdReview(dir, { ad, accounts, state, rows, imageFile, warnings = [] }) {
  const img = path.relative(dir, imageFile).replace(/\\/g, "/");
  const { adsManager, leadsCenter } = metaLinks(accounts, state);
  const html = page(
    "광고 설정 확인",
    `<div class="phone"><div class="head">@${esc(accounts.instagram.username)} · 광고</div><img class="img" src="${esc(img)}" alt=""><div class="cta"><span>신청하기</span><span>›</span></div><div class="cap">${esc(ad.message)}</div></div>
<div class="side"><div class="box"><h2>설정 확인표 (Meta에서 다시 읽은 값)</h2><table><tr><th></th><th>항목</th><th>실제 값</th><th>표준</th></tr>${rows
      .map((r) => `<tr><td>${r.ok ? "✅" : "❌"}</td><td>${esc(r.label)}</td><td>${esc(r.got)}</td><td>${esc(r.want)}</td></tr>`)
      .join("")}</table>${warnings.map((w) => `<p class="warn">⚠ ${esc(w)}</p>`).join("")}</div>
<div class="box"><h2>광고 관리자에서 확인</h2><p><a href="${esc(adsManager)}" target="_blank">${esc(adsManager)}</a></p>
<label><input type="checkbox"> 캠페인 · 광고 세트 · 광고 이름이 모두 ${esc(ad.name)}이다</label>
<label><input type="checkbox"> 셋 다 꺼져(일시 중지) 있고 하루 예산이 맞다</label>
<label><input type="checkbox"> 광고 미리보기에서 이미지 글자가 잘리지 않았다</label>
<p class="note">이대로 광고를 시작하려면 Codex에게 <b>게재 시작</b>이라고 답합니다. 시작하기 전에는 광고비가 나가지 않습니다.</p></div>
<div class="box"><h2>잠재 고객 센터 (접수 내역)</h2><p><a href="${esc(leadsCenter)}" target="_blank">${esc(leadsCenter)}</a></p><p class="note">광고로 들어온 상담 신청은 홈페이지 관리자 대시보드의 상담신청과 텔레그램으로 받습니다. Meta에서 직접 보려면 이 주소를 엽니다.</p></div></div>`,
  );
  const out = path.join(dir, "review.html");
  fs.writeFileSync(out, html);
  return out;
}

/* ---------- CLI ---------- */
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const [cmd, arg] = process.argv.slice(2);
  const accFile = path.join(ROOT, ".private", "meta-accounts.json");
  const accounts = fs.existsSync(accFile) ? JSON.parse(fs.readFileSync(accFile, "utf8")) : null;
  const ctx = { api: makeApi(), env: readEnv(), accounts, brand: readBrand() };
  let r;
  try {
    if (cmd === "check") {
      const i = process.argv.indexOf("--account");
      r = await checkAds({ ...ctx, accountId: i > 0 ? process.argv[i + 1] || "" : "" });
      if (r.adAccount) writeJsonAtomic(accFile, { ...accounts, adAccount: r.adAccount, adsCheckedAt: new Date().toISOString() });
      if (r.list) r.msg += "\n" + r.list.map((a, n) => `  ${n + 1}. ${a.name} (${a.id}) · ${a.currency}`).join("\n");
    } else if (["form", "create", "launch", "pause", "status"].includes(cmd) && arg && !arg.startsWith("--")) {
      const dir = path.resolve(arg);
      if (cmd === "form" && process.argv.includes("--check")) r = await checkForm({ dir, brand: ctx.brand });
      else r = await { form: createForm, create: createAds, launch: launchAds, pause: pauseAds, status: statusAds }[cmd]({ ...ctx, dir });
    } else {
      console.error("사용법: node ads.mjs check | form <광고폴더> [--check] | create <광고폴더> | launch <광고폴더> | pause <광고폴더> | status <광고폴더>");
      process.exit(64);
    }
  } catch (e) {
    r = { code: e instanceof ApiError ? errCode(e) : 11, msg: `광고 작업 중 오류: ${e instanceof ApiError ? errMsg(e) : e.message}` };
  }
  console.log(r.msg);
  process.exit(r.code);
}
