import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CohortRosterDialog from "./cohort-roster-dialog";

const START = Date.parse("2026-10-29T09:00:00+09:00");
const WEEK2 = Date.parse("2026-11-05T10:00:00+09:00");

const detail = {
  cohort: {
    id: "c28",
    name: "28기",
    startAt: START,
    deadlineAt: START + 21 * 86_400_000,
    week2ReminderAt: WEEK2,
  },
  members: [
    {
      id: "r1",
      name: "박주원",
      phone: "01057583824",
      status: "미가입",
      missing: [],
      userName: null,
      reminder: null,
    },
    {
      id: "r2",
      name: "유채영",
      phone: "01020068831",
      status: "자료 미제출",
      missing: ["사업자등록증", "원하는 로고 설명"],
      userName: "유채영",
      reminder: null,
    },
  ],
  outsiders: [
    {
      userId: "u9",
      name: "홍길동",
      phone: "01099990000",
      createdAt: START + 86_400_000,
    },
  ],
  counts: { roster: 2, joined: 1, complete: 0 },
};

function json(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("CohortRosterDialog", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows each member's status, missing items and the week-2 schedule", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(START - 86_400_000);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => json(detail)),
    );
    render(
      <CohortRosterDialog
        cohort={{ id: "c28", name: "28기" }}
        onOpenChange={vi.fn()}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText("박주원")).toBeInTheDocument();
    expect(screen.getByText("28기 대상자 명단")).toBeInTheDocument();
    expect(screen.getByText("010-5758-3824")).toBeInTheDocument();
    expect(screen.getByText("미가입")).toBeInTheDocument();
    expect(screen.getByText("가입 · 자료 미제출")).toBeInTheDocument();
    expect(
      screen.getByText("빠진 항목: 사업자등록증, 원하는 로고 설명"),
    ).toBeInTheDocument();
    expect(screen.getByText(/오전 10시 자동 발송 예정/)).toBeInTheDocument();
    expect(screen.getAllByText("발송 예정")).toHaveLength(2);
    expect(screen.getByText("명단에 없는 가입자 1명")).toBeInTheDocument();
  });

  it("adds pasted lines and refreshes the list summary", async () => {
    const onChanged = vi.fn();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ added: 1, duplicates: 0 })
        : json(detail),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <CohortRosterDialog
        cohort={{ id: "c28", name: "28기" }}
        onOpenChange={vi.fn()}
        onChanged={onChanged}
      />,
    );
    await screen.findByText("박주원");

    fireEvent.change(screen.getByPlaceholderText(/한 줄에 한 명씩/), {
      target: { value: "김새롬 010-1234-5678" },
    });
    expect(screen.getByText("1명 인식됨")).toBeInTheDocument();
    // 첫 번째는 붙여 넣기 추가 버튼, 두 번째는 명단 밖 가입자 줄의 버튼이다
    fireEvent.click(screen.getAllByRole("button", { name: "명단에 추가" })[0]);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      cohortId: "c28",
      text: "김새롬 010-1234-5678",
    });
    expect(screen.getByText("1명을 추가했습니다.")).toBeInTheDocument();
  });

  it("asks once more before removing someone from the roster", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? json({ ok: true }) : json(detail),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <CohortRosterDialog
        cohort={{ id: "c28", name: "28기" }}
        onOpenChange={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    await screen.findByText("박주원");

    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "빼기 확인" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/cohort-roster/r1?cohortId=c28",
        { method: "DELETE" },
      ),
    );
  });
});
