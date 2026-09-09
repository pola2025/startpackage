import { describe, expect, it } from "vitest";
import { hasAdminAccess, isAdminSessionCurrent } from "./admin-session";

describe("admin page access", () => {
  it("allows only identified administrators", () => {
    for (const role of ["super", "designer", "operator"]) {
      expect(hasAdminAccess({ id: "admin-1", role })).toBe(true);
    }
  });

  it("keeps the login form accessible for revoked, member and incomplete sessions", () => {
    for (const user of [undefined, null, {}, { id: "", role: "user" }, { id: "member-1", role: "user" }, { role: "super" }, { id: "admin-1" }]) {
      expect(hasAdminAccess(user)).toBe(false);
    }
  });
});

describe("admin JWT revocation contract", () => {
  it("requires a matching live admin update stamp", () => {
    expect(isAdminSessionCurrent(10, { role: "super", updatedAt: 10 })).toBe(true);
    expect(isAdminSessionCurrent(undefined, { role: "super", updatedAt: 10 })).toBe(false);
    expect(isAdminSessionCurrent(9, { role: "super", updatedAt: 10 })).toBe(false);
    expect(isAdminSessionCurrent(10, null)).toBe(false);
  });
});
