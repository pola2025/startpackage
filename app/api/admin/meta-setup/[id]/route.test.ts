import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  callDataService: vi.fn(),
  sendPolaradMail: vi.fn(),
  sendMetaSetupDoneNotifications: vi.fn(),
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
vi.mock("@/lib/email/polaradMailer", () => ({
  sendPolaradMail: mocks.sendPolaradMail,
}));
vi.mock("@/lib/notification/metaSetup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/notification/metaSetup")>()),
  sendMetaSetupDoneNotifications: mocks.sendMetaSetupDoneNotifications,
}));

import { MASKED_SECRET } from "@/lib/security/submission-secrets";
import { PATCH } from "./route";

const STUDENT_ID = "11111111-2222-4333-8444-555555555555";
const SYSTEM_TOKEN = "EAAB-system-user-token-1234567890";
const THREADS_TOKEN = "THQW-threads-token-abcdefghijk";

function patch(
  body: unknown,
  {
    id = STUDENT_ID,
    headers = { "Content-Type": "application/json" },
  }: { id?: string; headers?: Record<string, string> } = {},
) {
  return PATCH(
    new Request(`https://example.test/api/admin/meta-setup/${id}`, {
      method: "PATCH",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ id }) },
  );
}

const callsTo = (path: string) =>
  mocks.callDataService.mock.calls.filter(([name]) => name === path);

function mockService(
  options: {
    stored?: Record<string, unknown>;
    notification?: Record<string, unknown> | null;
  } = {},
) {
  const notification =
    options.notification === undefined
      ? { name: "홍길동", email: "student@example.com", slackChannelId: "C1" }
      : options.notification;
  mocks.callDataService.mockImplementation(async (path: string) => {
    if (path === "content-domain/meta-setup-get") return options.stored ?? {};
    if (path === "content-domain/meta-setup-complete")
      return { success: true, doneAt: 1_760_000_000_000, notification };
    return { success: true };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "operator" } });
  mocks.sendPolaradMail.mockResolvedValue(undefined);
  mocks.sendMetaSetupDoneNotifications.mockResolvedValue(undefined);
  mockService();
});

const validBody = {
  systemUserToken: SYSTEM_TOKEN,
  threadsToken: THREADS_TOKEN,
};

describe("PATCH /api/admin/meta-setup/[id]", () => {
  it("로그인하지 않았으면 403", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await patch(validBody)).status).toBe(403);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("관리자 역할이 아니면 403 (교육생 세션, admin 역할)", async () => {
    for (const user of [
      { id: "u1" },
      { id: "u1", role: "user" },
      { id: "u1", role: "admin" },
    ]) {
      mocks.auth.mockResolvedValue({ user });
      expect((await patch(validBody)).status).toBe(403);
    }
    expect(mocks.callDataService).not.toHaveBeenCalled();
    expect(mocks.sendPolaradMail).not.toHaveBeenCalled();
  });

  it.each(["super", "designer", "operator"])(
    "%s 역할은 통과한다",
    async (role) => {
      mocks.auth.mockResolvedValue({ user: { id: "admin-1", role } });
      expect((await patch(validBody)).status).toBe(200);
    },
  );

  it("사용자 ID 형식이 틀리면 400", async () => {
    expect((await patch(validBody, { id: "not-an-id" })).status).toBe(400);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("Content-Type이 JSON이 아니면 415", async () => {
    expect(
      (
        await patch(JSON.stringify(validBody), {
          headers: { "Content-Type": "text/plain" },
        })
      ).status,
    ).toBe(415);
  });

  it("JSON이 깨졌으면 400", async () => {
    expect((await patch("{oops")).status).toBe(400);
  });

  it("토큰이 20자보다 짧으면 400", async () => {
    const response = await patch({
      systemUserToken: "short",
      threadsToken: THREADS_TOKEN,
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(
      "시스템사용자 토큰은 20자 이상이어야 합니다. 토큰 전체를 붙여 넣었는지 확인해 주세요.",
    );
    const second = await patch({
      systemUserToken: SYSTEM_TOKEN,
      threadsToken: "x".repeat(19),
    });
    expect(second.status).toBe(400);
    expect((await second.json()).error).toContain("쓰레드 토큰");
    expect(callsTo("content-domain/meta-setup-complete")).toHaveLength(0);
  });

  it("토큰이 빠졌으면 400", async () => {
    expect((await patch({ systemUserToken: SYSTEM_TOKEN })).status).toBe(400);
  });

  it("두 토큰이 같으면 400", async () => {
    const response = await patch({
      systemUserToken: SYSTEM_TOKEN,
      threadsToken: SYSTEM_TOKEN,
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("같습니다");
    expect(callsTo("content-domain/meta-setup-complete")).toHaveLength(0);
    expect(mocks.sendPolaradMail).not.toHaveBeenCalled();
  });

  it("앞뒤 공백을 뺀 뒤 같은 값이어도 400", async () => {
    const response = await patch({
      systemUserToken: SYSTEM_TOKEN,
      threadsToken: `  ${SYSTEM_TOKEN}  `,
    });
    expect(response.status).toBe(400);
  });

  it("정상 완료: 토큰 저장, 메일 발송, 발송 시각 기록", async () => {
    const response = await patch(validBody);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      doneAt: 1_760_000_000_000,
      emailSent: true,
      email: "student@example.com",
    });
    expect(callsTo("content-domain/meta-setup-complete")[0][1]).toEqual({
      adminId: "admin-1",
      userId: STUDENT_ID,
      tokens: {
        MetaSystemUserToken: SYSTEM_TOKEN,
        MetaThreadsToken: THREADS_TOKEN,
      },
    });
    expect(mocks.sendPolaradMail).toHaveBeenCalledTimes(1);
    const mail = mocks.sendPolaradMail.mock.calls[0][0];
    expect(mail.to).toBe("student@example.com");
    expect(mail.html).toContain(SYSTEM_TOKEN);
    expect(mail.text).toContain(THREADS_TOKEN);
    const sent = callsTo("content-domain/meta-setup-email-sent");
    expect(sent).toHaveLength(1);
    expect(sent[0][1]).toMatchObject({
      adminId: "admin-1",
      userId: STUDENT_ID,
    });
    expect(typeof sent[0][1].sentAt).toBe("number");
    expect(mocks.sendMetaSetupDoneNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ email: "student@example.com" }),
      { sent: true, error: undefined },
    );
  });

  it("메일 발송이 실패해도 200이고 emailSent false와 emailError를 돌려준다", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendPolaradMail.mockRejectedValue(new Error("SMTP 535 인증 실패"));
    const response = await patch(validBody);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      success: true,
      emailSent: false,
      emailError: "SMTP 535 인증 실패",
    });
    expect(callsTo("content-domain/meta-setup-complete")).toHaveLength(1);
    expect(callsTo("content-domain/meta-setup-email-sent")).toHaveLength(0);
    expect(mocks.sendMetaSetupDoneNotifications).toHaveBeenCalledWith(
      expect.anything(),
      { sent: false, error: "SMTP 535 인증 실패" },
    );
    spy.mockRestore();
  });

  it("메일 오류 문구는 120자로 자른다", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendPolaradMail.mockRejectedValue(new Error("e".repeat(500)));
    const body = await (await patch(validBody)).json();
    expect(body.emailError).toHaveLength(120);
    spy.mockRestore();
  });

  it("교육생 이메일이 없으면 메일 없이 200과 emailError", async () => {
    mockService({ notification: { name: "홍길동", email: null } });
    const body = await (await patch(validBody)).json();
    expect(body).toMatchObject({
      success: true,
      emailSent: false,
      emailError: "교육생 이메일이 없습니다",
      email: null,
    });
    expect(mocks.sendPolaradMail).not.toHaveBeenCalled();
    expect(callsTo("content-domain/meta-setup-email-sent")).toHaveLength(0);
  });

  describe("마스킹 값", () => {
    it("두 칸 모두 마스킹이면 저장된 토큰으로 메일만 다시 보낸다", async () => {
      mockService({
        stored: {
          MetaSystemUserToken: SYSTEM_TOKEN,
          MetaThreadsToken: THREADS_TOKEN,
        },
      });
      const response = await patch({
        systemUserToken: MASKED_SECRET,
        threadsToken: MASKED_SECRET,
      });
      expect(response.status).toBe(200);
      expect(callsTo("content-domain/meta-setup-complete")[0][1]).toMatchObject(
        {
          tokens: {
            MetaSystemUserToken: SYSTEM_TOKEN,
            MetaThreadsToken: THREADS_TOKEN,
          },
        },
      );
      expect(mocks.sendPolaradMail.mock.calls[0][0].text).toContain(
        SYSTEM_TOKEN,
      );
      expect(mocks.sendPolaradMail.mock.calls[0][0].text).toContain(
        THREADS_TOKEN,
      );
    });

    it("한 칸만 마스킹이면 그 칸만 저장된 값을 쓴다", async () => {
      mockService({
        stored: {
          MetaSystemUserToken: SYSTEM_TOKEN,
          MetaThreadsToken: "old-threads-token-0123456789",
        },
      });
      await patch({
        systemUserToken: MASKED_SECRET,
        threadsToken: THREADS_TOKEN,
      });
      expect(callsTo("content-domain/meta-setup-complete")[0][1]).toMatchObject(
        {
          tokens: {
            MetaSystemUserToken: SYSTEM_TOKEN,
            MetaThreadsToken: THREADS_TOKEN,
          },
        },
      );
    });

    it("저장된 토큰이 없으면 400", async () => {
      mockService({ stored: {} });
      const response = await patch({
        systemUserToken: MASKED_SECRET,
        threadsToken: MASKED_SECRET,
      });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain("저장된 토큰이 없습니다");
      expect(callsTo("content-domain/meta-setup-complete")).toHaveLength(0);
    });

    it("마스킹 값을 저장된 토큰으로 바꾼 뒤에도 두 토큰이 같으면 400", async () => {
      mockService({
        stored: {
          MetaSystemUserToken: SYSTEM_TOKEN,
          MetaThreadsToken: SYSTEM_TOKEN,
        },
      });
      const response = await patch({
        systemUserToken: MASKED_SECRET,
        threadsToken: MASKED_SECRET,
      });
      expect(response.status).toBe(400);
    });
  });

  it("데이터 서비스가 던지면 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.callDataService.mockRejectedValue(new Error("boom"));
    expect((await patch(validBody)).status).toBe(500);
    expect(mocks.sendPolaradMail).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
