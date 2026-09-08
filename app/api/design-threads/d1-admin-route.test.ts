import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ auth: vi.fn(), callDataService: vi.fn(), callCore: vi.fn(), dataServiceErrorResponse: vi.fn(() => null) }));
vi.mock("@/auth", () => ({ auth: state.auth }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService: state.callDataService }));
vi.mock("@/lib/d1/core-client", () => ({ callCore: state.callCore }));
vi.mock("@/lib/d1/route-errors", () => ({ dataServiceErrorResponse: state.dataServiceErrorResponse }));

import { GET as list } from "./route";
import { GET as detail } from "./[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  state.auth.mockResolvedValue({ user: { id: "admin-1", role: "operator" } });
  state.callDataService.mockResolvedValue({ threads: [] });
  state.dataServiceErrorResponse.mockReturnValue(null);
});

describe("D1 design thread administrator routes", () => {
  it("uses the bounded admin list operation with administrator filters", async () => {
    const response = await list(new Request("http://localhost/api/design-threads?status=pending&type=명함&userId=user-1&pageSize=10") as never);
    expect(response.status).toBe(200);
    expect(state.callDataService).toHaveBeenCalledWith("admin-domain/design-threads-list", {
      adminId: "admin-1", status: "pending", workflowType: "명함", userId: "user-1", pageSize: "10", cursor: undefined,
    });
    expect(state.callCore).not.toHaveBeenCalled();
  });

  it("uses the administrator detail operation and preserves cursor inputs", async () => {
    const response = await detail(new Request("http://localhost/api/design-threads/thread-1?pageSize=20&cursor=cursor-1") as never, { params: Promise.resolve({ id: "thread-1" }) });
    expect(response.status).toBe(200);
    expect(state.callDataService).toHaveBeenCalledWith("admin-domain/design-thread-get", {
      adminId: "admin-1", threadId: "thread-1", pageSize: "20", cursor: "cursor-1",
    });
    expect(state.callCore).not.toHaveBeenCalled();
  });

  it("returns the data-service error response instead of a generic 500", async () => {
    const serviceResponse = new Response(JSON.stringify({ error: "Data service unavailable" }), { status: 503 });
    state.callDataService.mockRejectedValueOnce(new Error("service down"));
    state.dataServiceErrorResponse.mockReturnValueOnce(serviceResponse as never);

    const response = await list(new Request("http://localhost/api/design-threads") as never);

    expect(response).toBe(serviceResponse);
    expect(response.status).toBe(503);
  });
});
