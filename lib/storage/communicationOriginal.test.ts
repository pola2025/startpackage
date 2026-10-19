import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uploadToR2: vi.fn(),
  getObjectBuffer: vi.fn(),
  deleteFromR2: vi.fn(),
  uploadOriginalImageToSlack: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("@/lib/storage/r2Client", () => ({
  uploadToR2: mocks.uploadToR2,
  getObjectBuffer: mocks.getObjectBuffer,
  deleteFromR2: mocks.deleteFromR2,
}));
vi.mock("@/lib/notification/slackClient", () => ({
  uploadOriginalImageToSlack: mocks.uploadOriginalImageToSlack,
  postMessage: mocks.postMessage,
}));

import {
  loadCommunicationOriginals,
  saveCommunicationOriginal,
  sendCommunicationOriginals,
} from "./communicationOriginal";

const base = "https://files.example.test";
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
  Buffer.alloc(32),
]);
const ownImage = `${base}/communication/user-1/communication_1.webp`;
const ownKey = "communication/user-1/_original/communication_1";

describe("communication attachment originals", () => {
  const previousPublicUrl = process.env.R2_PUBLIC_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_PUBLIC_URL = `${base}/`;
    mocks.deleteFromR2.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.R2_PUBLIC_URL = previousPublicUrl;
  });

  it("keeps the original next to the display webp", async () => {
    await saveCommunicationOriginal({
      webpKey: "communication/user-1/communication_1.webp",
      buffer: jpeg,
      contentType: "image/jpeg",
    });

    expect(mocks.uploadToR2).toHaveBeenCalledWith(
      jpeg,
      "communication_1",
      "image/jpeg",
      "communication/user-1/_original",
    );
  });

  it("finds only this student's image originals", async () => {
    mocks.getObjectBuffer.mockImplementation(async (key: string) => {
      if (key === ownKey) return jpeg;
      throw new Error("NoSuchKey");
    });

    const originals = await loadCommunicationOriginals("user-1", [
      ownImage,
      `${base}/communication/user-2/communication_2.webp`,
      `${base}/communication/user-1/1759700000000-%EC%82%AC%EC%97%85.pdf`,
      `${base}/communication/user-1/communication_3.webp`,
    ]);

    expect(originals).toEqual([
      { url: ownImage, key: ownKey, buffer: jpeg, extension: "jpg" },
    ]);
    expect(mocks.getObjectBuffer).not.toHaveBeenCalledWith(
      "communication/user-2/_original/communication_2",
    );
  });

  it("uploads the original to Slack and deletes it from the server", async () => {
    mocks.uploadOriginalImageToSlack.mockResolvedValue(true);

    const sent = await sendCommunicationOriginals({
      channelId: "C_TEST_QNA",
      originals: [
        { url: ownImage, key: ownKey, buffer: jpeg, extension: "jpg" },
      ],
      sender: "27기 홍길동",
    });

    expect(sent).toBe(1);
    const upload = mocks.uploadOriginalImageToSlack.mock.calls[0][0];
    expect(upload.channelId).toBe("C_TEST_QNA");
    expect(upload.buffer).toBe(jpeg);
    expect(upload.fileName).toMatch(/^문의첨부_원본_\d+_1\.jpg$/);
    expect(upload.userName).toBe("27기 홍길동");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith(ownKey);
    expect(mocks.postMessage).not.toHaveBeenCalled();
  });

  it("keeps the original and leaves the display link when Slack refuses it", async () => {
    mocks.uploadOriginalImageToSlack.mockResolvedValue(false);

    const sent = await sendCommunicationOriginals({
      channelId: "C_TEST_QNA",
      originals: [
        { url: ownImage, key: ownKey, buffer: jpeg, extension: "jpg" },
      ],
      sender: "27기 홍길동",
    });

    expect(sent).toBe(0);
    expect(mocks.deleteFromR2).not.toHaveBeenCalled();
    expect(mocks.postMessage.mock.calls[0][0].text).toContain(ownImage);
  });
});
