import "server-only";
import { callDataService } from "@/lib/d1/service-client";
import { getAccountLoginKey } from "./login-rate-limit";

export type LoginBlockRecord = {
  keyHash: string;
  attempts: number;
  windowStartedAt: number;
  lastAttemptAt: number;
  retryAfterSeconds: number;
};

export type LoginIdentity = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  cohortName: string | null;
};

export type LoginBlockView = {
  keyHash: string;
  attempts: number;
  retryAfterSeconds: number;
  lastAttemptAt: number;
  user: { id: string; name: string; phone: string | null; cohortName: string | null } | null;
};

/**
 * D1에 남은 시도 키(HMAC)를 회원 전화번호·이메일로 만든 계정 키와 대조한다.
 * 일치하지 않는 키는 IP 기록이거나 가입되지 않은 번호로 시도한 기록이다.
 */
export function matchLoginBlocks(
  blocks: LoginBlockRecord[],
  identities: LoginIdentity[],
  accountKey: (identifier: string) => string = getAccountLoginKey,
): LoginBlockView[] {
  const byKey = new Map<string, LoginIdentity>();
  for (const person of identities) {
    for (const identifier of [person.phone, person.email]) {
      if (typeof identifier === "string" && identifier.trim()) byKey.set(accountKey(identifier), person);
    }
  }
  return blocks.map((block) => {
    const person = byKey.get(block.keyHash);
    return {
      keyHash: block.keyHash,
      attempts: block.attempts,
      retryAfterSeconds: block.retryAfterSeconds,
      lastAttemptAt: block.lastAttemptAt,
      user: person
        ? { id: person.id, name: person.name?.trim() || "이름 없음", phone: person.phone, cohortName: person.cohortName }
        : null,
    };
  });
}

export async function loadLoginBlocks(adminId: string) {
  const data = await callDataService<{ windowMs: number; blocks: LoginBlockRecord[]; identities: LoginIdentity[] }>(
    "auth/login-blocks",
    { adminId },
  );
  const views = matchLoginBlocks(data.blocks, data.identities);
  return {
    windowMinutes: Math.round(data.windowMs / 60_000),
    users: views.filter((view) => view.user),
    others: views.filter((view) => !view.user),
  };
}

export async function releaseLoginBlocks(adminId: string, keyHashes: string[]) {
  return callDataService<{ cleared: number }>("auth/login-blocks-clear", { adminId, keyHashes });
}
