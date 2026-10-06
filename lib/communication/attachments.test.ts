import { describe, expect, it } from "vitest";
import {
  attachmentFileName,
  attachmentLinks,
  isImageAttachment,
  safeAttachmentBaseName,
} from "./attachments";

describe("communication attachments", () => {
  it("tells images from documents by extension", () => {
    expect(
      isImageAttachment(
        "https://files.example.test/communication/u/communication_1.webp",
      ),
    ).toBe(true);
    expect(
      isImageAttachment(
        "https://files.example.test/communication/u/1759700000000-a.PDF",
      ),
    ).toBe(false);
    expect(
      isImageAttachment(
        "https://files.example.test/communication/u/photo.JPG?v=1",
      ),
    ).toBe(true);
  });

  it("shows the readable file name without the upload time prefix", () => {
    expect(
      attachmentFileName(
        "https://files.example.test/communication/u/1759700000000-%EC%82%AC%EC%97%85%EC%9E%90%EB%93%B1%EB%A1%9D%EC%A6%9D.pdf",
      ),
    ).toBe("사업자등록증.pdf");
    expect(
      attachmentFileName("https://files.example.test/a/communication_1.webp"),
    ).toBe("communication_1.webp");
  });

  it("keeps Korean in stored names and replaces characters that break links", () => {
    expect(safeAttachmentBaseName("사업자등록증 최종(2).pdf")).toBe(
      "사업자등록증_최종(2)",
    );
    expect(safeAttachmentBaseName("..\\..\\evil<name>|x#.pdf")).toBe(
      "evil_name_x_",
    );
    expect(safeAttachmentBaseName(".pdf")).toBe("file");
  });

  it("keeps only https links for notifications", () => {
    expect(
      attachmentLinks([
        "https://files.example.test/communication/u/1759700000000-a.pdf",
        "javascript:alert(1)",
        "http://insecure.example.test/a.pdf",
        'https://files.example.test/a"onmouseover="x.pdf',
        42,
      ]),
    ).toEqual([
      {
        url: "https://files.example.test/communication/u/1759700000000-a.pdf",
        name: "a.pdf",
      },
    ]);
    expect(attachmentLinks(undefined)).toEqual([]);
  });
});
