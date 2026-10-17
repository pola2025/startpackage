// Text helpers shared by build.mjs and check.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const LINE_MAX = 20; // Hangul width units per line, same as publish.mjs
export const PARAGRAPH_MAX_LINES = 4;
export const BODY_MIN_CHARS = 2800; // spaces included, line breaks excluded

// Same width rule as publish.mjs: ASCII and Latin-1 count as half a Hangul character.
export const width = (s) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) <= 0xff ? 0.5 : 1), 0);

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${path.basename(file)} 파일이 없습니다.`);
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    throw new Error(`${path.basename(file)} JSON 형식 오류: ${e.message}`);
  }
};

// Greedy word wrap for text the tool writes itself (sources line). Authored body text is never re-wrapped.
export function wrapKo(text, max = LINE_MAX) {
  return text
    .split("\n")
    .map((line) => {
      if (width(line) <= max) return line;
      const out = [];
      let cur = "";
      for (const word of line.split(" ")) {
        const next = cur ? `${cur} ${word}` : word;
        if (width(next) <= max || !cur) cur = next;
        else {
          out.push(cur);
          cur = word;
        }
      }
      if (cur) out.push(cur);
      return out.join("\n");
    })
    .join("\n");
}

// Joined body text for searching: line breaks inside a paragraph become spaces.
export const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const squash = (s) => String(s ?? "").replace(/\s+/g, "");

// Numbers written in the post: 2,100 / 2.5 / 1/2 / 2026 → tokens without thousands separators.
export const numbersIn = (s) => (String(s).match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,(?=\d{3}\b)/g, ""));

export function bodyTexts(plan) {
  const out = [];
  if (plan.lead) out.push(["리드", plan.lead]);
  (plan.cards || []).forEach((c, i) => c.text && out.push([`카드 ${i + 1} 문단`, c.text]));
  (plan.sections || []).forEach((s, i) => (s.blocks || []).forEach((b, k) => b.text && out.push([`섹션 ${i + 1} 블록 ${k + 1}`, b.text])));
  if (plan.closing) out.push(["정리", plan.closing]);
  return out;
}

export const bodyChars = (plan) => bodyTexts(plan).reduce((n, [, t]) => n + [...t.replace(/\r?\n/g, "")].length, 0);

export function loadBrand() {
  const file = path.join(ROOT, "brand.json");
  const b = readJson(file);
  const errors = [];
  if (!b.company) errors.push("company(회사명)가 비어 있습니다.");
  if (!/^https:\/\/\S+$/.test(b.homepage || "")) errors.push("homepage는 https:// 주소여야 합니다.");
  if (!/^#[0-9a-f]{6}$/i.test(b.color || "")) errors.push("color는 #과 여섯 자리 색 코드여야 합니다(예: #285EC0).");
  if (b.cta && !["A", "B", "C"].includes(b.cta)) errors.push("cta는 A, B, C 중 하나입니다.");
  if (errors.length) throw new Error(`brand.json 오류: ${errors.join(" ")}`);
  const logoFile = b.logo ? path.resolve(ROOT, b.logo) : "";
  return { ...b, cta: b.cta || "A", logoFile: logoFile && fs.existsSync(logoFile) ? logoFile : "", file };
}

export function dataUri(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}
