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
});
