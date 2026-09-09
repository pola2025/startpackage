import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  },
  session: {
    current: {
      data: null as unknown,
      status: "unauthenticated" as "authenticated" | "loading" | "unauthenticated",
    },
  },
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
  useSession: () => mocks.session.current,
}));

import AdminLoginPage from "./page";

describe("AdminLoginPage", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
    mocks.router.refresh.mockReset();
    mocks.signIn.mockReset();
    mocks.session.current = {
      data: null,
      status: "unauthenticated",
    };
  });

  afterEach(() => {
    cleanup();
  });

  it.each([
    ["revoked", { id: "", role: "user", userType: undefined }],
    ["member", { id: "member-1", role: "user", userType: "user" }],
  ])("keeps the login form visible for an authenticated %s session", async (_label, user) => {
    mocks.session.current = {
      data: { user },
      status: "authenticated",
    };

    render(<AdminLoginPage />);

    expect(screen.getByText("ADMIN ACCESS")).toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    await waitFor(() => expect(mocks.router.replace).not.toHaveBeenCalled());
  });

  it("redirects a valid authenticated admin to the dashboard", async () => {
    mocks.session.current = {
      data: {
        user: {
          id: "admin-1",
          role: "super",
          userType: "admin",
          adminUpdatedAt: 1,
        },
      },
      status: "authenticated",
    };

    render(<AdminLoginPage />);

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/admin"));
  });
});
