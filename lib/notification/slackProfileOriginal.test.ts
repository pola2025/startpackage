import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.SLACK_BOT_TOKEN = "xoxb-test";
  return {
    uploadV2: vi.fn(),
    postMessage: vi.fn(),
    loadPendingProfileOriginal: vi.fn(),
    clearPendingProfileOriginal: vi.fn(),
    fetch: vi.fn(),
  };
});

vi.mock("@slack/web-api", () => ({
  WebClient: class {
    files = { uploadV2: mocks.uploadV2 };
    chat = { postMessage: mocks.postMessage };
  },
}));
vi.mock("@/lib/storage/profileOriginal", () => ({
  loadPendingProfileOriginal: mocks.loadPendingProfileOriginal,
  clearPendingProfileOriginal: mocks.clearPendingProfileOriginal,
}));

import { pushSubmissionData, sendPendingProfileOriginal } from "./slackClient";

const original = {
  buffer: Buffer.from("original-jpeg-bytes"),
  extension: "jpg",
};

describe("profile photo originals in Slack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadV2.mockResolvedValue({ ok: true });
    mocks.postMessage.mockResolvedValue({ ok: true });
    mocks.fetch.mockImplementation(
      async () =>
        new Response(Buffer.from("%PDF-1.7"), {
          headers: { "content-type": "application/pdf" },
        }),
    );
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads the waiting original and removes the server copy once Slack has it", async () => {
    mocks.loadPendingProfileOriginal.mockResolvedValue(original);

    const sent = await sendPendingProfileOriginal({
      userId: "user-1",
      channelId: "C1",
      userName: "홍길동",
    });

    expect(sent).toBe(true);
    const upload = mocks.uploadV2.mock.calls[0][0];
    expect(upload.channel_id).toBe("C1");
    expect(upload.file).toBe(original.buffer);
    expect(upload.filename).toMatch(/^프로필사진_원본_\d+\.jpg$/);
    expect(mocks.clearPendingProfileOriginal).toHaveBeenCalledWith("user-1");
  });

  it("keeps the server copy when the Slack upload fails", async () => {
    mocks.loadPendingProfileOriginal.mockResolvedValue(original);
    mocks.uploadV2.mockResolvedValue({ ok: false });

    expect(
      await sendPendingProfileOriginal({ userId: "user-1", channelId: "C1" }),
    ).toBe(false);
    expect(mocks.clearPendingProfileOriginal).not.toHaveBeenCalled();
  });

  it("does nothing when no original is waiting", async () => {
    mocks.loadPendingProfileOriginal.mockResolvedValue(null);

    expect(
      await sendPendingProfileOriginal({ userId: "user-1", channelId: "C1" }),
    ).toBe(false);
    expect(mocks.uploadV2).not.toHaveBeenCalled();
  });

  it("pushes the original with the submission files and never the display webp", async () => {
    mocks.loadPendingProfileOriginal.mockResolvedValue(original);

    await pushSubmissionData({
      channelId: "C1",
      userId: "user-1",
      submissionData: {
        브랜드명: "브랜드",
        사업자등록증URL: "https://files.example.test/user-1/business.pdf",
        프로필사진URL: "https://files.example.test/user-1/profile.webp",
      },
    });

    const fetched = mocks.fetch.mock.calls.map(([url]) => String(url));
    expect(fetched).toEqual(["https://files.example.test/user-1/business.pdf"]);
    const filenames = mocks.uploadV2.mock.calls.map(([args]) =>
      String(args.filename),
    );
    expect(filenames).toHaveLength(2);
    expect(
      filenames.some((name) => /^프로필사진_원본_\d+\.jpg$/.test(name)),
    ).toBe(true);
    expect(filenames.some((name) => name.endsWith(".webp"))).toBe(false);
  });

  it("sends no profile file at all when only the display webp exists", async () => {
    mocks.loadPendingProfileOriginal.mockResolvedValue(null);

    await pushSubmissionData({
      channelId: "C1",
      userId: "user-1",
      submissionData: {
        브랜드명: "브랜드",
        프로필사진URL: "https://files.example.test/user-1/profile.webp",
      },
    });

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.uploadV2).not.toHaveBeenCalled();
  });

  it("splits the registration info into sections of at most 10 fields so Slack accepts it", async () => {
    mocks.loadPendingProfileOriginal.mockResolvedValue(null);
    const submissionData = {
      브랜드명: "브랜드", 업종: "서비스", 주소: "서울", 인쇄물받을주소: "서울 배송지",
      받는분이름: "홍길동", 수령연락처: "010-6624-6615", 우편번호: "06000", 대표번호: "0212345678",
      이메일: "a@example.com", 홈페이지컬러컨셉: "블루", 로고선호스타일: "심플", 로고선호색상: "남색",
      로고선호폰트: "고딕", 명함색상: "흰색", 명함시안: "style3",
      은행명: "국민은행", 계좌번호: "123-456", 계좌명의자명: "홍길동", 로고제작방식: "신규제작", 계약서시안: "A",
    };

    await pushSubmissionData({ channelId: "C1", userId: "user-1", submissionData });

    const message = mocks.postMessage.mock.calls.find(([args]) => args.text === "📋 제작 정보")?.[0];
    const sections = message.blocks.filter((block: any) => block.type === "section" && block.fields);
    expect(sections.every((block: any) => block.fields.length <= 10)).toBe(true);
    const texts = sections.flatMap((block: any) => block.fields.map((field: any) => field.text));
    expect(texts).toHaveLength(20);
    // 관리자 화면에 보이는 계좌·로고 제작 방식도 값으로 들어간다
    expect(texts).toEqual(expect.arrayContaining(["*계좌번호:*\n123-456", "*로고 제작 방식:*\n신규제작", "*수령 연락처:*\n010-6624-6615"]));
  });
});
