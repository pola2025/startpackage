// Shared helpers for the Meta tools: .env, Graph/Threads calls, ledgers, locks, media sizes, caption rules.
// Tokens are read from C:\bas_mkt\.env and never printed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PRIVATE = path.join(ROOT, ".private");
export const LOGS = path.join(PRIVATE, "logs");
export const GRAPH = "https://graph.facebook.com/v21.0";
export const GRAPH_VIDEO = "https://graph-video.facebook.com/v21.0";
export const THREADS = "https://graph.threads.net/v1.0";
export const KEYS = { meta: "META_SYSTEM_USER_TOKEN", threads: "THREADS_ACCESS_TOKEN" };

/* ---------- .env ---------- */
export function readEnv(root = ROOT) {
  const file = path.join(root, ".env");
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

// Replaces one key in .env without touching other lines (used when the Threads token is refreshed).
export function writeEnvKey(key, value, root = ROOT) {
  const file = path.join(root, ".env");
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/) : [];
  let found = false;
  const next = lines.map((l) => (l.match(new RegExp(`^\\s*${key}\\s*=`)) ? ((found = true), `${key}=${value}`) : l));
  if (!found) next.splice(next.length && next[next.length - 1] === "" ? next.length - 1 : next.length, 0, `${key}=${value}`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, next.join("\n").replace(/\n*$/, "\n"));
  fs.renameSync(tmp, file);
}

/* ---------- API ---------- */
export class ApiError extends Error {
  constructor(status, body) {
    const e = body?.error || {};
    super(e.message ? String(e.message).slice(0, 300) : `HTTP ${status}`);
    this.status = status;
    this.code = e.code;
    this.subcode = e.error_subcode;
    // Meta puts the readable reason (often Korean) here; ads.mjs shows it to the person.
    this.userMsg = [e.error_user_title, e.error_user_msg].filter(Boolean).join(" · ").slice(0, 300);
  }
}

// One call with a 30 s timeout. Retries network errors and 5xx twice; never retries 4xx or 429.
export function makeApi(fetchImpl = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  return async function api(method, url, { token, params, form, headers } = {}) {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
    let body;
    if (form instanceof FormData) body = form;
    else if (form) body = new URLSearchParams(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
    const h = { ...(headers || {}) };
    if (token) h.Authorization = `Bearer ${token}`;
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetchImpl(u.toString(), { method, headers: h, body, signal: AbortSignal.timeout(30000) });
      } catch (e) {
        if (attempt < 2) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new ApiError(0, { error: { message: `네트워크 오류: ${e.message}` } });
      }
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text.slice(0, 200) };
      }
      if (res.ok && !json.error) return json;
      if (res.status >= 500 && attempt < 2) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new ApiError(res.status, json);
    }
  };
}

/* ---------- files, ledgers, locks ---------- */
export const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
export const fileSha = (f) => sha(fs.readFileSync(f));
export const norm = (t) => String(t || "").normalize("NFC").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();

export function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
export function appendJsonl(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(row) + "\n");
}
export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}
export function logLine(name, msg, root = ROOT) {
  const dir = path.join(root, ".private", "logs");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, name), `${new Date().toISOString()} ${msg}\n`);
}

// Exclusive lock file; a lock older than 30 minutes is treated as left over from a crash.
export function takeLock(name, root = ROOT) {
  const file = path.join(root, ".private", `${name}.lock`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs > 30 * 60000) fs.rmSync(file);
    fs.writeFileSync(file, String(process.pid), { flag: "wx" });
  } catch {
    return null;
  }
  return () => fs.rmSync(file, { force: true });
}

/* ---------- media sizes (no external tools) ---------- */
export function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), format: "png" };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), format: "jpeg" };
      i += 2 + len;
    }
  }
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return { w: 0, h: 0, format: "webp" };
  return null;
}

// Reads width/height from the first video track header and the duration from mvhd.
export function videoSize(file) {
  const b = fs.readFileSync(file);
  let w = 0, h = 0, duration = 0;
  const walk = (start, end) => {
    let i = start;
    while (i + 8 <= end) {
      let size = b.readUInt32BE(i);
      const type = b.toString("ascii", i + 4, i + 8);
      let header = 8;
      if (size === 1) {
        size = Number(b.readBigUInt64BE(i + 8));
        header = 16;
      } else if (size === 0) size = end - i;
      if (size < header || i + size > end) break;
      if (["moov", "trak", "mdia"].includes(type)) walk(i + header, i + size);
      else if (type === "mvhd") {
        const v = b[i + header];
        const scale = v === 1 ? b.readUInt32BE(i + header + 20) : b.readUInt32BE(i + header + 12);
        const len = v === 1 ? Number(b.readBigUInt64BE(i + header + 24)) : b.readUInt32BE(i + header + 16);
        if (scale) duration = len / scale;
      } else if (type === "tkhd" && !w) {
        const tw = b.readUInt32BE(i + size - 8) / 65536, th = b.readUInt32BE(i + size - 4) / 65536;
        if (tw && th) (w = Math.round(tw)), (h = Math.round(th));
      }
      i += size;
    }
  };
  walk(0, b.length);
  return w && h ? { w, h, duration: Math.round(duration * 10) / 10 } : null;
}

// Card news 1080×1440 (3:4, the current profile grid). Reels 1080×1920 (9:16).
export function checkMedia(file, kind) {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file);
  if (!fs.existsSync(file)) return { ok: false, msg: `${name}: 파일이 없습니다.` };
  if (kind === "reels" || [".mp4", ".mov"].includes(ext)) {
    const v = videoSize(file);
    if (!v) return { ok: false, msg: `${name}: 영상 크기를 읽지 못했습니다. MP4로 저장합니다.` };
    if (v.w !== 1080 || v.h !== 1920) return { ok: false, msg: `${name}: ${v.w}×${v.h} · 릴스는 9:16 1080×1920이어야 합니다.` };
    if (v.duration < 3) return { ok: false, msg: `${name}: ${v.duration}초 · 3초 이상이어야 합니다.` };
    return { ok: true, warn: v.duration > 90 ? `${name}: ${v.duration}초 · 90초 안쪽을 권장합니다.` : "", msg: `${name}: 1080×1920 · ${v.duration}초` };
  }
  const s = imageSize(file);
  if (!s) return { ok: false, msg: `${name}: 이미지 형식을 읽지 못했습니다. PNG 또는 JPG로 저장합니다.` };
  if (s.format === "webp") return { ok: false, msg: `${name}: WEBP는 올릴 수 없습니다. PNG 또는 JPG로 바꿉니다.` };
  if (s.w === 1080 && s.h === 1440) return { ok: true, msg: `${name}: 1080×1440` };
  const r = s.w / s.h;
  if (r < 0.749 || r > 1.91) return { ok: false, msg: `${name}: ${s.w}×${s.h} · 인스타가 받지 않는 비율입니다. 1080×1440으로 다시 만듭니다.` };
  return { ok: true, warn: `${name}: ${s.w}×${s.h} · 카드뉴스 기준은 1080×1440(3:4)입니다. 프로필 그리드에서 잘릴 수 있습니다.`, msg: `${name}: ${s.w}×${s.h}` };
}

/* ---------- Instagram caption (mobile width) ---------- */
export const EMOJI = /\p{Extended_Pictographic}/u;
export function captionIssues(caption) {
  const errors = [], warnings = [];
  const text = String(caption || "").replace(/\r/g, "");
  if (!text.trim()) errors.push("캡션이 비어 있습니다.");
  if ([...text].length > 2200) errors.push(`캡션이 ${[...text].length}자입니다. 2,200자 안으로 줄입니다.`);
  const tags = text.match(/#[^\s#]+/g) || [];
  if (tags.length > 30) errors.push(`해시태그가 ${tags.length}개입니다. 30개를 넘으면 게시되지 않습니다.`);
  if (/\n\s*\n\s*\n/.test(text)) warnings.push("빈 줄이 두 줄 이상 이어진 곳이 있습니다. 빈 줄은 하나만 둡니다.");
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const body = paras.filter((p) => !p.startsWith("#"));
  const long = body.flatMap((p) => p.split("\n")).filter((l) => [...l.trim()].length > 22);
  if (long.length) warnings.push(`한 줄이 22자를 넘는 줄이 ${long.length}개입니다. 모바일 폭(14~20자)으로 의미 단위에서 줄을 바꿉니다: "${long[0].slice(0, 24)}…"`);
  const lump = body.find((p) => p.split("\n").length > 6);
  if (lump) warnings.push(`7줄 이상 이어진 문단이 있습니다. 문장 덩어리가 되지 않게 문단을 나눕니다: "${lump.slice(0, 20)}…"`);
  const noEmoji = body.filter((p) => !EMOJI.test(p)).length;
  if (body.length && noEmoji > body.length / 2) warnings.push(`이모지가 없는 문단이 ${noEmoji}/${body.length}개입니다. 문단 첫머리와 핵심 줄에 이모지를 씁니다.`);
  const lastTagLine = paras.length && paras[paras.length - 1].startsWith("#");
  if (tags.length && !lastTagLine) warnings.push("해시태그는 마지막 문단에 한 줄로 모읍니다.");
  return { errors, warnings, paragraphs: body.length, hashtags: tags.length };
}

// Deterministic fallback wrap at word boundaries (the agent still polishes meaning units).
export function igWrap(text, maxLen = 20) {
  return String(text)
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (t === "" || t.startsWith("#") || [...line].length <= maxLen) return line;
      const out = [];
      let cur = "";
      for (const w of line.split(" ")) {
        const next = cur ? `${cur} ${w}` : w;
        if ([...next].length > maxLen && cur) {
          out.push(cur);
          cur = w;
        } else cur = next;
      }
      if (cur) out.push(cur);
      return out.join("\n");
    })
    .join("\n");
}
