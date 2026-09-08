import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  callDataService: vi.fn(),
  findUnique: vi.fn(),
  d1Enabled: false,
}));

vi.mock("@/auth", () => ({ auth: state.auth }));
vi.mock("@/lib/prisma", () => ({ default: { submission: { findUnique: state.findUnique } } }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => state.d1Enabled }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService: state.callDataService }));
vi.mock("@/lib/d1/route-errors", () => ({ dataServiceErrorResponse: () => null }));

import { encryptSubmissionSecrets } from "@/lib/security/submission-secrets";
import { POST } from "./route";

const key = Buffer.alloc(32, 7).toString("base64");
const request = (field: string) => new Request("http://localhost", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ field }),
}) as never;

beforeEach(() => {
  vi.clearAllMocks();
  state.d1Enabled = false;
  process.env.SUBMISSION_ENCRYPTION_KEY = key;
  state.auth.mockResolvedValue({ user: { id: "admin-1", role: "super" } });
});

describe("admin submission secret reveal", () => {
  it("rejects non-super administrators", async () => {
    state.auth.mockResolvedValue({ user: { id: "admin-1", role: "operator" } });
    const response = await POST(request("GmailPW"), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects unknown fields without querying data", async () => {
    const response = await POST(request("password"), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(400);
    expect(state.findUnique).not.toHaveBeenCalled();
  });

  it("decrypts a Prisma value and keeps the audit log secret-free", async () => {
    state.findUnique.mockResolvedValue({
      GmailPW: encryptSubmissionSecrets({ GmailPW: "secret-value" }, "user-1").GmailPW,
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await POST(request("GmailPW"), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ field: "GmailPW", value: "secret-value" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(info.mock.calls.flat().join(" ")).not.toContain("secret-value");
    info.mockRestore();
  });

  it("decrypts a D1 value", async () => {
    state.d1Enabled = true;
    state.callDataService.mockResolvedValue({
      GmailPW: encryptSubmissionSecrets({ GmailPW: "d1-secret" }, "user-1").GmailPW,
    });
    const response = await POST(request("GmailPW"), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ field: "GmailPW", value: "d1-secret" });
    expect(state.callDataService).toHaveBeenCalledWith("admin-domain/submission-admin-get", {
      adminId: "admin-1",
      userId: "user-1",
    });
  });
});
