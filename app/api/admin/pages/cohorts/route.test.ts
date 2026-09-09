import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  callDataService: vi.fn(),
  d1Enabled: false,
  prisma: {
    cohort: { findMany: vi.fn(), count: vi.fn() },
    user: { count: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => mocks.d1Enabled }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService: mocks.callDataService }));
vi.mock("@/lib/d1/route-errors", () => ({ dataServiceErrorResponse: () => null }));
vi.mock("@/lib/prisma", () => ({ default: mocks.prisma }));

import { GET } from "./route";

describe("admin cohort page fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "cohort-pagination-test-secret";
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "operator" } });
    mocks.prisma.cohort.findMany.mockResolvedValue([
      { id: "c", name: "27기", 교육시작일: new Date("2026-09-16"), 교육요일: "수", 자료제출마감일: new Date("2026-10-07"), isActive: true, _count: { users: 0 } },
      { id: "b", name: "26기", 교육시작일: new Date("2026-08-13"), 교육요일: "목", 자료제출마감일: new Date("2026-09-03"), isActive: true, _count: { users: 0 } },
      { id: "a", name: "25기", 교육시작일: new Date("2026-07-16"), 교육요일: "목", 자료제출마감일: new Date("2026-08-06"), isActive: false, _count: { users: 0 } },
    ]);
    mocks.prisma.cohort.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    mocks.prisma.user.count.mockResolvedValue(0);
  });

  it("returns a bounded latest-first keyset page without calling D1", async () => {
    const response = await GET(new Request("http://localhost/api/admin/pages/cohorts?pageSize=2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items.map((item: { name: string }) => item.name)).toEqual(["27기", "26기"]);
    expect(body.nextCursor).toEqual(expect.any(String));
    expect(mocks.callDataService).not.toHaveBeenCalled();
    expect(mocks.prisma.cohort.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3, orderBy: [{ 교육시작일: "desc" }, { id: "desc" }] }));
  });
});
