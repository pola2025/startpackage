import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginBlocksClient from "./login-blocks-client";

const memberBlock = {
  keyHash: "a".repeat(64),
  attempts: 6,
  retryAfterSeconds: 540,
  lastAttemptAt: Date.now(),
  user: { id: "user-1", name: "홍길동", phone: "010-1111-2222", cohortName: "27기" },
};
const otherBlock = { keyHash: "b".repeat(64), attempts: 51, retryAfterSeconds: 120, lastAttemptAt: Date.now(), user: null };

describe("LoginBlocksClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists blocked members and releases one after confirmation", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ enabled: true, windowMinutes: 15, users: [memberBlock], others: [otherBlock] }))
      .mockResolvedValueOnce(Response.json({ cleared: 1 }))
      .mockResolvedValueOnce(Response.json({ enabled: true, windowMinutes: 15, users: [], others: [otherBlock] }));

    render(<LoginBlocksClient />);
    expect(await screen.findByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText(/시도 6회 .* 약 9분 뒤 자동 해제/)).toBeInTheDocument();
    expect(screen.getByText(/회원과 연결되지 않은 차단 1건/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "차단 해제" }));
    expect(await screen.findByRole("status")).toHaveTextContent("홍길동님의 로그인 차단을 해제했습니다.");
    expect(vi.mocked(fetch).mock.calls[1]).toEqual([
      "/api/admin/login-blocks",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ keyHashes: ["a".repeat(64)] }) }),
    ]);
    await waitFor(() => expect(screen.getByText("지금 차단된 회원이 없습니다.")).toBeInTheDocument());
  });

  it("does nothing when the confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ enabled: true, windowMinutes: 15, users: [memberBlock], others: [] }));
    render(<LoginBlocksClient />);
    fireEvent.click(await screen.findByRole("button", { name: "차단 해제" }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("releases every unmatched block at once", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ enabled: true, windowMinutes: 15, users: [], others: [otherBlock, { ...otherBlock, keyHash: "c".repeat(64) }] }))
      .mockResolvedValueOnce(Response.json({ cleared: 2 }))
      .mockResolvedValueOnce(Response.json({ enabled: true, windowMinutes: 15, users: [], others: [] }));
    render(<LoginBlocksClient />);
    fireEvent.click(await screen.findByRole("button", { name: "모두 해제" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toEqual({ keyHashes: ["b".repeat(64), "c".repeat(64)] });
  });

  it("shows load errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: "권한이 없습니다." }, { status: 403 }));
    render(<LoginBlocksClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("권한이 없습니다.");
  });
});
