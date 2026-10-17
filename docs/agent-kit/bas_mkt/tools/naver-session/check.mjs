// Session health check: reads cookies only, never opens a page or the login form.
import { accountArg, openProfile, nidAuth, readMeta, formatExpiry, hoursSince } from "./common.mjs";

const acct = accountArg(process.argv);
const ctx = await openProfile(acct, { headless: true });
const auth = await nidAuth(ctx);
await ctx.close();
const meta = readMeta(acct);

if (!auth) {
  console.log(`[${acct}] 세션 없음 · 사람의 첫 로그인(bootstrap.mjs)이 필요합니다.`);
  process.exit(2);
}
if (!auth.persistent) {
  console.log(`[${acct}] 위험 · NID_AUT가 세션 쿠키입니다(로그인 상태 유지 꺼짐). 오늘은 다시 로그인하지 않습니다.`);
  process.exit(3);
}

const daysLeft = Math.floor((auth.expires * 1000 - Date.now()) / 86400000);
const age = hoursSince(meta.bootstrapAt);
const ageText = Number.isFinite(age) ? `${age.toFixed(1)}시간` : "기록 없음";
console.log(`[${acct}] 정상 · NID_AUT 영속 · 만료 ${formatExpiry(auth.expires)} (${daysLeft}일 남음) · 첫 로그인 후 ${ageText}`);
process.exit(daysLeft < 30 ? 4 : 0);
