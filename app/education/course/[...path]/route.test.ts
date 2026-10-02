import { beforeEach, describe, expect, it, vi } from "vitest";

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

const VIDEO = ["assets", "guides", "telegram-settings-guide.mp4"];
const VIDEO_SIZE = 11618209;
const CHUNK = 1024 * 1024;

function request(range?: string) {
  return GET(
    new Request(
      "https://mkt.polaai.co.kr/education/course/assets/guides/telegram-settings-guide.mp4",
      {
        headers: range ? { range } : undefined,
      },
    ),
    { params: Promise.resolve({ path: VIDEO }) },
  );
}

describe("education course video ranges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("caps an explicit full-file range so Safari stays under the function response limit", async () => {
    const response = await request(`bytes=0-${VIDEO_SIZE - 1}`);
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe(
      `bytes 0-${CHUNK - 1}/${VIDEO_SIZE}`,
    );
    expect(response.headers.get("content-length")).toBe(String(CHUNK));
    expect(response.headers.get("content-type")).toBe("video/mp4");
  });

  it("keeps open-ended ranges at one megabyte", async () => {
    const response = await request("bytes=2000000-");
    expect(response.headers.get("content-range")).toBe(
      `bytes 2000000-${2000000 + CHUNK - 1}/${VIDEO_SIZE}`,
    );
  });

  it("serves a short explicit range and the file tail unchanged", async () => {
    expect((await request("bytes=0-1")).headers.get("content-range")).toBe(
      `bytes 0-1/${VIDEO_SIZE}`,
    );
    expect(
      (await request(`bytes=${VIDEO_SIZE - 10}-`)).headers.get("content-range"),
    ).toBe(`bytes ${VIDEO_SIZE - 10}-${VIDEO_SIZE - 1}/${VIDEO_SIZE}`);
  });

  it("rejects ranges that start past the end of the file", async () => {
    expect((await request(`bytes=${VIDEO_SIZE}-`)).status).toBe(416);
  });
});
