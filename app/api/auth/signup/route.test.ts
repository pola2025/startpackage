import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { callDataService, notifyAdmin } = vi.hoisted(() => ({
  callDataService: vi.fn(),
  notifyAdmin: vi.fn(),
}));

vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({ callDataService }));
vi.mock("@/lib/notification/telegramClient", () => ({ notifyAdmin }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/auth", () => ({ signIn: vi.fn() }));
vi.mock("bcryptjs", () => ({ hash: vi.fn(async () => "hashed") }));

import { POST } from "./route";

const COHORT_ID = "c68c8dc2-0c3e-45ab-97b6-a12388c7eb1c";

let ipSeq = 0;
function signup(phone: string, name = "박주원") {
  ipSeq += 1;
  return POST(
    new NextRequest("https://www.polaai.co.kr/api/auth/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `203.0.113.${ipSeq}`,
      },
      body: JSON.stringify({
        이름: name,
        연락처: phone,
        이메일: "student@example.com",
        password: "1234",
        cohortId: COHORT_ID,
        _ts: Date.now() - 10_000,
      }),
    }),
  );
}

describe("signup roster check", () => {
  beforeEach(() => {
    callDataService.mockReset();
    notifyAdmin.mockReset();
    notifyAdmin.mockResolvedValue(true);
  });

  it("blocks a phone that is not on the cohort roster and alerts admins", async () => {
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/signup-check")
        return {
          rosterSize: 2,
          cohortName: "28기",
          matched: false,
          sameName: [{ name: "박주원", phone: "010-5758-3824" }],
        };
      throw new Error(`unexpected ${operation}`);
    });
    const response = await signup("010-1111-2222");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "교육생 명단에 없는 연락처입니다. 폴라애드로 연락바랍니다.",
      code: "NOT_ON_ROSTER",
    });
    expect(callDataService).not.toHaveBeenCalledWith(
      "core/signup",
      expect.anything(),
    );
    expect(notifyAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "[startpackage/signup] 명단에 없는 연락처로 가입 시도",
        details: expect.objectContaining({
          기수: "28기",
          연락처: "010-1111-2222",
          "명단의 같은 이름": "박주원 010-5758-3824",
        }),
      }),
    );
  });

  it("signs up a roster phone and marks the admin alert as confirmed", async () => {
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/signup-check")
        return {
          rosterSize: 2,
          cohortName: "28기",
          matched: true,
          sameName: [],
        };
      if (operation === "core/signup")
        return { userId: "u1", cohortName: "28기" };
      throw new Error(`unexpected ${operation}`);
    });
    const response = await signup("010-5758-3824");
    expect(response.status).toBe(200);
    expect(notifyAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ 명단: "확인됨" }),
      }),
    );
  });

  it("keeps open signup for cohorts without a roster", async () => {
    callDataService.mockImplementation(async (operation: string) => {
      if (operation === "roster-domain/signup-check")
        return {
          rosterSize: 0,
          cohortName: "27기",
          matched: false,
          sameName: [],
        };
      if (operation === "core/signup")
        return { userId: "u1", cohortName: "27기" };
      throw new Error(`unexpected ${operation}`);
    });
    const response = await signup("010-1111-2222");
    expect(response.status).toBe(200);
    expect(notifyAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.not.objectContaining({ 명단: expect.anything() }),
      }),
    );
  });
});
