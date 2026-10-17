// First login (bootstrap). A person types the ID and password; this script never types credentials.
// It turns on "로그인 상태 유지", then polls cookies only (no page.goto while waiting).
import { accountArg, openProfile, nidAuth, readMeta, writeMeta, formatExpiry, hoursSince } from "./common.mjs";

const acct = accountArg(process.argv);
const meta = readMeta(acct);

if (hoursSince(meta.lastLoginAt) < 20) {
  console.error(`[${acct}] 오늘 이미 로그인했습니다. 같은 날 다시 로그인하면 보호조치가 걸릴 수 있어 중단합니다. 내일 다시 진행합니다.`);
  process.exit(5);
}

const ctx = await openProfile(acct, { headless: false });
const existing = await nidAuth(ctx);
if (existing?.persistent) {
  console.log(`[${acct}] 이미 영속 세션이 있습니다(만료 ${formatExpiry(existing.expires)}). 로그인하지 않습니다.`);
  await ctx.close();
  process.exit(0);
}

const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(
  "https://nid.naver.com/nidlogin.login?mode=form&url=" + encodeURIComponent("https://blog.naver.com/MyBlog.naver"),
  { waitUntil: "domcontentloaded" },
);

// The checkbox box is 1x1px, so click its label and verify the real state.
const keepOn = () => page.evaluate(() => document.querySelector("#loginStay")?.checked === true).catch(() => false);
for (let i = 0; i < 3 && !(await keepOn()); i++) {
  await page.locator('label[for="loginStay"]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
}
console.log((await keepOn())
  ? "로그인 상태 유지: 켜짐"
  : "로그인 상태 유지를 켜지 못했습니다. 브라우저 창에서 '로그인 상태 유지'를 직접 체크해 주세요.");
console.log("브라우저 창에서 네이버 아이디와 비밀번호를 직접 입력하고 로그인 버튼을 눌러 주세요. 새 기기 등록 화면이 나오면 '등록안함'을 누릅니다.");

let auth = null;
let closed = false;
ctx.on("close", () => { closed = true; });
const deadline = Date.now() + 15 * 60 * 1000;
while (!closed && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 3000));
  auth = await nidAuth(ctx).catch(() => null);
  if (auth) break;
}

if (!auth) {
  console.error(`[${acct}] 15분 안에 로그인이 확인되지 않았습니다(또는 창이 닫혔습니다). 다시 실행하면 이어서 진행합니다.`);
  if (!closed) await ctx.close();
  process.exit(2);
}

writeMeta(acct, { ...meta, lastLoginAt: new Date().toISOString() });
await new Promise((r) => setTimeout(r, 6000));
auth = (await nidAuth(ctx).catch(() => null)) || auth;
if (!closed) await ctx.close();

if (!auth.persistent) {
  console.error(`[${acct}] 실패 · NID_AUT가 세션 쿠키입니다(로그인 상태 유지 꺼짐). 오늘은 다시 로그인하지 말고 내일 다시 진행합니다.`);
  process.exit(3);
}

writeMeta(acct, { ...readMeta(acct), bootstrapAt: new Date().toISOString(), lastExpiry: auth.expires });
console.log(`[${acct}] 성공 · NID_AUT 영속 · 만료 ${formatExpiry(auth.expires)}. 세션 연장(touch.mjs)은 24시간 뒤부터 가능합니다.`);
process.exit(0);
