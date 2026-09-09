import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./cohort-actions", () => ({
  default: () => null,
}));

import CohortsList from "./cohorts-list";

const cohort = (id: string, name: string, startDate: string) => ({
  id,
  name,
  교육요일: "수",
  isActive: true,
  교육시작일: new Date(startDate),
  자료제출마감일: new Date(startDate),
  _count: { users: 0 },
});

describe("CohortsList refreshed props", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a newly created cohort after the server props are refreshed", async () => {
    const oldCohort = cohort("cohort-26", "26기", "2026-08-13T00:00:00.000Z");
    const newCohort = cohort("cohort-27", "27기", "2026-09-16T00:00:00.000Z");

    const view = render(<CohortsList cohorts={[oldCohort]} />);
    expect(screen.queryByText("27기")).not.toBeInTheDocument();

    view.rerender(<CohortsList cohorts={[newCohort, oldCohort]} />);

    await waitFor(() => {
      expect(screen.getAllByText("27기").length).toBeGreaterThan(0);
    });
  });

  it("does not append a stale load-more response after refreshed props arrive", async () => {
    const initial = cohort("cohort-26", "26기", "2026-08-13T00:00:00.000Z");
    const refreshed = cohort("cohort-27", "27기", "2026-09-16T00:00:00.000Z");
    const stalePage = cohort("cohort-25", "25기", "2026-07-16T00:00:00.000Z");
    let resolvePage!: (response: Response) => void;
    const pageResponse = new Promise<Response>((resolve) => {
      resolvePage = resolve;
    });
    vi.stubGlobal("fetch", vi.fn(() => pageResponse));

    const view = render(<CohortsList cohorts={[initial]} nextCursor="cursor-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));

    view.rerender(<CohortsList cohorts={[refreshed]} />);
    resolvePage(
      new Response(JSON.stringify({ items: [stalePage], nextCursor: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await waitFor(() => expect(screen.getAllByText("27기").length).toBeGreaterThan(0));
    expect(screen.queryByText("25기")).not.toBeInTheDocument();
  });

  it("stops when the server repeats the current cursor and deduplicates rows", async () => {
    const initial = cohort("cohort-26", "26기", "2026-08-13T00:00:00.000Z");
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [initial], nextCursor: "cursor-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("alert", vi.fn());

    render(<CohortsList cohorts={[initial]} nextCursor="cursor-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "더 보기" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText("26기")).toHaveLength(2);
    expect(window.alert).toHaveBeenCalledWith("추가 기수를 불러오지 못했습니다.");
  });

  it("keeps rapid duplicate clicks to one page request", async () => {
    const initial = cohort("cohort-26", "26기", "2026-08-13T00:00:00.000Z");
    let resolvePage!: (response: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => {
        resolvePage = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CohortsList cohorts={[initial]} nextCursor="cursor-1" />);
    const button = await screen.findByRole("button", { name: "더 보기" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolvePage(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }));
  });

  it("stops a cursor cycle instead of requesting the same page again", async () => {
    const initial = cohort("cohort-26", "26기", "2026-08-13T00:00:00.000Z");
    vi.stubGlobal("alert", vi.fn());
    const responses = ["cursor-b", "cursor-a"];
    const fetchMock = vi.fn(() => {
      const nextCursor = responses.shift() ?? "cursor-a";
      return Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CohortsList cohorts={[initial]} nextCursor="cursor-a" />);
    fireEvent.click(await screen.findByRole("button", { name: "더 보기" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an oversized page and stops further fetching", async () => {
    const initial = cohort("cohort-26", "26기", "2026-08-13T00:00:00.000Z");
    vi.stubGlobal("alert", vi.fn());
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: Array.from({ length: 51 }, (_, i) => cohort(`extra-${i}`, `${i}기`, "2026-01-01T00:00:00.000Z")), nextCursor: "cursor-2" }), { status: 200 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CohortsList cohorts={[initial]} nextCursor="cursor-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "더 보기" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.alert).toHaveBeenCalledWith("추가 기수를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  });

  it("stops at the row cap with a partial-list notice", async () => {
    const initial = Array.from({ length: 1000 }, (_, i) => ({
      ...cohort(`cohort-${i}`, `${i}기`, "2026-01-01T00:00:00.000Z"),
      isActive: false,
    }));
    vi.stubGlobal("alert", vi.fn());
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<CohortsList cohorts={initial} nextCursor="cursor-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "더 보기" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("기수 목록 조회 한도에 도달했습니다.");
  });
});
