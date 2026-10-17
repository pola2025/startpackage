import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkImageReadable,
  checkUploadFile,
  DOCUMENT_MAX_BYTES,
  IMAGE_MAX_BYTES,
  isImageFile,
  MIN_IMAGE_SIDE_PX,
} from "./uploadValidation";

/** 실제 바이트를 만들지 않고 크기만 지정한 File */
function fakeFile(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("checkUploadFile", () => {
  it("빈 파일은 거절한다", () => {
    expect(
      checkUploadFile(fakeFile("a.png", "image/png", 0), { allowPdf: false }),
    ).toContain("빈 파일");
  });

  it("HEIC·HEIF는 type이나 확장자 어느 쪽이든 안내 문구로 거절한다", () => {
    for (const file of [
      fakeFile("a.heic", "image/heic", 100),
      fakeFile("a.heif", "image/heif", 100),
      fakeFile("IMG_1.HEIC", "", 100),
      fakeFile("a.heic", "application/octet-stream", 100),
    ]) {
      expect(checkUploadFile(file, { allowPdf: true })).toContain("HEIC");
    }
  });

  it("JPG·PNG·WEBP는 통과한다", () => {
    for (const [name, type] of [
      ["a.jpg", "image/jpeg"],
      ["a.png", "image/png"],
      ["a.webp", "image/webp"],
    ]) {
      expect(
        checkUploadFile(fakeFile(name, type, 1000), { allowPdf: false }),
      ).toBeNull();
    }
  });

  it("type이 비어 있으면 확장자로 이미지를 판단한다", () => {
    expect(
      checkUploadFile(fakeFile("a.JPEG", "", 1000), { allowPdf: false }),
    ).toBeNull();
  });

  it("이미지는 20MB까지 통과, 초과는 거절", () => {
    expect(
      checkUploadFile(fakeFile("a.png", "image/png", IMAGE_MAX_BYTES), {
        allowPdf: false,
      }),
    ).toBeNull();
    const message = checkUploadFile(
      fakeFile("a.png", "image/png", IMAGE_MAX_BYTES + 1),
      { allowPdf: false },
    );
    expect(message).toContain("20MB");
    expect(message).toContain("mkt@polarad.co.kr");
  });

  it("PDF는 허용된 칸에서만, 4MB까지", () => {
    expect(
      checkUploadFile(
        fakeFile("a.pdf", "application/pdf", DOCUMENT_MAX_BYTES),
        { allowPdf: true },
      ),
    ).toBeNull();
    expect(
      checkUploadFile(
        fakeFile("a.pdf", "application/pdf", DOCUMENT_MAX_BYTES + 1),
        { allowPdf: true },
      ),
    ).toContain("4MB");
    expect(
      checkUploadFile(fakeFile("a.pdf", "application/pdf", 1000), {
        allowPdf: false,
      }),
    ).toContain("이미지만");
  });

  it("확장자가 pdf면 type이 달라도 PDF로 본다", () => {
    expect(
      checkUploadFile(fakeFile("a.pdf", "", 1000), { allowPdf: true }),
    ).toBeNull();
  });

  it("지원하지 않는 형식은 안내 문구를 돌려준다", () => {
    expect(
      checkUploadFile(fakeFile("a.gif", "image/gif", 1000), {
        allowPdf: false,
      }),
    ).toBe("JPG, PNG, WEBP 이미지만 올릴 수 있습니다.");
    expect(
      checkUploadFile(fakeFile("a.zip", "application/zip", 1000), {
        allowPdf: true,
      }),
    ).toBe("JPG, PNG, WEBP 이미지나 PDF 파일만 올릴 수 있습니다.");
  });
});

describe("isImageFile", () => {
  it("MIME 형식을 우선하고 type이 없을 때만 확장자를 본다", () => {
    expect(isImageFile(fakeFile("a.png", "image/png", 1))).toBe(true);
    expect(isImageFile(fakeFile("a.png", "", 1))).toBe(true);
    expect(isImageFile(fakeFile("a.png", "application/pdf", 1))).toBe(false);
    expect(isImageFile(fakeFile("a.gif", "image/gif", 1))).toBe(false);
  });
});

describe("checkImageReadable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("이미지가 아니면 검사하지 않는다", async () => {
    const create = vi.fn();
    vi.stubGlobal("createImageBitmap", create);
    expect(
      await checkImageReadable(fakeFile("a.pdf", "application/pdf", 10)),
    ).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("브라우저가 createImageBitmap을 지원하지 않으면 서버 검사에 맡긴다", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    expect(
      await checkImageReadable(fakeFile("a.png", "image/png", 10)),
    ).toBeNull();
  });

  it("짧은 변이 200px 미만이면 거절하고 비트맵을 닫는다", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi
        .fn()
        .mockResolvedValue({
          width: 1000,
          height: MIN_IMAGE_SIDE_PX - 1,
          close,
        }),
    );
    expect(
      await checkImageReadable(fakeFile("a.png", "image/png", 10)),
    ).toContain("너무 작습니다");
    expect(close).toHaveBeenCalled();
  });

  it("짧은 변이 정확히 200px이면 통과한다", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: MIN_IMAGE_SIDE_PX, height: 900 }),
    );
    expect(
      await checkImageReadable(fakeFile("a.png", "image/png", 10)),
    ).toBeNull();
  });

  it("열 수 없는 이미지는 거절한다", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("bad")),
    );
    expect(
      await checkImageReadable(fakeFile("a.png", "image/png", 10)),
    ).toContain("열 수 없습니다");
  });
});
