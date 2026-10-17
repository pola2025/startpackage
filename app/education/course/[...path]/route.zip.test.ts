import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/education/request-meta", () => ({
  educationRequestMeta: () => ({ ipHash: "test-ip", userAgent: "Mozilla/5.0" }),
  isAutomatedAgent: () => false,
}));
vi.mock("@/lib/education/session", () => ({
  readEducationSession: vi.fn(async () => ({ expiresAt: Date.now() + 60_000 })),
}));
vi.mock("@/lib/education/data", () => ({
  recordEducationDocument: vi.fn(async () => undefined),
  recordEducationSecurityHit: vi.fn(async () => undefined),
}));

import { GET } from "./route";

const KIT = ["assets", "downloads", "bas_mkt-agent-kit.zip"];

describe("education course downloads", () => {
  it("serves the agent kit zip as an attachment", async () => {
    const response = await GET(
      new Request(
        "https://mkt.polaai.co.kr/education/course/assets/downloads/bas_mkt-agent-kit.zip",
      ),
      { params: Promise.resolve({ path: KIT }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="bas_mkt-agent-kit.zip"',
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);
  });

  it("still refuses file types outside the allow list", async () => {
    const response = await GET(
      new Request(
        "https://mkt.polaai.co.kr/education/course/assets/downloads/AGENTS.md",
      ),
      {
        params: Promise.resolve({ path: ["assets", "downloads", "AGENTS.md"] }),
      },
    );
    expect(response.status).toBe(404);
  });
});
