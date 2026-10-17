// Shared helpers for the Naver session tools. Rules: F:\agents-rules\global\naver-blog-login-session.md
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PRIVATE = path.join(ROOT, ".private");

export function accountArg(argv) {
  const name = argv[2];
  if (!name || !/^[a-z0-9_-]{2,40}$/i.test(name)) {
    console.error("사용법: node <도구>.mjs <계정이름(영문·숫자)>");
    process.exit(64);
  }
  return name;
}

export const profileDir = (acct) => path.join(PRIVATE, "browser-profiles", `naver-${acct}`);
const metaFile = (acct) => path.join(PRIVATE, `naver-${acct}.json`);

export function readMeta(acct) {
  try { return JSON.parse(fs.readFileSync(metaFile(acct), "utf8")); } catch { return {}; }
}

export function writeMeta(acct, meta) {
  fs.mkdirSync(PRIVATE, { recursive: true });
  fs.writeFileSync(metaFile(acct), JSON.stringify(meta, null, 2));
}

export function logLine(acct, message) {
  const dir = path.join(PRIVATE, "logs");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `naver-touch-${acct}.log`), `${new Date().toISOString()} ${message}\n`);
  console.log(message);
}

// Headless Chrome reports "HeadlessChrome" in its UA; reuse the real Chrome major version with a Windows UA.
async function windowsChromeUA() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const major = browser.version().split(".")[0];
  await browser.close();
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

export async function openProfile(acct, { headless }) {
  fs.mkdirSync(profileDir(acct), { recursive: true });
  const ctx = await chromium.launchPersistentContext(profileDir(acct), {
    channel: "chrome",
    headless,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    viewport: { width: 1280, height: 860 },
    args: ["--disable-blink-features=AutomationControlled", "--lang=ko-KR"],
    ignoreDefaultArgs: ["--enable-automation"],
    extraHTTPHeaders: { "Accept-Language": "ko-KR,ko;q=0.9" },
    ...(headless ? { userAgent: await windowsChromeUA() } : {}),
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko", "en-US", "en"] });
  });
  return ctx;
}

// Reads NID_AUT without opening any page. Never print cookie values.
export async function nidAuth(ctx) {
  const cookies = await ctx.cookies(["https://nid.naver.com", "https://www.naver.com", "https://blog.naver.com"]);
  const c = cookies.find((x) => x.name === "NID_AUT");
  return c ? { persistent: c.expires !== -1, expires: c.expires } : null;
}

export const formatExpiry = (seconds) =>
  seconds > 0 ? new Date(seconds * 1000).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "세션 쿠키";

export const hoursSince = (iso) => (iso ? (Date.now() - Date.parse(iso)) / 3600000 : Infinity);
