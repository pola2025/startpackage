import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import DashboardAlertsClient, {
  type AlertNotification,
} from "./dashboard-alerts-client";

vi.mock("@/components/dashboard/quest-wizard-dialog", () => ({
  default: ({ title, steps }: { title: string; steps: { type: string }[] }) => (
    <div role="dialog" aria-label={title}>
      {steps.some((step) => step.type === "shipping")
        ? "배송지 입력 유지"
        : "배송지 정책 미적용"}
    </div>
  ),
  BASIC_INFO_STEPS: [{ type: "text" }, { type: "shipping" }],
  LOGO_INFO_STEPS: [],
  MARKETING_INFO_STEPS: [],
  NAMECARD_ENVELOPE_STEPS: [],
  CONTRACT_STEPS: [],
}));

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const notifications: AlertNotification[] = [
  {
    id: "basic-info",
    priority: 1,
    type: "urgent",
    message: "기본 정보를 입력해주세요",
    link: "/dashboard/submission#basic",
    badge: "필수",
  },
  {
    id: "design-confirm-card",
    priority: 1,
    type: "urgent",
    message: "명함 시안을 확인해주세요!",
    link: "/dashboard/workflows",
    badge: "시안확인",
  },
  {
    id: "website-info",
    priority: 3,
    type: "info",
    message: "홈페이지 제작정보 선택이 필요합니다",
    link: "/dashboard/submission#website",
    badge: "자료입력",
  },
  {
    id: "shipping-card",
    priority: 3,
    type: "info",
    message: "명함 배송 정보를 확인해주세요",
    link: "/dashboard/workflows",
    badge: "배송확인",
  },
  {
    id: "marketing-extension",
    priority: 3,
    type: "warning",
    message: "마케팅 지원 연장 신청이 가능합니다",
    link: "/dashboard#marketing-extension",
    badge: "연장신청",
  },
];

function setup(shippingRequired = true, rows = notifications) {
  render(
    <DashboardAlertsClient
      notifications={rows}
      todoCounts={{ urgent: 2, confirm: 1, waiting: 2, completed: 0 }}
      submission={null}
      shippingRequired={shippingRequired}
    />,
  );
}

describe("dashboard action preservation", () => {
  it("retains every notification and existing confirmation, shipping, extension destinations", () => {
    setup();
    for (const item of notifications)
      expect(screen.getAllByText(item.message).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /명함 시안을/ })).toHaveAttribute(
      "href",
      "/dashboard/workflows",
    );
    expect(screen.getByRole("link", { name: /명함 배송/ })).toHaveAttribute(
      "href",
      "/dashboard/workflows",
    );
    expect(
      screen.getByRole("link", { name: /지원 연장 신청/ }),
    ).toHaveAttribute("href", "/dashboard#marketing-extension");
    expect(
      screen.getByRole("link", { name: /홈페이지 제작정보/ }),
    ).toHaveAttribute("href", "/dashboard/homepage");
  });

  it.each([true, false])(
    "the highlighted action retains the existing shipping-policy wizard boundary: %s",
    (required) => {
      setup(required);
      fireEvent.click(screen.getByRole("button", { name: "필요 정보 입력" }));
      expect(
        within(
          screen.getByRole("dialog", { name: "기본 정보 입력" }),
        ).getByText(required ? "배송지 입력 유지" : "배송지 정책 미적용"),
      ).toBeInTheDocument();
    },
  );

  it("routes the highlighted confirmation to the full existing workflow, without a replacement confirmation modal", () => {
    setup(true, [notifications[1]]);
    expect(
      screen.getByRole("link", { name: "시안확인 바로가기" }),
    ).toHaveAttribute("href", "/dashboard/workflows");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
