import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { current: null as unknown },
  d1Enabled: { value: true },
  callDataService: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: async () => mocks.session.current }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => mocks.d1Enabled.value }));
vi.mock("@/lib/d1/service-client", () => {
  class DataServiceRequestError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  return { callDataService: mocks.callDataService, DataServiceRequestError };
});

import { GET, POST } from "./route";
import { getAccountLoginKey } from "@/lib/auth/login-rate-limit";
import { DataServiceRequestError } from "@/lib/d1/service-client";

const admin = { user: { id: "admin-1", role: "operator" } };
const memberKey = getAccountLoginKey("01011112222");
const otherKey = "f".repeat(64);

function post(body: unknown) {
  return POST(new Request("https://example.test/api/admin/login-blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("/api/admin/login-blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.current = admin;
    mocks.d1Enabled.value = true;
  });

  it("rejects non-administrators", async () => {
    mocks.session.current = { user: { id: "user-1", role: "user" } };
    expect((await GET()).status).toBe(403);
    expect((await post({ keyHashes: [otherKey] })).status).toBe(403);
    mocks.session.current = null;
    expect((await GET()).status).toBe(403);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("matches blocked keys to members by phone without leaking other identities", async () => {
    mocks.callDataService.mockResolvedValue({
      windowMs: 900_000,
      blocks: [
        { keyHash: memberKey, attempts: 6, windowStartedAt: 1, lastAttemptAt: 2, retryAfterSeconds: 600 },
        { keyHash: otherKey, attempts: 52, windowStartedAt: 1, lastAttemptAt: 3, retryAfterSeconds: 300 },
      ],
      identities: [
        { id: "user-1", name: "홍길동 ", phone: "010-1111-2222", email: "hong@test.invalid", cohortName: "27기" },
        { id: "user-2", name: "김철수", phone: "01033334444", email: "kim@test.invalid", cohortName: "27기" },
      ],
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.json();
    expect(mocks.callDataService).toHaveBeenCalledWith("auth/login-blocks", { adminId: "admin-1" });
    expect(body).toMatchObject({ enabled: true, windowMinutes: 15 });
    expect(body.users).toEqual([{
      keyHash: memberKey, attempts: 6, retryAfterSeconds: 600, lastAttemptAt: 2,
      user: { id: "user-1", name: "홍길동", phone: "010-1111-2222", cohortName: "27기" },
    }]);
    expect(body.others).toEqual([{ keyHash: otherKey, attempts: 52, retryAfterSeconds: 300, lastAttemptAt: 3, user: null }]);
    expect(JSON.stringify(body)).not.toContain("kim@test.invalid");
  });

  it("matches members who log in with an email address", async () => {
    mocks.callDataService.mockResolvedValue({
      windowMs: 900_000,
      blocks: [{ keyHash: getAccountLoginKey("Hong@Test.invalid"), attempts: 5, windowStartedAt: 1, lastAttemptAt: 2, retryAfterSeconds: 60 }],
      identities: [{ id: "user-1", name: "홍길동", phone: null, email: "hong@test.invalid", cohortName: null }],
    });
    const body = await (await GET()).json();
    expect(body.users[0].user.id).toBe("user-1");
  });

  it("reports that release is unavailable without the D1 limiter", async () => {
    mocks.d1Enabled.value = false;
    expect(await (await GET()).json()).toMatchObject({ enabled: false, users: [], others: [] });
    expect((await post({ keyHashes: [otherKey] })).status).toBe(409);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("releases only validated keys", async () => {
    expect((await post({ keyHashes: [] })).status).toBe(400);
    expect((await post({ keyHashes: ["not-a-key"] })).status).toBe(400);
    expect((await post({ keyHashes: [otherKey], extra: true })).status).toBe(400);
    expect(mocks.callDataService).not.toHaveBeenCalled();

    mocks.callDataService.mockResolvedValue({ cleared: 2 });
    const response = await post({ keyHashes: [memberKey, otherKey] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cleared: 2 });
    expect(mocks.callDataService).toHaveBeenCalledWith("auth/login-blocks-clear", { adminId: "admin-1", keyHashes: [memberKey, otherKey] });
  });

  it("maps data service failures to safe messages", async () => {
    mocks.callDataService.mockRejectedValue(new DataServiceRequestError(403, "Data service request failed (403)"));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "권한이 없습니다." });
  });
});
