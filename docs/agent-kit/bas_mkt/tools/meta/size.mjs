// Size check for content the person already made.
//   node size.mjs <파일 또는 폴더> …   → card news must be 1080×1440 (3:4), reels 1080×1920 (9:16)
// Exit codes: 0 all usable · 10 at least one file must be remade · 64 usage
import fs from "node:fs";
import path from "node:path";
import { checkMedia } from "./lib.mjs";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("사용법: node size.mjs <파일 또는 폴더> …");
  process.exit(64);
}
const MEDIA = /\.(png|jpe?g|webp|mp4|mov)$/i;
const list = args.flatMap((a) => {
  const p = path.resolve(a);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return fs.readdirSync(p).filter((f) => MEDIA.test(f)).sort().map((f) => path.join(p, f));
  return [p];
});
let bad = 0;
for (const f of list) {
  const r = checkMedia(f);
  if (!r.ok) bad++;
  console.log(`${r.ok ? (r.warn ? "⚠" : "✅") : "❌"} ${r.ok && r.warn ? r.warn : r.msg}`);
}
console.log(`${list.length}개 중 다시 만들어야 하는 파일 ${bad}개`);
process.exit(bad ? 10 : 0);
