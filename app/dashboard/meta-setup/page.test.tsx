import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MetaSetupPage from "./page";

const SYSTEM_TOKEN = "EAAQ" + "a".repeat(180) + "END1";
const THREADS_TOKEN = "THAA" + "b".repeat(140) + "END2";
const doneView = {
  stage: "done", type: "instagram", loginId: "my_insta", hasPassword: true, memo: null,
  requestedAt: 1_000, doneAt: 2_000, emailSentAt: 2_001, tokens: { systemUserToken: SYSTEM_TOKEN, threadsToken: THREADS_TOKEN },
};

describe("MetaSetupPage tokens", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(doneView)));
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("copies the whole token with one tap on its box even while it is masked", async () => {
    render(<MetaSetupPage />);
    const box = await screen.findByRole("button", { name: "시스템사용자 토큰 복사" });
    expect(box).not.toHaveTextContent(SYSTEM_TOKEN);
    fireEvent.click(box);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SYSTEM_TOKEN));
    expect(await screen.findByText("복사했어요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "쓰레드 토큰 복사" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(THREADS_TOKEN));
  });

  it("opened from the mail copy button, copies that token right away and drops the flag from the address", async () => {
    window.history.replaceState(null, "", "/dashboard/meta-setup?copy=threads");
    render(<MetaSetupPage />);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(THREADS_TOKEN));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(await screen.findByText("복사했어요. Codex에 붙여 넣으세요.")).toBeInTheDocument();
  });

  it("asks for one tap when the browser blocks the automatic copy", async () => {
    writeText.mockRejectedValueOnce(new Error("NotAllowedError"));
    window.history.replaceState(null, "", "/dashboard/meta-setup?copy=system");
    render(<MetaSetupPage />);
    expect(await screen.findByText("이 브라우저는 자동 복사를 막아요. 상자를 한 번 누르면 복사됩니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "시스템사용자 토큰 복사" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(SYSTEM_TOKEN));
  });

  it("does not copy anything without the mail flag", async () => {
    window.history.replaceState(null, "", "/dashboard/meta-setup");
    render(<MetaSetupPage />);
    await screen.findByRole("button", { name: "시스템사용자 토큰 복사" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("shows the full token only when asked", async () => {
    render(<MetaSetupPage />);
    const box = await screen.findByRole("button", { name: "시스템사용자 토큰 복사" });
    fireEvent.click(screen.getAllByRole("button", { name: "전체 보기" })[0]);
    expect(box).toHaveTextContent(SYSTEM_TOKEN);
  });
});
