import "server-only";
import { callDataService } from "@/lib/d1/service-client";
import type { EducationRequestMeta } from "./request-meta";

export type StudentLoginResult = { id: string; name: string; phone: string; cohortId: string; cohortName: string; startAt: number; endAt: number; outcome: "success" | "expired" | "not_started" };
export type EducationPage<T> = { items: T[]; nextCursor?: string };

export function educationData<T>(operation: string, input: Record<string, unknown>): Promise<T> {
  return callDataService<T>(`education-domain/${operation}`, input);
}

export function loginEducationStudent(phone: string, accountHash: string, meta: EducationRequestMeta) {
  return educationData<StudentLoginResult>("student-login", { phone, accountHash, ...meta });
}

export function requestEducationExtension(phone: string, meta: EducationRequestMeta) {
  return educationData<Record<string, unknown>>("extension-request", { phone, ...meta });
}

export async function recordEducationSecurityHit(meta: EducationRequestMeta, reason: string) {
  try { await educationData("security-hit", { ...meta, reason }); } catch { /* denial still succeeds when the data service is saturated */ }
}

export async function recordEducationDocument(meta: EducationRequestMeta, session: { userId?: string; cohortId?: string }) {
  return educationData("document-access", { ...meta, userId: session.userId, cohortId: session.cohortId });
}
