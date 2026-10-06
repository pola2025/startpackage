import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

import LoginPage from "./page";

function submitLogin(phone = "01012345678", password = "wrong") {
  fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /로그인/ }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    mocks.signIn.mockReset();
    mocks.router.push.mockReset();
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the failure count on the first wrong password", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin", code: "invalid_1" });
    render(<LoginPage />);
    submitLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("실패 1/5회");
    expect(screen.getByText("START PACKAGE")).toBeInTheDocument();
  });

  it("moves to password reset on the second failure and keeps the phone number", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin", code: "invalid_2" });
    render(<LoginPage />);
    submitLogin();
    expect(await screen.findByText("비밀번호 재발급")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("남은 시도 3회");
    expect(screen.getByLabelText("가입 시 등록한 전화번호")).toHaveValue("01012345678");
  });

  it("moves to password reset when the login is blocked", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin", code: "blocked_ip_600" });
    render(<LoginPage />);
    submitLogin();
    expect(await screen.findByText("비밀번호 재발급")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("약 10분 후");
  });

  it("locks the reset button for three minutes after one SMS", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ success: true, message: "발송되었습니다." }));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /비밀번호를 잊으셨나요/ }));
    fireEvent.change(screen.getByLabelText("가입 시 등록한 전화번호"), { target: { value: "01012345678" } });
    fireEvent.click(screen.getByRole("button", { name: "재발급 신청" }));

    const locked = await screen.findByRole("button", { name: /후 재요청/ });
    expect(locked).toBeDisabled();
    expect(locked).toHaveTextContent(/[23]:[0-5]\d 후 재요청/);
    expect(Number(window.localStorage.getItem("startpackage.passwordResetCooldownUntil"))).toBeGreaterThan(Date.now());
    fireEvent.click(locked);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses the server's remaining cooldown when the SMS was already sent", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: "임시 비밀번호는 3분에 1번만 받을 수 있습니다.", retryAfterSeconds: 42 }, { status: 429 }),
    );
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /비밀번호를 잊으셨나요/ }));
    fireEvent.change(screen.getByLabelText("가입 시 등록한 전화번호"), { target: { value: "01012345678" } });
    fireEvent.click(screen.getByRole("button", { name: "재발급 신청" }));

    expect(await screen.findByRole("button", { name: /0:4\d 후 재요청/ })).toBeDisabled();
    expect(screen.getByText(/3분에 1번만/)).toBeInTheDocument();
  });

  it("restores the cooldown after a reload and unlocks when it ends", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.setItem("startpackage.passwordResetCooldownUntil", String(Date.now() + 2_000));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /비밀번호를 잊으셨나요/ }));
    expect(screen.getByRole("button", { name: /0:0\d 후 재요청/ })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(3_000); });
    await waitFor(() => expect(screen.getByRole("button", { name: "재발급 신청" })).toBeEnabled());
  });

  it("uses red hints and black sign-up guidance", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /비밀번호를 잊으셨나요/ })).toHaveClass("text-red-600");
    expect(screen.getByText("숫자만 입력 (하이픈 자동 제거)")).toHaveClass("text-red-600");
    expect(screen.getByText("계정이 없으신가요? 위 버튼을 클릭하여 가입해주세요")).toHaveClass("text-black");
    fireEvent.click(screen.getByRole("button", { name: /비밀번호를 잊으셨나요/ }));
    expect(screen.getByText("숫자만 입력 (해당 번호로 4자리 임시 비밀번호 발송)")).toHaveClass("text-red-600");
  });

  it("returns the student to the screen they came for after login", async () => {
    window.history.pushState({}, "", "/?next=%2Fdashboard%2Fcommunication%3Fnew%3Ddesign");
    mocks.signIn.mockResolvedValue({ error: null });
    render(<LoginPage />);
    submitLogin("01012345678", "1234");
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/dashboard/communication?new=design"));
  });

  it("goes to the dashboard home when no screen was asked for", async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    render(<LoginPage />);
    submitLogin("01012345678", "1234");
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/dashboard"));
  });

  it("goes to the dashboard home when the address points outside the dashboard", async () => {
    window.history.pushState({}, "", "/?next=%2F%2Fevil.example%2Fdashboard");
    mocks.signIn.mockResolvedValue({ error: null });
    render(<LoginPage />);
    submitLogin("01012345678", "1234");
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/dashboard"));
  });
});
