import sharp from "sharp";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDataService: vi.fn(),
  uploadToR2: vi.fn(),
  uploadProfilePhotoToSlack: vi.fn(),
  savePendingProfileOriginal: vi.fn(),
  clearPendingProfileOriginal: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({
  callDataService: mocks.callDataService,
}));
vi.mock("@/lib/storage/r2Client", () => ({
  uploadToR2: mocks.uploadToR2,
  generateFileName: () => "프로필사진URL_1.webp",
}));
vi.mock("@/lib/notification/slackClient", () => ({
  uploadProfilePhotoToSlack: mocks.uploadProfilePhotoToSlack,
}));
vi.mock("@/lib/storage/profileOriginal", () => ({
  savePendingProfileOriginal: mocks.savePendingProfileOriginal,
  clearPendingProfileOriginal: mocks.clearPendingProfileOriginal,
}));

import { processProfilePhoto } from "./profileUpload";

let photo: Buffer;

describe("processProfilePhoto", () => {
  beforeAll(async () => {
    photo = await sharp({
      create: { width: 40, height: 40, channels: 3, background: "#336699" },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadToR2.mockResolvedValue({
      url: "https://files.example.test/user-1/profile.webp",
      key: "user-1/profile.webp",
    });
  });

  const run = () =>
    processProfilePhoto({
      userId: "user-1",
      buffer: photo,
      originalFilename: "me.jpg",
      contentType: "image/jpeg",
    });

  it("sends the original to Slack and keeps no server copy when the channel exists", async () => {
    mocks.callDataService.mockResolvedValue({
      slackChannelId: "C1",
      이름: "홍길동",
    });
    mocks.uploadProfilePhotoToSlack.mockResolvedValue(true);

    const result = await run();

    expect(result).toEqual({
      url: "https://files.example.test/user-1/profile.webp",
      slackSent: true,
    });
    const sent = mocks.uploadProfilePhotoToSlack.mock.calls[0][0];
    expect(sent.buffer).toBe(photo);
    expect(sent.fileName).toMatch(/^프로필사진_원본_\d+\.jpg$/);
    expect(mocks.clearPendingProfileOriginal).toHaveBeenCalledWith("user-1");
    expect(mocks.savePendingProfileOriginal).not.toHaveBeenCalled();
    // 웹에는 webp 만 저장한다.
    expect(mocks.uploadToR2.mock.calls[0][2]).toBe("image/webp");
  });

  it("holds the original until a Slack channel exists", async () => {
    mocks.callDataService.mockResolvedValue({
      slackChannelId: null,
      이름: "홍길동",
    });

    const result = await run();

    expect(result.slackSent).toBe(false);
    expect(mocks.uploadProfilePhotoToSlack).not.toHaveBeenCalled();
    expect(mocks.savePendingProfileOriginal).toHaveBeenCalledWith({
      userId: "user-1",
      buffer: photo,
      contentType: "image/jpeg",
    });
  });

  it("holds the original when the Slack upload fails", async () => {
    mocks.callDataService.mockResolvedValue({
      slackChannelId: "C1",
      이름: "홍길동",
    });
    mocks.uploadProfilePhotoToSlack.mockResolvedValue(false);

    await run();

    expect(mocks.savePendingProfileOriginal).toHaveBeenCalledTimes(1);
    expect(mocks.clearPendingProfileOriginal).not.toHaveBeenCalled();
  });
});
