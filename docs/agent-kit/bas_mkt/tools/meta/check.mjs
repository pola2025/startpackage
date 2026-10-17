// Connection check: reads the two tokens from C:\bas_mkt\.env and finds the Page, Instagram and Threads accounts.
//   node check.mjs              → prints one summary line, saves .private\meta-accounts.json
//   node check.mjs --page <id>  → when the token sees more than one Page, pick the one the person named
// Exit codes: 0 ok · 2 token missing · 3 permission missing · 4 several Pages · 5 no Page or no linked Instagram · 6 Threads token rejected · 7 Meta token rejected
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, GRAPH, THREADS, KEYS, readEnv, makeApi, writeJsonAtomic, ApiError } from "./lib.mjs";

export const NEED = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "pages_manage_posts"];
export const NEED_ADS = ["ads_management", "pages_manage_ads", "leads_retrieval"];
export const NEED_THREADS = ["threads_basic", "threads_content_publish"];

export async function checkConnection({ api, env, pageId = "" }) {
  const metaToken = env[KEYS.meta], threadsToken = env[KEYS.threads];
  const missing = [!metaToken && KEYS.meta, !threadsToken && KEYS.threads].filter(Boolean);
  if (missing.length) return { code: 2, msg: `.env에 ${missing.join(", ")} 값이 없습니다.` };

  let granted;
  try {
    const perms = await api("GET", `${GRAPH}/me/permissions`, { token: metaToken });
    granted = (perms.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
  } catch (e) {
    return { code: 7, msg: `시스템사용자 토큰을 Meta가 받지 않았습니다(${e.code || e.status}): ${e.message}` };
  }
  const lack = NEED.filter((p) => !granted.includes(p));
  if (lack.length) return { code: 3, msg: `시스템사용자 토큰에 권한이 없습니다: ${lack.join(", ")}` };

  const pages = (await api("GET", `${GRAPH}/me/accounts`, { token: metaToken, params: { fields: "id,name,instagram_business_account{id,username}", limit: "100" } })).data || [];
  if (!pages.length) return { code: 5, msg: "토큰에 연결된 페이스북 페이지가 없습니다." };
  let page = pages[0];
  if (pages.length > 1) {
    page = pages.find((p) => p.id === pageId);
    if (!page) return { code: 4, msg: `페이지가 ${pages.length}개 보입니다. 어느 페이지인지 확인이 필요합니다.`, pages: pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram_business_account?.username || "" })) };
  }
  const ig = page.instagram_business_account;
  if (!ig?.id) return { code: 5, msg: `페이지 '${page.name}'에 인스타그램 프로페셔널 계정이 연결되어 있지 않습니다.` };

  let th;
  try {
    th = await api("GET", `${THREADS}/me`, { params: { fields: "id,username", access_token: threadsToken } });
  } catch (e) {
    return { code: 6, msg: `쓰레드 토큰을 Meta가 받지 않았습니다(${e.code || e.status}): ${e.message}` };
  }
  const accounts = {
    checkedAt: new Date().toISOString(),
    page: { id: page.id, name: page.name },
    instagram: { id: ig.id, username: ig.username || "" },
    threads: { id: th.id, username: th.username || "" },
    ads: NEED_ADS.every((p) => granted.includes(p)),
  };
  return { code: 0, accounts, msg: `[연결 정상] 페이지 '${page.name}' · 인스타 @${accounts.instagram.username} · 쓰레드 @${accounts.threads.username} · 광고 권한 ${accounts.ads ? "있음" : "없음"}` };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const i = process.argv.indexOf("--page");
  const pageId = i > 0 ? process.argv[i + 1] || "" : "";
  let r;
  try {
    r = await checkConnection({ api: makeApi(), env: readEnv(), pageId });
  } catch (e) {
    r = { code: 7, msg: `연결 확인 중 오류(${e instanceof ApiError ? e.code || e.status : "?"}): ${e.message}` };
  }
  console.log(r.msg);
  if (r.pages) r.pages.forEach((p, n) => console.log(`  ${n + 1}. ${p.name} (id ${p.id}) · 인스타 @${p.instagram || "연결 없음"}`));
  if (r.code === 0) writeJsonAtomic(path.join(ROOT, ".private", "meta-accounts.json"), r.accounts);
  process.exit(r.code);
}
