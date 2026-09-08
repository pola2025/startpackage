import { DataServiceError, type Database } from "../database";
import {
  consumeLoginAttempt,
  type ConsumeLoginAttemptResult,
} from "../commands/auth-attempts";

export type AdminAuthState = {
  id: string;
  role: string;
  updatedAt: number;
};

export type UserAuthRecord = {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  cohortId: string;
  cohortName: string | null;
  role: string;
  status: string;
  graduatedAt: number | null;
};

export type AdminAuthRecord = {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  twoFactorSecret: string | null;
  twoFactorEnabled: number;
  updatedAt: number;
};

export type AuthOperation = "consume-attempt" | "admin-state" | "user-by-email" | "user-by-phone" | "admin-by-email";

export async function authOperation(
  db: Database,
  operation: "consume-attempt",
  input: Parameters<typeof consumeLoginAttempt>[1],
): Promise<ConsumeLoginAttemptResult>;
export async function authOperation(
  db: Database,
  operation: "admin-state",
  input: { adminId: string },
): Promise<AdminAuthState | null>;
export async function authOperation(
  db: Database,
  operation: "user-by-email" | "user-by-phone" | "admin-by-email",
  input: { identifier: string },
): Promise<UserAuthRecord | AdminAuthRecord | null>;
export async function authOperation(
  db: Database,
  operation: AuthOperation,
  input: Parameters<typeof consumeLoginAttempt>[1] | { adminId: string } | { identifier: string },
) {
  if (operation === "consume-attempt") {
    return consumeLoginAttempt(db, input as Parameters<typeof consumeLoginAttempt>[1]);
  }

  if (operation === "user-by-email" || operation === "user-by-phone" || operation === "admin-by-email") {
    const identifier = (input as { identifier?: unknown })?.identifier;
    if (typeof identifier !== "string" || identifier.length < 1 || identifier.length > 320) {
      throw new DataServiceError(400, "Invalid auth identifier");
    }
    if (operation === "admin-by-email") {
      return db
        .prepare(
          'SELECT "id", "email", "name", "password", "role", "twoFactorSecret", "twoFactorEnabled", "updatedAt" FROM "admins" WHERE "email" = ? LIMIT 1',
        )
        .bind(identifier.trim().toLowerCase())
        .first<AdminAuthRecord>();
    }

    if (operation === "user-by-email") {
      return db
        .prepare(
          'SELECT u."id", u."email", u."password", u."이름" AS "name", u."연락처" AS "phone", u."cohortId", c."name" AS "cohortName", u."role", u."status", u."graduatedAt" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" WHERE u."email" = ? LIMIT 1',
        )
        .bind(identifier.trim().toLowerCase())
        .first<UserAuthRecord>();
    }

    const phone = identifier.replace(/-/g, "");
    if (!/^01\d{8,9}$/.test(phone)) throw new DataServiceError(400, "Invalid phone");
    const formatted = phone.length === 10
      ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
      : `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    return db
      .prepare(
        'SELECT u."id", u."email", u."password", u."이름" AS "name", u."연락처" AS "phone", u."cohortId", c."name" AS "cohortName", u."role", u."status", u."graduatedAt" FROM "users" u LEFT JOIN "cohorts" c ON c."id" = u."cohortId" WHERE u."연락처" = ? OR u."연락처" = ? LIMIT 1',
      )
      .bind(phone, formatted)
      .first<UserAuthRecord>();
  }

  const adminId = (input as { adminId?: unknown })?.adminId;
  if (typeof adminId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(adminId)) {
    throw new DataServiceError(400, "Invalid admin ID");
  }

  const row = await db
    .prepare(
      'SELECT "id", "role", "updatedAt" FROM "admins" WHERE "id" = ? LIMIT 1',
    )
    .bind(adminId)
    .first<{ id: string; role: string; updatedAt: number }>();

  return row;
}
