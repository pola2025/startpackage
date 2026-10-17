import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MASKED_SECRET } from "@/lib/security/submission-secret-mask";
import { META_SETUP_CHANGED_EVENT } from "@/lib/admin/meta-setup-events";
import MetaSetupClient, { type MetaSetupItem } from "./meta-setup-client";

const SYSTEM_TOKEN = "EAAB-system-user-token-1234567890";
const THREADS_TOKEN = "THQW-threads-token-abcdefghijk";
const pendingItem: MetaSetupItem = {
  userId: "user-1", name: "이재호", cohortName: "18기", brandName: "폴라애드", email: "framei@naver.com", type: "instagram",
  loginId: "test", hasPassword: true, memo: "2단계 인증을 써요", requestedAt: Date.now() - 5 * 60_000, doneAt: null, emailSentAt: null,
};
const list = (items: MetaSetupItem[], counts = { pending: items.length, done: 0 }) => Response.json({ items, counts, nextCursor: null });

describe("MetaSetupClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a pending request and completes it with two tokens after confirmation", async () => {
    const changed = vi.fn();
    window.addEventListener(META_SETUP_CHANGED_EVENT, changed);
    vi.mocked(fetch)
      .mockResolvedValueOnce(list([pendingItem]))
      .mockResolvedValueOnce(Response.json({ success: true, emailSent: true, email: "framei@naver.com" }))
      .mockResolvedValueOnce(list([], { pending: 0, done: 1 }));

    render(<MetaSetupClient />);
    expect(await screen.findByRole("heading", { name: "이재호" })).toBeInTheDocument();
    expect(screen.getByText("18기")).toBeInTheDocument();
    expect(screen.getByText("framei@naver.com")).toBeInTheDocument();
    expect(screen.getByText("2단계 인증을 써요")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/admin/meta-setup?stage=pending");

    fireEvent.change(screen.getByLabelText("시스템사용자 토큰"), { target: { value: SYSTEM_TOKEN } });
    fireEvent.change(screen.getByLabelText("쓰레드 토큰"), { target: { value: THREADS_TOKEN } });
    fireEvent.click(screen.getByRole("button", { name: "설정 완료 처리" }));

    expect(await screen.findByRole("status")).toHaveTextContent("framei@naver.com(으)로 토큰 메일을 보냈습니다.");
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("framei@naver.com"));
    expect(vi.mocked(fetch).mock.calls[1]).toEqual([
      "/api/admin/meta-setup/user-1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ systemUserToken: SYSTEM_TOKEN, threadsToken: THREADS_TOKEN }) }),
    ]);
    await waitFor(() => expect(screen.getByText("지금 처리할 Meta 설정요청이 없습니다.")).toBeInTheDocument());
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener(META_SETUP_CHANGED_EVENT, changed);
  });

  it("asks for both tokens before sending anything", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(list([pendingItem]));
    render(<MetaSetupClient />);
    fireEvent.click(await screen.findByRole("button", { name: "설정 완료 처리" }));
    expect(screen.getByRole("alert")).toHaveTextContent("토큰 2개를 모두 입력해 주세요.");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("keeps the card and shows the server error when completion fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(list([pendingItem]))
      .mockResolvedValueOnce(Response.json({ error: "완료 처리에 실패했습니다." }, { status: 500 }));
    render(<MetaSetupClient />);
    fireEvent.change(await screen.findByLabelText("시스템사용자 토큰"), { target: { value: SYSTEM_TOKEN } });
    fireEvent.change(screen.getByLabelText("쓰레드 토큰"), { target: { value: THREADS_TOKEN } });
    fireEvent.click(screen.getByRole("button", { name: "설정 완료 처리" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("완료 처리에 실패했습니다.");
    expect(screen.getByRole("heading", { name: "이재호" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reveals the password only when asked", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(list([pendingItem]))
      .mockResolvedValueOnce(Response.json({ field: "InstagramPW", value: "test12" }));
    render(<MetaSetupClient />);
    fireEvent.click(await screen.findByRole("button", { name: "보기" }));
    expect(await screen.findByText("test12")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[1]).toEqual([
      "/api/admin/users/user-1/submission/reveal",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ field: "InstagramPW" }) }),
    ]);
  });

  it("marks a completed setup whose mail failed and resends with the stored tokens", async () => {
    const failed = { ...pendingItem, doneAt: 5000, emailSentAt: null };
    vi.mocked(fetch)
      .mockResolvedValueOnce(list([pendingItem], { pending: 1, done: 1 }))
      .mockResolvedValueOnce(list([failed], { pending: 1, done: 1 }))
      .mockResolvedValueOnce(Response.json({ success: true, emailSent: true, email: "framei@naver.com" }))
      .mockResolvedValueOnce(list([{ ...failed, emailSentAt: 6000 }], { pending: 1, done: 1 }));
    render(<MetaSetupClient />);
    fireEvent.click(await screen.findByRole("tab", { name: /완료/ }));
    expect(await screen.findByText("메일 안 나감")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/admin/meta-setup?stage=done");
    fireEvent.click(screen.getByRole("button", { name: "메일 다시" }));
    await waitFor(() => expect(screen.getByText("메일 발송")).toBeInTheDocument());
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[2][1]?.body))).toEqual({ systemUserToken: MASKED_SECRET, threadsToken: MASKED_SECRET });
  });

  it("explains a too-short token before sending anything", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(list([pendingItem]));
    render(<MetaSetupClient />);
    fireEvent.change(await screen.findByLabelText("시스템사용자 토큰"), { target: { value: "short-token" } });
    fireEvent.change(screen.getByLabelText("쓰레드 토큰"), { target: { value: THREADS_TOKEN } });
    fireEvent.click(screen.getByRole("button", { name: "설정 완료 처리" }));
    expect(screen.getByRole("alert")).toHaveTextContent("시스템사용자 토큰은 20자 이상이어야 합니다.");
    fireEvent.change(screen.getByLabelText("시스템사용자 토큰"), { target: { value: THREADS_TOKEN } });
    fireEvent.click(screen.getByRole("button", { name: "설정 완료 처리" }));
    expect(screen.getByRole("alert")).toHaveTextContent("두 토큰이 같습니다.");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("shows load errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: "권한이 없습니다." }, { status: 403 }));
    render(<MetaSetupClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("권한이 없습니다.");
  });
});
