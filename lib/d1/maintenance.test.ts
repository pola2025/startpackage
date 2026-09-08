import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

afterEach(() => vi.unstubAllEnvs());

describe("migration request barrier", () => {
  it("blocks reads, writes, webhooks and server actions during the final snapshot", async () => {
    vi.stubEnv("D1_MIGRATION_MAINTENANCE", "true");
    for (const [path, method] of [["/dashboard", "GET"], ["/api/submission", "POST"], ["/api/telegram/webhook", "POST"], ["/dashboard", "POST"]]) {
      const result = middleware(new NextRequest(`https://test.invalid${path}`, { method }));
      expect(result.status).toBe(503);
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect(await result.json()).toMatchObject({ code: "MIGRATION_MAINTENANCE" });
    }
  });

  it("preserves ordinary routing when maintenance is disabled", () => {
    vi.stubEnv("D1_MIGRATION_MAINTENANCE", "false");
    expect(middleware(new NextRequest("https://test.invalid/" )).status).toBe(200);
  });

  it("allows revoked administrator cookies to reach the login page", () => {
    vi.stubEnv("D1_MIGRATION_MAINTENANCE", "false");
    const request = new NextRequest("https://test.invalid/admin/login", {
      headers: { cookie: "authjs.session-token=stale-token" },
    });
    expect(middleware(request).headers.get("Location")).toBeNull();
  });
});
