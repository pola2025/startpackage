import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const EDUCATION_COOKIE = "__Host-polarad-education";
const SESSION_LIMIT_MS = 8 * 60 * 60 * 1000;

export type EducationSession = {
  version: 1;
  mode: "student" | "admin";
  userId?: string;
  cohortId?: string;
  name?: string;
  cohortName?: string;
  ipHash: string;
  issuedAt: number;
  expiresAt: number;
};

function secret(): string {
  const value = process.env.EDUCATION_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("EDUCATION_SESSION_SECRET is not configured");
  return value;
}

function signature(body: string): Buffer {
  return createHmac("sha256", secret()).update(body).digest();
}

export function createEducationSession(input: Omit<EducationSession, "version" | "issuedAt" | "expiresAt"> & { accessEndAt?: number }): { token: string; expiresAt: number } {
  const issuedAt = Date.now();
  const expiresAt = Math.min(issuedAt + SESSION_LIMIT_MS, input.accessEndAt ?? Number.MAX_SAFE_INTEGER);
  const payload: EducationSession = { version: 1, mode: input.mode, userId: input.userId, cohortId: input.cohortId, name: input.name, cohortName: input.cohortName, ipHash: input.ipHash, issuedAt, expiresAt };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { token: `${body}.${signature(body).toString("base64url")}`, expiresAt };
}

export function verifyEducationSession(token: string | undefined, ipHash: string): EducationSession | null {
  if (!token || token.length > 4096) return null;
  const [body, encoded, ...extra] = token.split(".");
  if (!body || !encoded || extra.length) return null;
  let actual: Buffer;
  try { actual = Buffer.from(encoded, "base64url"); } catch { return null; }
  const expected = signature(body);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as EducationSession;
    if (value.version !== 1 || !["student", "admin"].includes(value.mode) || value.ipHash !== ipHash || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= Date.now()) return null;
    return value;
  } catch { return null; }
}

export async function readEducationSession(ipHash: string): Promise<EducationSession | null> {
  return verifyEducationSession((await cookies()).get(EDUCATION_COOKIE)?.value, ipHash);
}

export function educationCookieOptions(expiresAt: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", expires: new Date(expiresAt) };
}
