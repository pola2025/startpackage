import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
  },
  session: {
    current: {
      data: null as unknown,
      status: "unauthenticated" as "authenticated" | "loading" | "unauthenticated",
    },
  },
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/admin",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => mocks.session.current,
}));

import AdminLayout from "./layout";

describe("AdminLayout", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ unreadCount: 0 }) });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.session.current = {
      data: {
        user: {
          id: "member-1",
          role: "user",
          userType: "user",
        },
      },
      status: "authenticated",
    };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sends an authenticated non-admin to admin login without fetching admin data", async () => {
    render(
      <AdminLayout>
        <div>dashboard</div>
      </AdminLayout>,
    );

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/admin/login"));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
