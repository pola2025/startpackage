import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  callDataService: vi.fn(),
  sendMetaSetupRequestNotifications: vi.fn(),
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
vi.mock("@/lib/notification/metaSetup", () => ({
  sendMetaSetupRequestNotifications: mocks.sendMetaSetupRequestNotifications,
}));

import {
  encryptSubmissionSecrets,
  MASKED_SECRET,
} from "@/lib/security/submission-secrets";
import { GET, POST } from "./route";

const ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
const USER_ID = "user-1";

function post(
  body: unknown,
  headers: Record<string, string> = { "Content-Type": "application/json" },
) {
  return POST(
    new Request("https://example.test/api/meta-setup", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as never,
  );
}

const validBody = {
  type: "instagram",
  loginId: "my_insta",
  password: "pw-1234",
  memo: "부탁드립니다",
};

/** 데이터 서비스 응답: meta-setup-get 은 row, meta-setup-request 는 결과 */
function mockService(
  row: Record<string, unknown> = {},
  requestResult: Record<string, unknown> = {},
) {
  mocks.callDataService.mockImplementation(async (path: string) => {
    if (path === "content-domain/meta-setup-get") return row;
    if (path === "content-domain/meta-setup-request")
      return {
        updated: false,
        requestedAt: 1_760_000_000_000,
        notification: { name: "홍길동" },
        ...requestResult,
      };
    return { success: true };
  });
}

const requestCall = () =>
  mocks.callDataService.mock.calls.find(
    ([path]) => path === "content-domain/meta-setup-request",
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("SUBMISSION_ENCRYPTION_KEY", ENCRYPTION_KEY);
  mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
  mocks.sendMetaSetupRequestNotifications.mockResolvedValue(undefined);
  mockService();
});

describe("POST /api/meta-setup", () => {
  it("로그인하지 않았으면 401", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await post(validBody)).status).toBe(401);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("Content-Type이 JSON이 아니면 415", async () => {
    expect(
      (await post(JSON.stringify(validBody), { "Content-Type": "text/plain" }))
        .status,
    ).toBe(415);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("JSON이 깨졌으면 400", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it.each([
    ["계정 유형 없음", { ...validBody, type: undefined }],
    ["잘못된 계정 유형", { ...validBody, type: "naver" }],
    ["아이디 없음", { ...validBody, loginId: "   " }],
    ["비밀번호 없음", { ...validBody, password: "" }],
    ["메모 1001자", { ...validBody, memo: "가".repeat(1001) }],
  ])("검증 실패(%s)는 400", async (_name, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(typeof (await response.json()).error).toBe("string");
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("저장하고 알림을 보낸 뒤 requestedAt을 돌려준다", async () => {
    const response = await post(validBody);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      requestedAt: 1_760_000_000_000,
    });
    expect(requestCall()?.[1]).toEqual({
      userId: USER_ID,
      request: {
        type: "instagram",
        loginId: "my_insta",
        password: "pw-1234",
        memo: "부탁드립니다",
      },
    });
    expect(mocks.sendMetaSetupRequestNotifications).toHaveBeenCalledTimes(1);
    expect(
      mocks.sendMetaSetupRequestNotifications.mock.calls[0][1],
    ).toMatchObject({
      type: "instagram",
      password: "pw-1234",
      updated: false,
    });
  });

  it("메모가 비어 있으면 null로 저장한다", async () => {
    await post({ ...validBody, memo: "  " });
    expect(requestCall()?.[1]).toMatchObject({ request: { memo: null } });
  });

  describe("30초 안 재요청 차단", () => {
    it("마지막 요청이 10초 전(숫자)이면 429", async () => {
      mockService({ MetaSetupRequestedAt: Date.now() - 10_000 });
      const response = await post(validBody);
      expect(response.status).toBe(429);
      expect(requestCall()).toBeUndefined();
      expect(mocks.sendMetaSetupRequestNotifications).not.toHaveBeenCalled();
    });

    it("저장된 시각이 ISO 문자열로 와도 차단한다", async () => {
      mockService({
        MetaSetupRequestedAt: new Date(Date.now() - 5_000).toISOString(),
      });
      expect((await post(validBody)).status).toBe(429);
      expect(requestCall()).toBeUndefined();
    });

    it("저장된 시각이 숫자 문자열이어도 차단한다", async () => {
      mockService({ MetaSetupRequestedAt: String(Date.now() - 5_000) });
      expect((await post(validBody)).status).toBe(429);
    });

    it("31초 이상 지났으면 통과한다", async () => {
      mockService({ MetaSetupRequestedAt: Date.now() - 31_000 });
      expect((await post(validBody)).status).toBe(200);
      expect(requestCall()).toBeDefined();
    });

    it("ISO 문자열이라도 오래됐으면 통과한다", async () => {
      mockService({
        MetaSetupRequestedAt: new Date(Date.now() - 3_600_000).toISOString(),
      });
      expect((await post(validBody)).status).toBe(200);
    });
  });

  describe("비밀번호 마스킹 값", () => {
    it("같은 계정 유형(인스타그램)의 기존 비밀번호를 쓴다", async () => {
      mockService({
        InstagramPW: "stored-insta-pw",
        MetaGooglePW: "stored-google-pw",
      });
      const response = await post({ ...validBody, password: MASKED_SECRET });
      expect(response.status).toBe(200);
      expect(requestCall()?.[1]).toMatchObject({
        request: { password: "stored-insta-pw" },
      });
      expect(
        mocks.sendMetaSetupRequestNotifications.mock.calls[0][1],
      ).toMatchObject({ password: "stored-insta-pw" });
    });

    it("구글이면 구글 비밀번호를 쓴다", async () => {
      mockService({
        InstagramPW: "stored-insta-pw",
        MetaGooglePW: "stored-google-pw",
      });
      await post({ ...validBody, type: "google", password: MASKED_SECRET });
      expect(requestCall()?.[1]).toMatchObject({
        request: { type: "google", password: "stored-google-pw" },
      });
    });

    it("암호화되어 저장된 비밀번호는 복호화해서 쓴다", async () => {
      const stored = encryptSubmissionSecrets(
        { InstagramPW: "plain-insta-pw" },
        USER_ID,
        ENCRYPTION_KEY,
      );
      expect(stored.InstagramPW).not.toBe("plain-insta-pw");
      mockService(stored);
      await post({ ...validBody, password: MASKED_SECRET });
      expect(requestCall()?.[1]).toMatchObject({
        request: { password: "plain-insta-pw" },
      });
    });

    it("다른 계정 유형의 비밀번호만 있으면 400", async () => {
      mockService({ MetaGooglePW: "stored-google-pw" });
      const response = await post({ ...validBody, password: MASKED_SECRET });
      expect(response.status).toBe(400);
      expect(requestCall()).toBeUndefined();
    });

    it("저장된 비밀번호가 없으면 400", async () => {
      expect(
        (await post({ ...validBody, password: MASKED_SECRET })).status,
      ).toBe(400);
    });
  });

  it("두 번째 요청이면 updated 값이 알림에 전달된다", async () => {
    mockService({}, { updated: true });
    await post(validBody);
    expect(
      mocks.sendMetaSetupRequestNotifications.mock.calls[0][1],
    ).toMatchObject({ updated: true });
  });

  it("데이터 서비스가 던지면 500 (내부 정보 없음)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.callDataService.mockImplementation(async (path: string) => {
      if (path === "content-domain/meta-setup-get") return {};
      throw new Error("D1 exploded: secret internal detail");
    });
    const response = await post(validBody);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(
      "secret internal detail",
    );
    spy.mockRestore();
  });
});

describe("GET /api/meta-setup", () => {
  it("로그인하지 않았으면 401", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("요청 전이면 none과 빈 값", async () => {
    const body = await (await GET()).json();
    expect(body).toMatchObject({
      stage: "none",
      type: null,
      loginId: null,
      hasPassword: false,
      requestedAt: null,
      doneAt: null,
      tokens: null,
    });
  });

  it("요청 중이면 비밀번호와 토큰을 돌려주지 않고 requestedAt은 숫자", async () => {
    const requestedAt = Date.UTC(2026, 9, 17, 5, 20);
    mockService({
      MetaSetupType: "instagram",
      InstagramID: "my_insta",
      InstagramPW: "super-secret-pw",
      MetaSetupMemo: "메모",
      MetaSetupRequestedAt: new Date(requestedAt).toISOString(),
      MetaSystemUserToken: "A".repeat(30),
      MetaThreadsToken: "B".repeat(30),
    });
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const text = JSON.stringify(await response.json());
    const body = JSON.parse(text);
    expect(body).toMatchObject({
      stage: "requested",
      type: "instagram",
      loginId: "my_insta",
      hasPassword: true,
      memo: "메모",
      tokens: null,
    });
    expect(typeof body.requestedAt).toBe("number");
    expect(body.requestedAt).toBe(requestedAt);
    expect(text).not.toContain("super-secret-pw");
    expect(text).not.toContain("A".repeat(30));
  });

  it("구글 계정이면 구글 아이디를 보여 준다", async () => {
    mockService({
      MetaSetupType: "google",
      MetaGoogleID: "me@gmail.com",
      MetaGooglePW: "pw",
      InstagramID: "other",
    });
    const body = await (await GET()).json();
    expect(body).toMatchObject({
      type: "google",
      loginId: "me@gmail.com",
      hasPassword: true,
    });
    expect(JSON.stringify(body)).not.toContain('"pw"');
  });

  it("완료되면 토큰 2개를 돌려주고 시각은 모두 숫자", async () => {
    const stored = encryptSubmissionSecrets(
      {
        InstagramPW: "super-secret-pw",
        MetaSystemUserToken: "SYSTEM-token-1234567890",
        MetaThreadsToken: "THREADS-token-1234567890",
      },
      USER_ID,
      ENCRYPTION_KEY,
    );
    mockService({
      ...stored,
      MetaSetupType: "instagram",
      InstagramID: "my_insta",
      MetaSetupRequestedAt: "2026-10-17T05:20:00.000Z",
      MetaSetupDoneAt: "2026-10-17T06:00:00.000Z",
      MetaTokenEmailSentAt: "2026-10-17T06:01:00.000Z",
    });
    const text = JSON.stringify(await (await GET()).json());
    const body = JSON.parse(text);
    expect(body.stage).toBe("done");
    expect(body.tokens).toEqual({
      systemUserToken: "SYSTEM-token-1234567890",
      threadsToken: "THREADS-token-1234567890",
    });
    expect(typeof body.requestedAt).toBe("number");
    expect(typeof body.doneAt).toBe("number");
    expect(typeof body.emailSentAt).toBe("number");
    expect(text).not.toContain("super-secret-pw");
  });

  it("완료 시각만 있고 토큰이 하나뿐이면 tokens는 null", async () => {
    mockService({
      MetaSetupDoneAt: Date.now(),
      MetaSystemUserToken: "A".repeat(30),
    });
    expect((await (await GET()).json()).tokens).toBeNull();
  });

  it("데이터 서비스가 던지면 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.callDataService.mockRejectedValue(new Error("boom"));
    expect((await GET()).status).toBe(500);
    spy.mockRestore();
  });
});
