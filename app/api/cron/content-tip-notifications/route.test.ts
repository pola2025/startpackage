import { beforeEach, describe, expect, it, vi } from "vitest";

const { callDataService, sendContentTipNotifications } = vi.hoisted(() => ({
  callDataService: vi.fn(),
  sendContentTipNotifications: vi.fn(),
}));

vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => process.env.D1_RUNTIME_ENABLED === "true" }));
vi.mock("@/lib/d1/maintenance", () => ({ isMigrationMaintenance: () => process.env.D1_MIGRATION_MAINTENANCE === "true" }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService }));
vi.mock("@/lib/notification/contentTipEmail", () => ({ sendContentTipNotifications }));

import { GET } from "./route";

describe("content tip cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret-with-at-least-32-characters");
    vi.stubEnv("D1_RUNTIME_ENABLED", "true");
    vi.stubEnv("D1_MIGRATION_MAINTENANCE", "false");
    callDataService.mockReset();
    sendContentTipNotifications.mockReset();
    callDataService.mockResolvedValue({ items: [] });
  });

  it("rejects an invalid cron secret", async () => {
    const response = await GET(new Request("https://polaai.co.kr/api/cron/content-tip-notifications", { headers: { authorization: "Bearer wrong" } }));
    expect(response.status).toBe(401);
    expect(callDataService).not.toHaveBeenCalled();
  });

  it("resumes queued fanouts through GET with a valid cron secret", async () => {
    callDataService.mockImplementation(async (operation: string) => operation === "shared-domain/scheduled-notification-incomplete"
      ? { items: [{ fanoutKey: "tip-1", title: "Tip", description: "Description", linkType: "blog", linkUrl: "https://example.com" }] }
      : {});
    const response = await GET(new Request("https://polaai.co.kr/api/cron/content-tip-notifications", { headers: { authorization: "Bearer cron-secret-with-at-least-32-characters" } }));
    expect(response.status).toBe(200);
    expect(sendContentTipNotifications).toHaveBeenCalledWith(expect.objectContaining({ id: "tip-1" }), expect.objectContaining({ leaseToken: expect.any(String) }));
  });
});
