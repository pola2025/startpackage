import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_COMPLETE_STATUS,
  isHomepageCompleteStatus,
  resolveAdminWorkflowStatus,
} from "../homepage-status";

describe("homepage workflow status", () => {
  it("marks a homepage workflow complete when an admin registers the result URL", () => {
    expect(
      resolveAdminWorkflowStatus("홈페이지", "시안컨펌요청", "https://example.com"),
    ).toBe(HOMEPAGE_COMPLETE_STATUS);
  });

  it("keeps homepage complete when the admin updates an existing homepage URL", () => {
    expect(
      resolveAdminWorkflowStatus("홈페이지", "제작 완료", "https://example.com"),
    ).toBe(HOMEPAGE_COMPLETE_STATUS);
  });

  it("does not change non-homepage workflow statuses", () => {
    expect(
      resolveAdminWorkflowStatus("로고", "시안컨펌요청", "https://example.com"),
    ).toBe("시안컨펌요청");
  });

  it("recognizes homepage completion states used by existing data", () => {
    expect(isHomepageCompleteStatus("홈페이지", "제작 완료")).toBe(true);
    expect(isHomepageCompleteStatus("홈페이지", "제작완료")).toBe(true);
    expect(isHomepageCompleteStatus("홈페이지", "최종확정")).toBe(true);
    expect(isHomepageCompleteStatus("명함", "제작완료")).toBe(false);
  });
});
