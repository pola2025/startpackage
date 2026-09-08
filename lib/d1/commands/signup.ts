import { DataServiceError, type Database } from "../database";

const WORKFLOW_TYPES = [
  "로고",
  "명함",
  "명찰",
  "대봉투",
  "자문계약서 표지",
  "자문계약서 내지",
  "홈페이지",
] as const;

export type SignupInput = {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  cohortId: string;
  now?: number;
  createId?: () => string;
};

export type SignupResult = {
  userId: string;
  workflowIds: string[];
  submissionId: string;
  cohortId: string;
};

type ExistingRow = { id: string };

function invalid(message: string): never {
  throw new DataServiceError(400, message);
}

function normalizeInput(input: SignupInput): Omit<SignupInput, "now" | "createId"> {
  if (!input || typeof input !== "object") invalid("가입 정보가 유효하지 않습니다.");

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.replace(/-/g, "") : "";
  const cohortId = typeof input.cohortId === "string" ? input.cohortId.trim() : "";
  const passwordHash = typeof input.passwordHash === "string" ? input.passwordHash : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    invalid("이메일이 유효하지 않습니다.");
  }
  if (!/^[가-힣a-zA-Z\s]{2,50}$/.test(name)) {
    invalid("이름이 유효하지 않습니다.");
  }
  if (!/^01\d{8,9}$/.test(phone)) {
    invalid("연락처가 유효하지 않습니다.");
  }
  if (passwordHash.length === 0 || passwordHash.length > 1024) {
    invalid("비밀번호 해시가 유효하지 않습니다.");
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cohortId)) {
    invalid("기수 ID가 유효하지 않습니다.");
  }

  return { email, passwordHash, name, phone, cohortId };
}

function defaultId(): string {
  return crypto.randomUUID();
}

function duplicate(message: string): never {
  throw new DataServiceError(409, message);
}

export async function createSignup(db: Database, input: SignupInput): Promise<SignupResult> {
  const normalized = normalizeInput(input);
  const createId = input.createId ?? defaultId;
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0) invalid("가입 시각이 유효하지 않습니다.");

  const existingEmail = await db
    .prepare('SELECT "id" FROM "users" WHERE "email" = ? LIMIT 1')
    .bind(normalized.email)
    .first<ExistingRow>();
  if (existingEmail) duplicate("이미 등록된 이메일입니다.");

  const existingPhone = await db
    .prepare('SELECT "id" FROM "users" WHERE "연락처" = ? OR "연락처" = ? LIMIT 1')
    .bind(normalized.phone, formatPhone(normalized.phone))
    .first<ExistingRow>();
  if (existingPhone) duplicate("이미 등록된 전화번호입니다.");

  const cohort = await db
    .prepare('SELECT "id" FROM "cohorts" WHERE "id" = ? LIMIT 1')
    .bind(normalized.cohortId)
    .first<ExistingRow>();
  if (!cohort) throw new DataServiceError(400, "유효하지 않은 기수입니다.");

  const userId = createId();
  const workflowIds = WORKFLOW_TYPES.map(() => createId());
  const submissionId = createId();
  const statements = [
    db
      .prepare(
        'INSERT INTO "users" ("id", "email", "password", "이름", "연락처", "cohortId", "SMS수신동의", "이메일수신동의", "role", "createdAt", "updatedAt") SELECT ?, ?, ?, ?, ?, ?, 1, 1, \'user\', ?, ? WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "email" = ? OR "연락처" = ? OR "연락처" = ?)',
      )
      .bind(
        userId,
        normalized.email,
        normalized.passwordHash,
        normalized.name,
        normalized.phone,
        normalized.cohortId,
        now,
        now,
        normalized.email,
        normalized.phone,
        formatPhone(normalized.phone),
      ),
    ...WORKFLOW_TYPES.map((type, index) =>
      db
        .prepare(
          'INSERT INTO "workflows" ("id", "userId", "type", "status", "createdAt", "updatedAt") VALUES (?, ?, ?, \'대기\', ?, ?)',
        )
        .bind(workflowIds[index], userId, type, now, now),
    ),
    db
      .prepare('INSERT INTO "submissions" ("id", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)')
      .bind(submissionId, userId, now, now),
  ];

  try {
    await db.batch(statements);
  } catch (error) {
    if (error instanceof DataServiceError) throw error;
    throw new DataServiceError(409, "가입 정보를 저장하지 못했습니다.");
  }

  return { userId, workflowIds, submissionId, cohortId: normalized.cohortId };
}

function formatPhone(phone: string): string {
  const middleLength = phone.length === 10 ? 3 : 4;
  return `${phone.slice(0, 3)}-${phone.slice(3, 3 + middleLength)}-${phone.slice(3 + middleLength)}`;
}

export { WORKFLOW_TYPES };
