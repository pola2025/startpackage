import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uploadToR2: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/storage/r2Client", () => ({
  uploadToR2: mocks.uploadToR2,
  generateFileName: (field: string, name: string) =>
    `${field}_1.${name.split(".").pop()}`,
  validateR2Config: () => undefined,
}));
vi.mock("sharp", () => ({
  default: () => ({
    webp: () => ({ toBuffer: async () => Buffer.from("webp-bytes") }),
  }),
}));

import { POST } from "./route";

// jsdom 의 File/FormData 는 서버 Request 와 섞어 쓸 수 없어서 라우트가 읽는 값만 흉내 낸다.
function upload(
  name: string,
  type: string,
  bytes: Uint8Array,
  size = bytes.length,
) {
  const file = {
    name,
    type,
    size,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
  return POST({
    formData: async () => ({ get: () => file }),
  } as unknown as Request);
}

const pdfBytes = new TextEncoder().encode("%PDF-1.7 sample");

describe("POST /api/communication/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadToR2.mockImplementation(
      async (
        _buffer: Buffer,
        fileName: string,
        _type: string,
        folder: string,
      ) => ({
        url: `https://files.example.test/${folder}/${fileName}`,
        key: `${folder}/${fileName}`,
      }),
    );
  });

  it("stores a document as-is with its readable name and a server-chosen content type", async () => {
    const response = await upload("사업자등록증 최종.pdf", "", pdfBytes);
    const body = await response.json();

    expect(response.status).toBe(200);
    const [buffer, fileName, contentType, folder] =
      mocks.uploadToR2.mock.calls[0];
    expect(Buffer.from(buffer).toString()).toBe("%PDF-1.7 sample");
    expect(fileName).toMatch(/^\d+-사업자등록증_최종\.pdf$/);
    expect(contentType).toBe("application/pdf");
    expect(folder).toBe("communication/user-1");
    expect(body.url).toContain("%EC%82%AC%EC%97%85%EC%9E%90");
    expect(body.url).not.toMatch(/[가-힣\s]/);
  });

  it("rejects a file whose content does not match its extension", async () => {
    const response = await upload(
      "계약서.pdf",
      "application/pdf",
      new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
    );

    expect(response.status).toBe(400);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("rejects extensions outside the allow list", async () => {
    const response = await upload(
      "setup.exe",
      "application/x-msdownload",
      new Uint8Array([0x4d, 0x5a]),
    );

    expect(response.status).toBe(400);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("rejects files above the 4MB limit and points to the mail address", async () => {
    const response = await upload(
      "큰파일.pdf",
      "application/pdf",
      pdfBytes,
      4 * 1024 * 1024 + 1,
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toContain("4MB");
    expect(body.error).toContain("mkt@polarad.co.kr");
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("keeps converting images to webp", async () => {
    const response = await upload(
      "photo.png",
      "image/png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    );

    expect(response.status).toBe(200);
    const [buffer, fileName, contentType] = mocks.uploadToR2.mock.calls[0];
    expect(Buffer.from(buffer).toString()).toBe("webp-bytes");
    expect(fileName).toBe("communication_1.webp");
    expect(contentType).toBe("image/webp");
  });
});
