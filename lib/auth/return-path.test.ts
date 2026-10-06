import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETURN_PATH,
  loginPathFor,
  safeReturnPath,
} from "./return-path";

describe("safeReturnPath", () => {
  it("keeps addresses inside the student dashboard", () => {
    expect(safeReturnPath("/dashboard/design-threads")).toBe(
      "/dashboard/design-threads",
    );
    expect(safeReturnPath("/dashboard/communication?new=design")).toBe(
      "/dashboard/communication?new=design",
    );
    expect(safeReturnPath("/dashboard/submission?tab=basic#logo")).toBe(
      "/dashboard/submission?tab=basic#logo",
    );
    expect(safeReturnPath("/dashboard")).toBe("/dashboard");
  });

  it("falls back to the dashboard home when nothing was asked for", () => {
    expect(safeReturnPath(null)).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath(undefined)).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("")).toBe(DEFAULT_RETURN_PATH);
  });

  it.each([
    "https://evil.example/dashboard",
    "//evil.example/dashboard",
    "/\\evil.example/dashboard",
    "javascript:alert(1)",
    "dashboard/design-threads",
    "/admin",
    "/dashboard-evil",
    "/dashboard/../admin",
    "/dashboard/%2e%2e/admin",
    "/dashboard\n/design-threads",
    `/dashboard/${"a".repeat(600)}`,
  ])("refuses %s", (value) => {
    expect(safeReturnPath(value)).toBe(DEFAULT_RETURN_PATH);
  });
});

describe("loginPathFor", () => {
  it("carries the screen the visitor came for", () => {
    expect(loginPathFor("/dashboard/design-threads")).toBe(
      "/?next=%2Fdashboard%2Fdesign-threads",
    );
    expect(loginPathFor("/dashboard/communication", "?new=design")).toBe(
      "/?next=%2Fdashboard%2Fcommunication%3Fnew%3Ddesign",
    );
  });

  it("adds nothing for the dashboard home", () => {
    expect(loginPathFor("/dashboard")).toBe("/");
  });

  it("round-trips through the login address", () => {
    const loginPath = loginPathFor(
      "/dashboard/communication",
      "?new=materials",
    );
    const next = new URL(
      loginPath,
      "https://www.polaai.co.kr",
    ).searchParams.get("next");
    expect(safeReturnPath(next)).toBe("/dashboard/communication?new=materials");
  });
});
