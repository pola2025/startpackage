import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  callDataService: vi.fn(),
  d1Enabled: false,
  submissionFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  workflowFindUnique: vi.fn(),
  workflowUpdate: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: state.auth }));
vi.mock("@/lib/prisma", () => ({
  default: {
    submission: { findUnique: state.submissionFindUnique },
    user: { findMany: state.userFindMany, update: state.userUpdate },
    workflow: { findUnique: state.workflowFindUnique, update: state.workflowUpdate },
  },
  prisma: {
    submission: { findUnique: state.submissionFindUnique },
    user: { findMany: state.userFindMany, update: state.userUpdate },
    workflow: { findUnique: state.workflowFindUnique, update: state.workflowUpdate },
  },
}));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => state.d1Enabled }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService: state.callDataService }));
vi.mock("@/lib/d1/route-errors", () => ({ dataServiceErrorResponse: () => null }));
vi.mock("@/lib/notification/notificationService", () => ({
  handleStateChange: vi.fn(),
  handleProductionComplete: vi.fn(),
  logProgress: vi.fn(),
}));

import { encryptSubmissionSecrets } from "@/lib/security/submission-secrets";
import { GET as submissionGet } from "./users/[id]/submission/route";
import { GET as homepageGet } from "./homepage/route";
import { POST as workflowUpdate } from "./workflows/update/route";

const secretKey = Buffer.alloc(32, 7).toString("base64");
const getRequest = () => new Request("http://localhost/api/admin", { method: "GET" }) as never;
const postRequest = (body: unknown) => new Request("http://localhost/api/admin/workflows/update", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
}) as never;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUBMISSION_ENCRYPTION_KEY = secretKey;
  state.d1Enabled = false;
  state.auth.mockResolvedValue({ user: { id: "admin-1", role: "operator", name: "운영자" } });
});

describe("admin route security and D1 contracts", () => {
  it("masks encrypted and legacy submission secrets and disables caching", async () => {
    state.submissionFindUnique.mockResolvedValue({
      GmailPW: encryptSubmissionSecrets({ GmailPW: "encrypted-secret" }, "user-1").GmailPW,
      도메인관리PW: "legacy-secret",
      일반필드: "보여도 됨",
    });
    const response = await submissionGet(getRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      GmailPW: "••••••••",
      도메인관리PW: "••••••••",
      일반필드: "보여도 됨",
    });
  });

  it("masks secrets nested in homepage administrator results", async () => {
    state.userFindMany.mockResolvedValue([{
      id: "user-1",
      이름: "테스트 사용자",
      email: "user@example.com",
      연락처: "01000000000",
      homepageCompleted: false,
      cohort: { id: "cohort-1", name: "테스트 기수" },
      submission: { 브랜드명: "테스트 브랜드", GmailPW: "legacy-secret", 도메인관리PW: encryptSubmissionSecrets({ 도메인관리PW: "encrypted-secret" }, "user-1").도메인관리PW },
      workflows: [],
    }]);
    const response = await homepageGet(getRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      0: { submission: { 브랜드명: "테스트 브랜드", GmailPW: "••••••••", 도메인관리PW: "••••••••" } },
    });
  });

  it("returns 503 for a missing D1 save result without calling Prisma update", async () => {
    state.d1Enabled = true;
    state.workflowFindUnique.mockResolvedValue({
      id: "workflow-1",
      userId: "user-1",
      type: "명함",
      status: "시안중",
      updatedAt: 1000,
      시안URL: null,
    });
    state.callDataService
      .mockResolvedValueOnce({ id: "workflow-1", userId: "user-1", type: "명함", status: "시안중", updatedAt: 1000, 시안URL: null })
      .mockResolvedValueOnce({});
    const response = await workflowUpdate(postRequest({ workflowId: "workflow-1", status: "발주대기" }));
    expect(response.status).toBe(503);
    expect(state.workflowUpdate).not.toHaveBeenCalled();
  });
});
