import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { callDataService, DataServiceRequestError } from "./service-client";

function failWith(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

async function rejection(): Promise<DataServiceRequestError> {
  try {
    await callDataService("core/workflow-approve", {});
  } catch (error) {
    return error as DataServiceRequestError;
  }
  throw new Error("expected callDataService to fail");
}

describe("callDataService errors", () => {
  beforeEach(() => {
    vi.stubEnv("D1_DATA_SERVICE_URL", "https://data.example.com");
    vi.stubEnv("D1_DATA_SERVICE_TOKEN", "t".repeat(40));
    vi.stubEnv("D1_MIGRATION_MAINTENANCE", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps the Korean message from a 4xx response", async () => {
    failWith(400, { error: "시안컨펌요청 상태에서만 확정할 수 있습니다." });
    const error = await rejection();
    expect(error.status).toBe(400);
    expect(error.publicMessage).toBe(
      "시안컨펌요청 상태에서만 확정할 수 있습니다.",
    );
    expect(error.message).toBe("Data service request failed (400)");
  });

  it("drops English diagnostics and 5xx bodies", async () => {
    failWith(400, { error: "Invalid workflow update" });
    expect((await rejection()).publicMessage).toBeUndefined();
    failWith(503, { error: "서비스 내부 오류" });
    expect((await rejection()).publicMessage).toBeUndefined();
  });

  it("sends every domain the data worker routes, including roster-domain", async () => {
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response(JSON.stringify({ rosterSize: 0 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    for (const operation of ["roster-domain/signup-check", "roster-domain/reminder-candidates", "education-domain/student-login"]) {
      await callDataService(operation, {});
    }
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://data.example.com/v1/roster-domain/signup-check",
      "https://data.example.com/v1/roster-domain/reminder-candidates",
      "https://data.example.com/v1/education-domain/student-login",
    ]);
    await expect(callDataService("unknown-domain/x", {})).rejects.toThrow("Unknown D1 operation");
  });
});
