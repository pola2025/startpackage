import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, callDataService, callCore, prisma, notify } = vi.hoisted(() => {
  const fail = vi.fn(() => {
    throw new Error("Prisma must not be called while D1 is enabled");
  });
  const prisma = {
    submission: { findUnique: fail, update: fail, create: fail },
    user: { findUnique: fail, update: fail },
    workflow: { findUnique: fail, update: fail, findFirst: fail },
    designHistory: { findMany: fail, findFirst: fail, delete: fail, update: fail },
    $transaction: fail,
  };
  return {
    auth: vi.fn(),
    callDataService: vi.fn(),
    callCore: vi.fn(),
    prisma,
    notify: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ default: prisma, prisma }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService }));
vi.mock("@/lib/d1/core-client", () => ({ callCore }));
vi.mock("@/lib/d1/route-errors", () => ({ dataServiceErrorResponse: () => null }));
vi.mock("@/lib/notification/homepageRequest", () => ({ sendHomepageRequestNotifications: notify }));
vi.mock("@/lib/notification/notificationService", () => ({ handleSubmissionComplete: notify }));

import { GET as homepageGet, POST as homepage } from "../homepage/route";
import { POST as requestPrint } from "../submission/request-print/route";
import { DELETE as deleteDesignHistory } from "./workflows/[workflowId]/design-history/route";
import { encryptSubmissionSecrets } from "@/lib/security/submission-secrets";

const jsonRequest = (body: unknown) =>
  new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUBMISSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  auth.mockResolvedValue({
    user: { id: "user-1", name: "테스트 사용자", email: "user@example.com", role: "super" },
  });
  callDataService.mockResolvedValue({ notification: {} });
  notify.mockResolvedValue(undefined);
  callCore.mockImplementation(async (operation: string) =>
    operation === "submission-get"
      ? { 브랜드명: "테스트 브랜드", 업종: "서비스", 주소: "서울", 사업자등록증URL: "https://example.test/business.pdf", 프로필사진URL: "https://example.test/profile.png" }
      : { workflows: [{ id: "workflow-1", type: "명함", status: "시안중" }] },
  );
});

describe("remaining D1 route reachability", () => {
  it("routes homepage POST through content-domain without Prisma", async () => {
    const response = await homepage(jsonRequest({
      홈페이지제작방식: "외부서비스",
      해외결제카드앞면URL: "https://example.test/front.png",
      해외결제카드유효기간: "12/30",
      해외결제카드CVC: "123",
      GmailID: "test@example.com",
      GmailPW: "secret",
    }) as never);

    expect(response.status).toBe(200);
    expect(callDataService).toHaveBeenCalledWith("content-domain/homepage-update", expect.any(Object));
    const updateCall = callDataService.mock.calls.find(([operation]) => operation === "content-domain/homepage-update");
    expect(updateCall?.[1].changes.GmailPW).toBe("secret");
    expect(updateCall?.[1].changes.해외결제카드CVC).toBe("123");
    expect(prisma.submission.findUnique).not.toHaveBeenCalled();
  });

  it("masks homepage secrets on D1 GET", async () => {
    callDataService.mockResolvedValueOnce({
      GmailPW: "spenc:v1:encrypted",
      해외결제카드CVC: "spenc:v1:encrypted",
      해외결제카드유효기간: "spenc:v1:encrypted",
      해외결제카드앞면URL: "SLACK_ONLY",
      GmailID: "test@example.com",
    });
    const response = await homepageGet();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      GmailPW: "••••••••",
      해외결제카드CVC: "••••••••",
      해외결제카드유효기간: "••••••••",
      해외결제카드앞면URL: "SLACK_ONLY",
    });
  });

  it("restores masked secrets for Slack while keeping the D1 write plaintext boundary", async () => {
    const existing = encryptSubmissionSecrets({
      해외결제카드앞면URL: "SLACK_ONLY",
      해외결제카드유효기간: "12/30",
      해외결제카드CVC: "123",
      GmailPW: "secret",
    }, "user-1");
    callDataService.mockImplementation(async (operation: string) =>
      operation === "content-domain/homepage-get" ? existing : { notification: {} },
    );
    const response = await homepage(jsonRequest({
      홈페이지제작방식: "외부서비스",
      해외결제카드앞면URL: "SLACK_ONLY",
      해외결제카드유효기간: "••••••••",
      해외결제카드CVC: "••••••••",
      GmailID: "test@example.com",
      GmailPW: "••••••••",
    }) as never);
    expect(response.status).toBe(200);
    const updateCall = callDataService.mock.calls.find(([operation]) => operation === "content-domain/homepage-update");
    expect(updateCall?.[1].changes).toMatchObject({
      해외결제카드유효기간: "12/30",
      해외결제카드CVC: "123",
      GmailPW: "secret",
    });
    expect(notify).toHaveBeenCalledWith({}, expect.objectContaining({
      해외결제카드유효기간: "12/30",
      해외결제카드CVC: "123",
      GmailPW: "secret",
    }));
  });

  it("rejects masked secrets when no prior value exists", async () => {
    callDataService.mockImplementation(async (operation: string) =>
      operation === "content-domain/homepage-get" ? {} : { notification: {} },
    );
    const response = await homepage(jsonRequest({
      홈페이지제작방식: "외부서비스",
      해외결제카드앞면URL: "SLACK_ONLY",
      해외결제카드유효기간: "••••••••",
      해외결제카드CVC: "••••••••",
      GmailID: "test@example.com",
      GmailPW: "••••••••",
    }) as never);
    expect(response.status).toBe(400);
    expect(callDataService).not.toHaveBeenCalledWith("content-domain/homepage-update", expect.anything());
  });

  it("routes print request through core commands without Prisma", async () => {
    const response = await requestPrint(jsonRequest({ printTypes: ["명함", "명찰"] }));

    expect(response.status).toBe(200);
    expect(callCore).toHaveBeenCalledWith("submission-get", "user-1", { userId: "user-1" });
    expect(callCore).toHaveBeenCalledWith("request-print", "user-1", { userId: "user-1", printTypes: ["명함", "명찰"] });
    expect(prisma.submission.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("routes design-history DELETE through admin-domain without Prisma", async () => {
    const response = await deleteDesignHistory(
      new Request("http://localhost/api/admin/workflows/workflow-1/design-history?historyId=history-1", { method: "DELETE" }),
      { params: Promise.resolve({ workflowId: "workflow-1" }) },
    );

    expect(response.status).toBe(200);
    expect(callDataService).toHaveBeenCalledWith("admin-domain/design-history-delete", {
      adminId: "user-1",
      workflowId: "workflow-1",
      historyId: "history-1",
    });
    expect(prisma.designHistory.findFirst).not.toHaveBeenCalled();
    expect(prisma.workflow.update).not.toHaveBeenCalled();
  });
});
