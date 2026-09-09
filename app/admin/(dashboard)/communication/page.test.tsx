import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminCommunicationPage from "./page";

type Message = {
  id: string;
  authorType: "user" | "admin";
  authorName: string;
  content: string;
  attachments: string[];
  createdAt: string;
  expectedCompletionDate: string | null;
  isReadByUser: boolean;
  readByUserAt: string | null;
  isReadByAdmin: boolean;
  readByAdminAt: string | null;
};

const message = (id: string, content: string): Message => ({
  id,
  authorType: "user",
  authorName: "테스트 사용자",
  content,
  attachments: [],
  createdAt: "2026-09-09T00:00:00.000Z",
  expectedCompletionDate: null,
  isReadByUser: true,
  readByUserAt: null,
  isReadByAdmin: false,
  readByAdminAt: null,
});

const thread = (id: string, title: string) => ({
  id,
  title,
  category: "일반",
  status: "open",
  lastReplyAt: "2026-09-09T00:00:00.000Z",
  createdAt: "2026-09-08T00:00:00.000Z",
  expectedCompletionDate: null,
  user: {
    id: `user-${id}`,
    이름: "테스트 사용자",
    email: `${id}@example.com`,
    연락처: "010-0000-0000",
    cohort: null,
  },
  _count: { messages: 1 },
});

const response = (body: unknown, ok = true): Response =>
  new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });

describe("AdminCommunicationPage conversation selection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads conversation details on click and keeps them visible after mark-read refresh", async () => {
    const summary = thread("thread-1", "첫 번째 문의");
    const detailMessage = message("message-1", "상세 대화 내용입니다");
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response({ items: [summary], nextCursor: null }))
      .mockResolvedValueOnce(
        response({ ...summary, messages: { items: [detailMessage], nextCursor: null } }),
      )
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ items: [summary], nextCursor: null }));

    render(<AdminCommunicationPage />);

    await waitFor(() => expect(screen.getAllByText("테스트 사용자")).toHaveLength(1));
    fireEvent.click(screen.getAllByRole("button", { name: /테스트 사용자/ })[0]);
    expect(await screen.findByText("첫 번째 문의")).toBeInTheDocument();
    expect(screen.queryByText("상세 대화 내용입니다")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("첫 번째 문의"));

    await waitFor(() => {
      expect(screen.getByText("상세 대화 내용입니다")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/communication/mark-read",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([input]) => String(input).includes("/api/admin/communication/threads?")).length,
      ).toBe(2);
    });
    expect(screen.getByText("상세 대화 내용입니다")).toBeInTheDocument();
  });

  it("keeps the newest selection when detail requests resolve out of order", async () => {
    const first = thread("thread-a", "문의 A");
    const second = thread("thread-b", "문의 B");
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;
    const detailA = new Promise((resolve) => {
      resolveA = resolve;
    });
    const detailB = new Promise((resolve) => {
      resolveB = resolve;
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response({ items: [first, second], nextCursor: null }))
      .mockImplementation((input) => {
        const url = String(input);
        if (url.includes("/threads/thread-a?")) return detailA as Promise<Response>;
        if (url.includes("/threads/thread-b?")) return detailB as Promise<Response>;
        return Promise.resolve(response({ ok: true }));
      });

    render(<AdminCommunicationPage />);
    await waitFor(() => expect(screen.getAllByText("테스트 사용자")).toHaveLength(2));
    const userButtons = screen.getAllByRole("button", { name: /테스트 사용자/ });
    fireEvent.click(userButtons[0]);
    fireEvent.click(userButtons[1]);
    expect(await screen.findByText("문의 A")).toBeInTheDocument();
    fireEvent.click(screen.getByText("문의 A"));
    fireEvent.click(screen.getByText("문의 B"));

    resolveB(response({ ...second, messages: { items: [message("message-b", "B의 대화")], nextCursor: null } }));
    await waitFor(() => expect(screen.getByText("B의 대화")).toBeInTheDocument());

    resolveA(response({ ...first, messages: { items: [message("message-a", "A의 대화")], nextCursor: null } }));
    await waitFor(() => expect(screen.queryByText("A의 대화")).not.toBeInTheDocument());
    expect(screen.getByText("B의 대화")).toBeInTheDocument();
  });

  it("shows the server-created admin message immediately after sending a reply", async () => {
    const summary = thread("thread-reply", "답변 문의");
    const detailMessage = message("message-user", "사용자 문의");
    const adminMessage: Message = {
      ...message("message-admin", "관리자 답변"),
      authorType: "admin",
      authorName: "관리자",
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response({ items: [summary], nextCursor: null }))
      .mockResolvedValueOnce(response({ ...summary, messages: { items: [detailMessage], nextCursor: null } }))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ items: [summary], nextCursor: null }))
      .mockResolvedValueOnce(response({ message: adminMessage }))
      .mockResolvedValueOnce(response({ items: [summary], nextCursor: null }));

    render(<AdminCommunicationPage />);
    await waitFor(() => expect(screen.getByText("테스트 사용자")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /테스트 사용자/ }));
    fireEvent.click(await screen.findByText("답변 문의"));
    await waitFor(() => expect(screen.getByText("사용자 문의")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/답글을 입력하세요/), {
      target: { value: "관리자 답변" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^전송$/ }));

    await waitFor(() => expect(screen.getByText("관리자 답변")).toBeInTheDocument());
  });
});
