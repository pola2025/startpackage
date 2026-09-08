import { describe, expect, it } from "vitest";
import { isAdminSessionCurrent } from "./admin-session";

describe("admin JWT revocation contract", () => {
  it("requires a matching live admin update stamp", () => {
    expect(isAdminSessionCurrent(10, { role: "super", updatedAt: 10 })).toBe(true);
    expect(isAdminSessionCurrent(undefined, { role: "super", updatedAt: 10 })).toBe(false);
    expect(isAdminSessionCurrent(9, { role: "super", updatedAt: 10 })).toBe(false);
    expect(isAdminSessionCurrent(10, null)).toBe(false);
  });
});
