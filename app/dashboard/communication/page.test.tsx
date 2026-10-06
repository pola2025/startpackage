import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 실제 useRouter 처럼 렌더마다 같은 객체를 돌려준다.
const navigation = vi.hoisted(() => ({
  search: "",
  router: { replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/hooks/use-media-query", () => ({ useIsMobile: () => false }));

import UserCommunicationPage from "./page";

class FakeEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close() {}
}

describe("UserCommunicationPage entry links", () => {
  beforeEach(() => {
    navigation.search = "";
    navigation.router.replace.mockClear();
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ items: [] }))),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the design inquiry form with the title and category filled in", async () => {
    navigation.search = "new=design";

    render(<UserCommunicationPage />);

    expect(
      await screen.findByRole("heading", { name: "디자인 문의" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toHaveValue("디자인 문의");
    expect(screen.getByRole("combobox")).toHaveTextContent("디자인");
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
    await waitFor(() =>
      expect(navigation.router.replace).toHaveBeenCalledWith(
        "/dashboard/communication",
        { scroll: false },
      ),
    );
  });

  it("opens the extra materials form and shows the file guidance", async () => {
    navigation.search = "new=materials";

    render(<UserCommunicationPage />);

    expect(
      await screen.findByRole("heading", { name: "자료·정보 추가 전달" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toHaveValue("추가 자료 전달");
    expect(screen.getByRole("combobox")).toHaveTextContent("추가자료");
    expect(screen.getByRole("button", { name: "보내기" })).toBeInTheDocument();
    expect(screen.getByText(/4MB가 넘는 파일과 영상은/)).toBeVisible();
  });

  it("keeps the form closed without an entry link", async () => {
    render(<UserCommunicationPage />);

    await screen.findByText("문의 내역이 없습니다");
    expect(
      screen.queryByRole("heading", { name: "새 문의 작성" }),
    ).not.toBeInTheDocument();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });
});
