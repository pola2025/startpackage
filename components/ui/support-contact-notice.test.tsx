import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("shows all support channels in the dashboard popup", async () => {
    render(<SupportContactPopup />);

    expect(
      await screen.findByRole("heading", { name: "진행 관련 문의 안내" }),
    ).toBeInTheDocument();
    expect(screen.getByText("polarad")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /010-9897-9834/ })).toHaveAttribute(
      "href",
      "tel:01098979834",
    );
    expect(
      screen.getByRole("link", { name: /mkt@polarad.co.kr/ }),
    ).toHaveAttribute("href", "mailto:mkt@polarad.co.kr");
  });

  it("remembers the today-only dismissal", async () => {
    render(<SupportContactPopup />);
    await screen.findByRole("heading", { name: "진행 관련 문의 안내" });

    fireEvent.click(screen.getByLabelText("오늘 하루 보지 않기"));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    await waitFor(() =>
      expect(
        localStorage.getItem("support-contact-notice-dismissed-until-v1"),
      ).toBeTruthy(),
    );
  });

  it("keeps the same contacts in the fixed desktop card", () => {
    render(<SupportContactCard />);

    expect(screen.getByText("폴라애드")).toBeInTheDocument();
    expect(screen.getByText("polarad")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "010-9897-9834" })).toHaveAttribute(
      "href",
      "tel:01098979834",
    );
    expect(
      screen.getByRole("link", { name: "mkt@polarad.co.kr" }),
    ).toHaveAttribute("href", "mailto:mkt@polarad.co.kr");
  });
});
