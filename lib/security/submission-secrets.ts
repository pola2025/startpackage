import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { MASKED_SECRET } from "./submission-secret-mask";
export { MASKED_SECRET } from "./submission-secret-mask";
const ENCRYPTED_PREFIX = "spenc:v1:";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SECRET_FIELDS = [
  "도메인관리PW",
  "네이버검색광고PW",
  "네이버클라우드PW",
  "InstagramPW",
  "아임웹PW",
  "아임웹관리자PW",
  "GmailPW",
  "해외결제카드CVC",
  "해외결제카드유효기간",
  "해외결제카드앞면URL",
  "해외결제카드뒷면URL",
  "신용카드앞면URL",
] as const;

type SecretField = (typeof SECRET_FIELDS)[number];
type SecretRecord = object;

export function encryptSubmissionSecrets<T extends SecretRecord>(
  record: T,
  userId: string,
  key?: string,
): T {
  const keyBytes = hasSecretValue(record, false) ? resolveKey(key) : undefined;
  return transformRecord(record, (field, value) => {
    if (!isSecretField(field) || isEmptySecret(value)) return value;
    if (typeof value !== "string") throw new Error(`Invalid submission secret type: ${field}`);
    if (value === "SLACK_ONLY" || value.startsWith(ENCRYPTED_PREFIX)) {
      if (value.startsWith(ENCRYPTED_PREFIX)) {
        if (!keyBytes) throw new Error("SUBMISSION_ENCRYPTION_KEY is required");
        validateEncrypted(value, userId, field, keyBytes);
      }
      return value;
    }
    if (!keyBytes) throw new Error("SUBMISSION_ENCRYPTION_KEY is required");
    return encryptValue(value, userId, field, keyBytes);
  }, true);
}

export function decryptSubmissionSecrets<T extends SecretRecord>(
  record: T,
  userId: string,
  key?: string,
): T {
  const keyBytes = hasSecretValue(record, true) ? resolveKey(key) : undefined;
  return transformRecord(record, (field, value) => {
    if (!isSecretField(field) || isEmptySecret(value)) return value;
    if (typeof value !== "string") throw new Error(`Invalid submission secret type: ${field}`);
    if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
    if (!keyBytes) throw new Error("SUBMISSION_ENCRYPTION_KEY is required");
    return decryptValue(value, userId, field, keyBytes);
  }, true);
}

export function maskSubmissionSecrets<T extends SecretRecord>(record: T): T {
  return transformRecord(record, (_field, value) => {
    if (isEmptySecret(value) || value === "SLACK_ONLY") return value;
    return MASKED_SECRET;
  }, true);
}

export function maskSubmissionSecretsDeep<T>(value: T): T {
  return transformNestedSecrets(value, (_field, secret) => {
    if (isEmptySecret(secret) || secret === "SLACK_ONLY") return secret;
    return MASKED_SECRET;
  }) as T;
}

export function dropMaskedSecretFields<T extends object>(record: T): T {
  return dropMaskedNested(record) as T;
}

function transformRecord<T extends SecretRecord>(
  record: T,
  transform: (field: string, value: unknown) => unknown,
  recurseAutoSaveData: boolean,
): T {
  const copy = { ...record } as Record<string, unknown>;
  for (const field of SECRET_FIELDS) {
    if (field in copy) copy[field] = transform(field, copy[field]);
  }
  if (recurseAutoSaveData && "autoSaveData" in copy) {
    copy.autoSaveData = transformAutoSaveData(copy.autoSaveData, transform);
  }
  return copy as T;
}

function transformAutoSaveData(
  data: unknown,
  transform: (field: string, value: unknown) => unknown,
): unknown {
  if (typeof data === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return data;
    }
    return JSON.stringify(transformNestedSecrets(parsed, transform));
  }
  return transformNestedSecrets(data, transform);
}

function transformNestedSecrets(
  value: unknown,
  transform: (field: string, value: unknown) => unknown,
): unknown {
  if (Array.isArray(value)) return value.map((entry) => transformNestedSecrets(entry, transform));
  if (!isRecord(value)) return value;
  const copy = { ...value };
  for (const [field, entry] of Object.entries(copy)) {
    if (isSecretField(field)) copy[field] = transform(field, entry);
    else if (field === "autoSaveData") copy[field] = transformAutoSaveData(entry, transform);
    else if (isRecord(entry) || Array.isArray(entry)) copy[field] = transformNestedSecrets(entry, transform);
  }
  return copy;
}

function isSecretField(field: string): field is SecretField {
  return (SECRET_FIELDS as readonly string[]).includes(field);
}

function isEmptySecret(value: unknown): value is null | undefined | "" {
  return value === null || value === undefined || value === "";
}

function resolveKey(key?: string): Buffer {
  const encoded = key ?? process.env.SUBMISSION_ENCRYPTION_KEY;
  if (!encoded) throw new Error("SUBMISSION_ENCRYPTION_KEY is required");
  let decoded: Buffer;
  try {
    decoded = Buffer.from(encoded, "base64");
  } catch {
    throw new Error("SUBMISSION_ENCRYPTION_KEY must be base64 encoded");
  }
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const canonical = decoded.toString("base64").replace(/=+$/, "");
  if (decoded.length !== KEY_BYTES || normalized !== canonical) {
    throw new Error("SUBMISSION_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return decoded;
}

function encryptValue(value: string, userId: string, field: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(`${userId}:${field}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [ENCRYPTED_PREFIX.slice(0, -1), encode(iv), encode(cipher.getAuthTag()), encode(ciphertext)].join(":");
}

function decryptValue(value: string, userId: string, field: string, key: Buffer): string {
  const [prefix, version, ivPart, tagPart, ciphertextPart] = value.split(":");
  if (`${prefix}:${version}:` !== ENCRYPTED_PREFIX || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Invalid encrypted submission secret");
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, decode(ivPart));
    decipher.setAAD(Buffer.from(`${userId}:${field}`, "utf8"));
    decipher.setAuthTag(decode(tagPart));
    return Buffer.concat([decipher.update(decode(ciphertextPart)), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Unable to decrypt submission secret");
  }
}

function validateEncrypted(value: string, userId: string, field: string, key: Buffer): void {
  decryptValue(value, userId, field, key);
}

function encode(value: Buffer): string {
  return value.toString("base64url");
}

function decode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasSecretValue(value: unknown, encryptedOnly: boolean): boolean {
  if (Array.isArray(value)) return value.some((entry) => hasSecretValue(entry, encryptedOnly));
  if (typeof value === "string") {
    if (!encryptedOnly) return false;
    return value.startsWith(ENCRYPTED_PREFIX);
  }
  if (!isRecord(value)) return false;
  for (const [field, entry] of Object.entries(value)) {
    if (isSecretField(field) && !isEmptySecret(entry) && entry !== "SLACK_ONLY") {
      if (!encryptedOnly || (typeof entry === "string" && entry.startsWith(ENCRYPTED_PREFIX))) return true;
    }
    if (field === "autoSaveData" && typeof entry === "string") {
      try {
        if (hasSecretValue(JSON.parse(entry), encryptedOnly)) return true;
      } catch {
        continue;
      }
    } else if (isRecord(entry) || Array.isArray(entry)) {
      if (hasSecretValue(entry, encryptedOnly)) return true;
    }
  }
  return false;
}

function dropMaskedNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropMaskedNested);
  if (typeof value === "string") return value;
  if (!isRecord(value)) return value;
  const copy: Record<string, unknown> = {};
  for (const [field, entry] of Object.entries(value)) {
    if (isSecretField(field) && entry === MASKED_SECRET) continue;
    if (field === "autoSaveData" && typeof entry === "string") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry);
      } catch {
        copy[field] = entry;
        continue;
      }
      copy[field] = JSON.stringify(dropMaskedNested(parsed));
      continue;
    }
    copy[field] = dropMaskedNested(entry);
  }
  return copy;
}
