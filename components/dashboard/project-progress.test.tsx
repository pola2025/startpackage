import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ProjectProgress from "./project-progress";

// 2026-10-17 사용자가 붙여 준 실제 품목 7개
const WORKFLOWS = [
  { id: "w-card", type: "명함", status: "발주완료" },
  { id: "w-tag", type: "명찰", status: "발주대기" },
  { id: "w-env", type: "대봉투", status: "발주완료" },
  { id: "w-cover", type: "자문계약서 표지", status: "대기" },
  { id: "w-inner", type: "자문계약서 내지", status: "발주요청" },
  { id: "w-logo", type: "로고", status: "최종확정" },
  { id: "w-home", type: "홈페이지", status: "제작 완료" },
];

const cardTitles = () =>
  screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

describe("ProjectProgress cards", () => {
  afterEach(() => {
    cleanup();
  });

  it("puts the customer's turn first and completed items last", () => {
    render(<ProjectProgress workflows={WORKFLOWS} />);

    expect(cardTitles()).toEqual([
      "명찰",
      "자문계약서 내지",
      "명함",
      "대봉투",
      "자문계약서 표지",
      "로고",
      "홈페이지",
    ]);
  });

  it("shows whose turn it is and links each card to its workflow", () => {
    render(<ProjectProgress workflows={WORKFLOWS} />);

    const tag = screen.getByRole("link", { name: /명찰/ });
    expect(tag).toHaveAttribute("href", "/dashboard/workflows?open=w-tag");
    expect(within(tag).getByText("내 차례")).toBeInTheDocument();
    expect(within(tag).getByText("시안·발주 확인")).toBeInTheDocument();

    expect(
      within(screen.getByRole("link", { name: /명함/ })).getByText("인쇄소"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("link", { name: /자문계약서 내지/ })).getByText(
        "폴라애드",
      ),
    ).toBeInTheDocument();
  });

  it("marks the current step in each card's stage indicator", () => {
    render(<ProjectProgress workflows={WORKFLOWS} />);

    const tagSteps = screen.getByRole("list", { name: "명찰 진행 단계" });
    const current = within(tagSteps)
      .getAllByRole("listitem")
      .filter((item) => item.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("검토");

    const coverSteps = screen.getByRole("list", {
      name: "자문계약서 표지 진행 단계",
    });
    expect(
      within(coverSteps)
        .getAllByRole("listitem")
        .some((item) => item.getAttribute("aria-current") === "step"),
    ).toBe(false);
  });

  it("filters by tab and keeps the counts on the tabs", () => {
    render(<ProjectProgress workflows={WORKFLOWS} />);

    fireEvent.click(screen.getByRole("button", { name: /완료 2/ }));
    expect(cardTitles()).toEqual(["로고", "홈페이지"]);

    fireEvent.click(screen.getByRole("button", { name: /내 확인 1/ }));
    expect(cardTitles()).toEqual(["명찰"]);
  });

  it("folds completed items into one row on mobile until it is opened", () => {
    render(<ProjectProgress workflows={WORKFLOWS} />);

    const logo = screen.getByRole("link", { name: /로고/ });
    expect(logo.className).toContain("hidden sm:flex");

    fireEvent.click(screen.getByRole("button", { name: /로고 · 홈페이지/ }));
    expect(screen.getByRole("link", { name: /로고/ }).className).not.toContain(
      "hidden sm:flex",
    );
  });
});
