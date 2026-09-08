import "server-only";

import { callDataService } from "./service-client";
import type { AdminAuthRecord, UserAuthRecord } from "./domains/auth";
import type { AdminAuthState } from "./domains/auth";

export function findD1UserByEmail(identifier: string) {
  return callDataService<UserAuthRecord | null>("auth/user-by-email", { identifier });
}

export function findD1UserByPhone(identifier: string) {
  return callDataService<UserAuthRecord | null>("auth/user-by-phone", { identifier });
}

export function findD1AdminByEmail(identifier: string) {
  return callDataService<AdminAuthRecord | null>("auth/admin-by-email", { identifier });
}

export function findD1AdminState(adminId: string) {
  return callDataService<AdminAuthState | null>("auth/admin-state", { adminId });
}
