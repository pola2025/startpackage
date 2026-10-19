import { describe, expect, it } from "vitest";
import { submissionPartialSchema } from "./submission.schema";

describe("submissionPartialSchema", () => {
  it("accepts an empty optional email so the rest of the basic info still saves", () => {
    const parsed = submissionPartialSchema.parse({
      브랜드명: "브랜드",
      이메일: "",
    });
    expect(parsed).toMatchObject({ 브랜드명: "브랜드", 이메일: "" });
  });

  it("still rejects a malformed email", () => {
    expect(
      submissionPartialSchema.safeParse({ 이메일: "not-an-email" }).success,
    ).toBe(false);
    expect(
      submissionPartialSchema.parse({ 이메일: "ceo@example.com" }).이메일,
    ).toBe("ceo@example.com");
  });
});
