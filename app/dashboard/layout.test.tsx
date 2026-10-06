import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  session: { data: null as unknown, status: "unauthenticated" },
  pathname: "/dashboard",
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => mocks.router,
  usePathname: () => mocks.pathname,
}));
vi.mock("next-auth/react", () => ({ useSession: () => mocks.session }));
vi.mock("@/components/ui/sidebar", () => ({ Sidebar: () => null }));
vi.mock("@/components/ui/bottom-tab-bar", () => ({ BottomTabBar: () => null }));
vi.mock("@/components/ui/design-confirmation-modal", () => ({
  DesignConfirmationModal: () => null,
}));
vi.mock("@/components/ui/message-notification-modal", () => ({
  MessageNotificationModal: () => null,
}));
vi.mock("@/components/ui/system-alert-modal", () => ({
  SystemAlertModal: () => null,
}));
vi.mock("@/components/ui/cohort-announcement-popup", () => ({
  CohortAnnouncementPopup: () => null,
}));
vi.mock("@/components/ui/mobile-more-menu", () => ({
  MobileMoreMenu: () => null,
}));
vi.mock("@/components/ui/support-contact-notice", () => ({
  SupportContactPopup: () => null,
}));

import UserLayout from "./layout";

class FakeEventSource {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close() {}
}

function visit(pathname: string, search = "") {
  mocks.pathname = pathname;
  window.history.pushState({}, "", `${pathname}${search}`);
}

describe("UserLayout", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    mocks.session = { data: null, status: "unauthenticated" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ unreadCount: 0, workflows: [] })),
    );
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("sends a logged-out visitor to login with the screen they came for", async () => {
    visit("/dashboard/design-threads");
    render(<UserLayout>내용</UserLayout>);
    await waitFor(() =>
      expect(mocks.router.push).toHaveBeenCalledWith(
        "/?next=%2Fdashboard%2Fdesign-threads",
      ),
    );
  });

  it("keeps the query of the screen they came for", async () => {
    visit("/dashboard/communication", "?new=design");
    render(<UserLayout>내용</UserLayout>);
    await waitFor(() =>
      expect(mocks.router.push).toHaveBeenCalledWith(
        "/?next=%2Fdashboard%2Fcommunication%3Fnew%3Ddesign",
      ),
    );
  });

  it("adds nothing when the visitor came for the dashboard home", async () => {
    visit("/dashboard");
    render(<UserLayout>내용</UserLayout>);
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/"));
  });

  it("leaves no return screen after a logout", async () => {
    visit("/dashboard/communication");
    mocks.session = {
      data: { user: { name: "수강생" } },
      status: "authenticated",
    };
    const view = render(<UserLayout>내용</UserLayout>);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(mocks.router.push).not.toHaveBeenCalled();

    mocks.session = { data: null, status: "unauthenticated" };
    view.rerender(<UserLayout>내용</UserLayout>);
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/"));
    expect(mocks.router.push).toHaveBeenCalledTimes(1);
  });
});
