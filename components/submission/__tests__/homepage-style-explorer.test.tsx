import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomepageStyleOption } from "@/lib/homepage-styles";
import { HomepageStyleExplorer } from "../homepage-style-explorer";

const options = [
  {
    url: "https://example.com/current",
    previewUrl: "/samples/current/index.html",
    name: "기존 스타일",
    category: "current",
  },
  {
    url: "https://example.com/new",
    previewUrl: "/samples/new/index.html",
    name: "신규 스타일",
    category: "new",
    pageCount: 4,
  },
  {
    url: "https://example.com/paid",
    name: "유료 스타일",
    paid: true,
  },
] as HomepageStyleOption[];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("HomepageStyleExplorer", () => {
  it("탭 클릭은 미리보기만 바꾸고 선택 콜백을 호출하지 않는다", async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <HomepageStyleExplorer options={options} value="https://example.com/current" onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /신규 스타일/ }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /신규 스타일/ })).toHaveAttribute("aria-selected", "true");
    await waitFor(() =>
      expect(container.querySelector("iframe")).toHaveAttribute("src", "/samples/new/index.html"),
    );
  });

  it("명시적 선택 버튼에서 실제 URL을 그대로 전달한다", () => {
    const onSelect = vi.fn();
    render(<HomepageStyleExplorer options={options} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "이 스타일 선택" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("https://example.com/new");
  });

  it("유료 스타일은 볼 수 있지만 선택할 수 없다", () => {
    const onSelect = vi.fn();
    render(<HomepageStyleExplorer options={options} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("tab", { name: /유료 스타일/ }));
    const paidButton = screen.getByRole("button", { name: "선택 불가 · 개별문의" });
    expect(paidButton).toBeDisabled();
    fireEvent.click(paidButton);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("활성 스타일의 실제 iframe 하나만 렌더링한다", async () => {
    const { container } = render(<HomepageStyleExplorer options={options} />);
    await waitFor(() => expect(container.querySelectorAll("iframe")).toHaveLength(1));
    expect(container.querySelector("iframe")).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups",
    );
    expect(container.querySelector("iframe")?.getAttribute("sandbox")).not.toContain("allow-forms");
  });

  it("탭 전환 시 이전 iframe을 제거하고 새 iframe 하나를 마운트한다", async () => {
    const { container } = render(
      <HomepageStyleExplorer options={options} value="https://example.com/current" />,
    );
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    const previousFrame = container.querySelector("iframe");
    fireEvent.click(screen.getByRole("tab", { name: /신규 스타일/ }));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBe(previousFrame));
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("컴포넌트가 사라질 때 느린 응답 타이머를 정리한다", async () => {
    vi.useFakeTimers();
    const { unmount } = render(<HomepageStyleExplorer options={options} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("방향키와 Home, End 키로 탭을 이동한다", () => {
    render(<HomepageStyleExplorer options={options} value="https://example.com/current" />);
    const currentTab = screen.getByRole("tab", { name: "기존 스타일" });
    fireEvent.keyDown(currentTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /신규 스타일/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /신규 스타일/ }), { key: "End" });
    expect(screen.getByRole("tab", { name: /유료 스타일/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /유료 스타일/ }), { key: "Home" });
    expect(currentTab).toHaveAttribute("aria-selected", "true");
  });

  it("disabled는 선택만 막고 스타일 탐색은 허용한다", () => {
    const onSelect = vi.fn();
    render(<HomepageStyleExplorer options={options} onSelect={onSelect} disabled />);
    expect(screen.getByRole("button", { name: "이 스타일 선택" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "기존 스타일" }));
    expect(screen.getByRole("tab", { name: "기존 스타일" })).toHaveAttribute("aria-selected", "true");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("로컬에서는 fallback 지정 스타일만 실제 화면 캡처를 사용한다", async () => {
    const localOptions = [
      {
        url: "https://blocked.example.com",
        name: "로컬 캡처 스타일",
        category: "current",
        localSnapshotFallback: true,
        previewImage: "/samples/current-style-previews/example-desktop.png",
        previewImageMobile: "/samples/current-style-previews/example-mobile.png",
      },
    ] as unknown as HomepageStyleOption[];
    const { container } = render(<HomepageStyleExplorer options={localOptions} />);

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/samples/current-style-previews/example-desktop.png",
    );
    expect(screen.getByRole("link", { name: "새 창으로 보기" })).toHaveAttribute(
      "href",
      "https://blocked.example.com",
    );
  });

  it("캡처 이미지가 있어도 fallback 지정이 없으면 iframe을 유지한다", async () => {
    const directOptions = [
      {
        url: "https://direct.example.com",
        name: "직접 탐색 스타일",
        previewImage: "/samples/current-style-previews/direct.png",
      },
    ] as unknown as HomepageStyleOption[];
    const { container } = render(<HomepageStyleExplorer options={directOptions} />);

    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    expect(container.querySelector("img")).toBeNull();
  });

  it("목록에 없는 저장값을 선택 콜백으로 임의 초기화하지 않는다", () => {
    const onSelect = vi.fn();
    render(
      <HomepageStyleExplorer
        options={options}
        value="https://retired.example.com"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("tab", { name: /신규 스타일/ })).toHaveAttribute("aria-selected", "true");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("사용자가 다른 탭을 보는 중 부모 value 변경이 미리보기를 덮어쓰지 않는다", () => {
    const { rerender } = render(
      <HomepageStyleExplorer options={options} value="https://example.com/current" />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /신규 스타일/ }));
    rerender(<HomepageStyleExplorer options={options} value="https://example.com/paid" />);
    expect(screen.getByRole("tab", { name: /신규 스타일/ })).toHaveAttribute("aria-selected", "true");
  });
});
