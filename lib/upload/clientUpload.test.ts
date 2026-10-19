import { describe, expect, it } from "vitest";
import {
  UPLOAD_TOO_LARGE_MESSAGE,
  VERCEL_UPLOAD_MAX_BYTES,
  shrinkImageForUpload,
  uploadErrorMessage,
} from "./clientUpload";

describe("clientUpload", () => {
  it("keeps files that already fit under the Vercel body limit", async () => {
    const small = new File([new Uint8Array(1024)], "id.jpg", { type: "image/jpeg" });
    expect(await shrinkImageForUpload(small)).toBe(small);
  });

  it("does not try to shrink documents", async () => {
    const pdf = new File([new Uint8Array(VERCEL_UPLOAD_MAX_BYTES + 1)], "license.pdf", { type: "application/pdf" });
    expect(await shrinkImageForUpload(pdf)).toBe(pdf);
  });

  it("explains a 413 without parsing the non-JSON body", async () => {
    const response = new Response("Request Entity Too Large\n\nFUNCTION_PAYLOAD_TOO_LARGE", { status: 413 });
    expect(await uploadErrorMessage(response, "실패")).toBe(UPLOAD_TOO_LARGE_MESSAGE);
  });

  it("uses the server error message and falls back when there is none", async () => {
    expect(await uploadErrorMessage(Response.json({ error: "허용되지 않는 형식입니다." }, { status: 400 }), "실패")).toBe("허용되지 않는 형식입니다.");
    expect(await uploadErrorMessage(new Response("oops", { status: 500 }), "실패")).toBe("실패");
  });
});
