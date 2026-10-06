import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  SupportContactCard,
  SupportContactPopup,
} from "./support-contact-notice";

describe("SupportContactNotice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("leads with the chat entry buttons in the dashboard popup", async () => {
    render(<SupportContactPopup />);

    expect(
      await screen.findByRole("heading", {
        name: "문의는 채팅으로 남겨주세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /디자인 문의하기/ }),
    ).toHaveAttribute("href", "/dashboard/communication?new=design");
    expect(
      screen.getByRole("link", { name: /자료·정보 추가 전달/ }),
    ).toHaveAttribute("href", "/dashboard/communication?new=materials");
    expect(
      screen.getByRole("link", { name: "그 밖의 문의 남기기" }),
    ).toHaveAttribute("href", "/dashboard/communication");
  });

  it("says what the phone and mail contacts are for in the popup", async () => {
    render(<SupportContactPopup />);
    await screen.findByRole("heading", { name: "문의는 채팅으로 남겨주세요" });

    expect(screen.getByRole("link", { name: "010-9897-9834" })).toHaveAttribute(
      "href",
      "tel:01098979834",
    );
    expect(screen.getByText("홈페이지·마케팅 문의 전용")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "mkt@polarad.co.kr" }),
    ).toHaveAttribute("href", "mailto:mkt@polarad.co.kr");
    expect(screen.getByText("4MB가 넘는 파일·영상 전달")).toBeInTheDocument();
  });

  it("remembers the today-only dismissal", async () => {
    render(<SupportContactPopup />);
    await screen.findByRole("heading", { name: "문의는 채팅으로 남겨주세요" });

    fireEvent.click(screen.getByLabelText("오늘 하루 보지 않기"));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    await waitFor(() =>
      expect(
        localStorage.getItem("support-contact-notice-dismissed-until-v1"),
      ).toBeTruthy(),
    );
  });

  it("shows the chat buttons above the labelled contacts in the fixed desktop card", () => {
    render(<SupportContactCard />);

    expect(
      screen.getByRole("link", { name: "디자인 문의하기" }),
    ).toHaveAttribute("href", "/dashboard/communication?new=design");
    expect(
      screen.getByRole("link", { name: "자료·정보 추가 전달" }),
    ).toHaveAttribute("href", "/dashboard/communication?new=materials");
    expect(screen.getByRole("link", { name: "010-9897-9834" })).toHaveAttribute(
      "href",
      "tel:01098979834",
    );
    expect(screen.getByText("홈페이지·마케팅 문의 전용")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "mkt@polarad.co.kr" }),
    ).toHaveAttribute("href", "mailto:mkt@polarad.co.kr");
    expect(screen.getByText("4MB가 넘는 파일·영상 전달")).toBeInTheDocument();
  });
});
