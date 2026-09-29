import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function visit(path: string, cookie?: string) {
  return middleware(new NextRequest(`https://www.polaai.co.kr${path}`, {
    headers: cookie ? { cookie } : undefined,
  }));
}

describe("admin route protection in middleware", () => {
  it("sends signed-out visitors of admin pages to the admin login", () => {
    for (const path of ["/admin", "/admin/users", "/admin/blocked-logins"]) {
      const response = visit(path);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://www.polaai.co.kr/admin/login");
    }
  });

  it("keeps the admin login and registration pages reachable", () => {
    expect(visit("/admin/login").headers.get("location")).toBeNull();
    expect(visit("/admin/register").headers.get("location")).toBeNull();
  });

  it("lets a session cookie through to the page's own role check", () => {
    expect(visit("/admin/blocked-logins", "__Secure-authjs.session-token=x").headers.get("location")).toBeNull();
  });
});
