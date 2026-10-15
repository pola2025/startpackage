import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PrintOrderGuideBanner,
  PrintOrderGuideStrip,
} from "./print-order-guide-notice";

describe("PrintOrderGuideNotice", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens the print order tab of the guides page from the top strip", () => {
    render(<PrintOrderGuideStrip />);

    expect(
      screen.getByRole("link", { name: /인쇄물 발주 안내/ }),
    ).toHaveAttribute("href", "/dashboard/guides?tab=design");
  });

  it("opens the same tab from the sidebar banner and closes the drawer", () => {
    const onClick = vi.fn();
    render(<PrintOrderGuideBanner onClick={onClick} />);

    const link = screen.getByRole("link", { name: /인쇄물 발주 안내/ });
    expect(link).toHaveAttribute("href", "/dashboard/guides?tab=design");

    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
