// Text extraction for announcement attachments: hwpx (zip+xml), hwp (HWP 5.0 compound file), pdf, html.
import zlib from "node:zlib";
import CFB from "cfb";

const decodeXml = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");

export function htmlToText(html) {
  return decodeXml(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d|dt|dd)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

// HWPX: OWPML zip. Paragraph text lives in Contents/sectionN.xml <hp:p><hp:run><hp:t>.
function hwpx(buf) {
  const z = CFB.read(buf, { type: "buffer" });
  const secs = z.FullPaths.filter((p) => /Contents\/section\d+\.xml$/i.test(p)).sort((a, b) => +a.match(/(\d+)\.xml$/i)[1] - +b.match(/(\d+)\.xml$/i)[1]);
  if (!secs.length) throw new Error("hwpx 본문(section) 없음");
  const out = [];
  for (const p of secs) {
    const xml = Buffer.from(CFB.find(z, p).content).toString("utf8");
    for (const para of xml.match(/<hp:p[ >][\s\S]*?<\/hp:p>/g) || []) {
      const t = (para.match(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g) || []).map((m) => m.replace(/<[^>]+>/g, "")).join("");
      const line = decodeXml(t).trim();
      if (line) out.push(line);
    }
  }
  return out.join("\n");
}

// HWP 5.0: BodyText/SectionN streams (raw deflate when FileHeader flag bit0 is set), PARA_TEXT records (tag 67).
function hwp(buf) {
  const cfb = CFB.read(buf, { type: "buffer" });
  const header = CFB.find(cfb, "FileHeader");
  if (!header) throw new Error("HWP 파일 헤더 없음");
  const flags = Buffer.from(header.content).readUInt32LE(36);
  if (flags & 0x2) throw new Error("암호가 걸린 HWP");
  if (flags & 0x4) throw new Error("배포용 HWP(본문 암호화)");
  const compressed = (flags & 0x1) === 1;
  const secs = cfb.FullPaths.filter((p) => /BodyText\/Section\d+$/i.test(p)).sort((a, b) => +a.match(/(\d+)$/)[1] - +b.match(/(\d+)$/)[1]);
  const out = [];
  for (const p of secs) {
    let data = Buffer.from(CFB.find(cfb, p).content);
    if (compressed) data = zlib.inflateRawSync(data);
    for (let i = 0; i + 4 <= data.length; ) {
      const h = data.readUInt32LE(i);
      const tag = h & 0x3ff;
      let size = (h >>> 20) & 0xfff;
      i += 4;
      if (size === 0xfff) { size = data.readUInt32LE(i); i += 4; }
      if (tag === 67) {
        let s = "";
        for (let j = i; j + 1 < i + size; ) {
          const c = data.readUInt16LE(j);
          if (c < 32) {
            // char controls take 1 WCHAR; inline/extended controls take 8 WCHARs
            if (c === 0 || c === 10 || c === 13 || (c >= 24 && c <= 31)) { if (c === 10) s += "\n"; j += 2; }
            else { if (c === 9) s += "\t"; j += 16; }
            continue;
          }
          s += String.fromCharCode(c);
          j += 2;
        }
        const line = s.trim();
        if (line) out.push(line);
      }
      i += size;
    }
  }
  return out.join("\n");
}

async function pdf(buf) {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buf), { verbosity: 0 });
  const { text } = await extractText(doc, { mergePages: false });
  return text.map((t) => t.trim()).join("\n");
}

export async function extractText(buf, name) {
  const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  const sig = buf.subarray(0, 4).toString("hex");
  if (ext === "hwpx" || (ext !== "hwp" && sig === "504b0304" && /hwpx/i.test(name))) return hwpx(buf);
  if (ext === "hwp" || sig === "d0cf11e0") return hwp(buf);
  if (ext === "pdf" || buf.subarray(0, 4).toString() === "%PDF") return pdf(buf);
  if (ext === "txt") return buf.toString("utf8");
  if (ext === "html" || ext === "htm") return htmlToText(buf.toString("utf8"));
  throw new Error(`읽을 수 없는 형식(.${ext || "?"})`);
}
