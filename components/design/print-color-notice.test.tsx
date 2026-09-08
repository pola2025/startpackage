import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PrintColorNotice } from "./print-color-notice";
import DesignConfirmDialog from "./design-confirm-dialog";
import {
  CONFIRM_AGREEMENTS,
  PRINT_COLOR_AGREEMENT,
  SHIPPING_REQUIRED_TYPES,
  getConfirmAgreements,
  validateConfirmPayload,
} from "@/lib/design-confirm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("print color confirmation", () => {
  it.each(SHIPPING_REQUIRED_TYPES)("shows notice and requires consent for %s", (workflowType) => {
    vi.stubGlobal("React", React);
    render(<PrintColorNotice workflowType={workflowType} />);
    expect(screen.getByText("인쇄 색상 안내")).toBeInTheDocument();
    expect(screen.getByText(/별도 인쇄 교정 서비스가 포함되어 있지 않습니다/)).toBeInTheDocument();
    expect(validateConfirmPayload({ workflowType, shipping: null, shippingRequired: false,
      agreements: CONFIRM_AGREEMENTS.map((a) => a.id) })).not.toBeNull();
    expect(validateConfirmPayload({ workflowType, shipping: null, shippingRequired: false,
      agreements: getConfirmAgreements(workflowType).map((a) => a.id) })).toBeNull();
  });

  it.each(["로고", "홈페이지"])("does not add print notice or consent to %s", (workflowType) => {
    vi.stubGlobal("React", React);
    const { container } = render(<PrintColorNotice workflowType={workflowType} />);
    expect(container).toBeEmptyDOMElement();
    expect(getConfirmAgreements(workflowType)).toEqual(CONFIRM_AGREEMENTS);
  });

  it("blocks final confirmation until color consent is checked and passes its ID", async () => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ _배송지필수: false }) }));
    const onConfirm = vi.fn();
    render(<DesignConfirmDialog open onOpenChange={() => {}} workflowType="명함" onConfirm={onConfirm} />);
    const next = screen.getByRole("button", { name: "다음 단계" });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);
    for (const item of CONFIRM_AGREEMENTS) {
      fireEvent.click(screen.getByText(item.label));
    }
    const confirm = screen.getByRole("button", { name: "이 시안으로 확정" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByText(PRINT_COLOR_AGREEMENT.label));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ shipping: null, agreements: getConfirmAgreements("명함").map((a) => a.id) });
  });
});
