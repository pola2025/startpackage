// Daily session extension. Opens the NID "my info" route once; success = NID_AUT expiry moved forward.
import { accountArg, openProfile, nidAuth, readMeta, writeMeta, logLine, formatExpiry, hoursSince } from "./common.mjs";

const acct = accountArg(process.argv);
const meta = readMeta(acct);

if (!meta.bootstrapAt) {
  logLine(acct, "중단 · 첫 로그인 기록이 없습니다. 사람의 bootstrap.mjs가 필요합니다.");
  process.exit(2);
}
if (hoursSince(meta.bootstrapAt) < 24) {
  logLine(acct, "중단 · 첫 로그인 후 24시간이 지나지 않았습니다. 지금 연장하면 세션이 사라질 수 있습니다.");
  process.exit(6);
}

const ctx = await openProfile(acct, { headless: true });
const before = await nidAuth(ctx);
if (!before) {
  await ctx.close();
  logLine(acct, "중단 · 세션 없음. 무인 재로그인은 하지 않습니다. 사람에게 알립니다.");
  process.exit(2);
}
if (!before.persistent) {
  await ctx.close();
  logLine(acct, "중단 · 세션 쿠키라 연장할 수 없습니다.");
  process.exit(3);
}

const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("https://nid.naver.com/user2/api/route?m=routePcMyInfo", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
await page.waitForTimeout(5000);
const landed = page.url();
const after = await nidAuth(ctx);
await ctx.close();

if (/nidlogin/.test(landed) || !after) {
  logLine(acct, "실패 · 터치 후 세션이 사라졌습니다. 오늘은 다시 로그인하지 않습니다. 사람에게 알립니다.");
  process.exit(7);
}
if (after.expires > before.expires) {
  writeMeta(acct, { ...meta, lastTouchAt: new Date().toISOString(), lastExpiry: after.expires });
  logLine(acct, `성공 · 만료 ${formatExpiry(before.expires)} → ${formatExpiry(after.expires)}`);
} else {
  logLine(acct, `변화 없음 · 만료 ${formatExpiry(after.expires)}`);
}
process.exit(0);
