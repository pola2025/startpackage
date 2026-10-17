import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  callDataService: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => {
  class DataServiceRequestError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return { callDataService: mocks.callDataService, DataServiceRequestError };
});

import { NextRequest } from "next/server";
import { DataServiceRequestError } from "@/lib/d1/service-client";
import { GET } from "./route";

const get = (query = "") =>
  GET(new NextRequest(`https://example.test/api/admin/meta-setup${query}`));

describe("GET /api/admin/meta-setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "admin-1", role: "operator" },
    });
  });

  it("rejects a session without an admin role", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    expect((await get()).status).toBe(403);
    mocks.auth.mockResolvedValueOnce(null);
    expect((await get()).status).toBe(403);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("reads the pending tab 30 at a time by default", async () => {
    mocks.callDataService.mockResolvedValue({
      items: [],
      counts: { pending: 0, done: 0 },
      nextCursor: null,
    });
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.callDataService).toHaveBeenCalledWith(
      "content-domain/meta-setup-admin-list",
      { adminId: "admin-1", stage: "pending", pageSize: 30 },
    );
  });

  it("passes the done tab and cursor through", async () => {
    mocks.callDataService.mockResolvedValue({
      items: [],
      counts: { pending: 0, done: 0 },
      nextCursor: null,
    });
    await get("?stage=done&cursor=abc.def");
    expect(mocks.callDataService).toHaveBeenCalledWith(
      "content-domain/meta-setup-admin-list",
      { adminId: "admin-1", stage: "done", pageSize: 30, cursor: "abc.def" },
    );
  });

  it("returns only the counts for the sidebar", async () => {
    mocks.callDataService.mockResolvedValue({ pending: 2, done: 5 });
    const response = await get("?count=1");
    expect(await response.json()).toEqual({ pending: 2, done: 5 });
    expect(mocks.callDataService).toHaveBeenCalledWith(
      "content-domain/meta-setup-admin-count",
      { adminId: "admin-1" },
    );
  });

  it("rejects an unknown tab and an oversized cursor", async () => {
    expect((await get("?stage=all")).status).toBe(400);
    expect((await get(`?cursor=${"x".repeat(2049)}`)).status).toBe(400);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("maps a data service rejection instead of a 500", async () => {
    mocks.callDataService.mockRejectedValue(
      new DataServiceRequestError(403, "Forbidden"),
    );
    expect((await get()).status).toBe(403);
  });
});
