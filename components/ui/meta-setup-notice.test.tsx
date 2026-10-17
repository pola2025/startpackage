import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MetaSetupBanner, MetaSetupStrip } from "./meta-setup-notice";

describe("MetaSetupNotice", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens the Meta setup page from the top strip with a required tag before the request", () => {
    render(<MetaSetupStrip stage="none" />);

    const link = screen.getByRole("link", { name: /Meta 설정요청/ });
    expect(link).toHaveAttribute("href", "/dashboard/meta-setup");
    expect(link).toHaveTextContent("필수");
  });

  it("opens the same page from the sidebar banner and closes the drawer", () => {
    const onClick = vi.fn();
    render(<MetaSetupBanner stage="none" onClick={onClick} />);

    const link = screen.getByRole("link", { name: /Meta 설정요청/ });
    expect(link).toHaveAttribute("href", "/dashboard/meta-setup");
    expect(link).toHaveTextContent("필수");

    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("drops the required tag after the request and shows completion when done", () => {
    render(<MetaSetupBanner stage="requested" />);
    expect(screen.getByRole("link")).not.toHaveTextContent("필수");
    expect(screen.getByRole("link")).toHaveTextContent("요청 완료");
    cleanup();

    render(<MetaSetupStrip stage="done" />);
    expect(
      screen.getByRole("link", { name: /Meta 설정 완료/ }),
    ).toHaveAttribute("href", "/dashboard/meta-setup");
  });

  it("stays visible without a tag while the stage is still loading", () => {
    render(<MetaSetupBanner stage={null} />);
    expect(
      screen.getByRole("link", { name: /Meta 설정요청/ }),
    ).not.toHaveTextContent("필수");
  });
});
