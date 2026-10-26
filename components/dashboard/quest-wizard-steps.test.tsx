import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import QuestWizardDialog, {
  BASIC_INFO_STEPS,
  CONTRACT_STEPS,
  LOGO_INFO_STEPS,
} from "./quest-wizard-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockReset();
});

const ACCOUNT_FIELDS = ["은행명", "계좌번호", "계좌명의자명"];

describe("기본 정보 단계 구성", () => {
  it("이메일 뒤에 인쇄물 받을 곳과 자문계약서 계좌를 받는다", () => {
    expect(BASIC_INFO_STEPS.slice(-5).map((s) => s.field)).toEqual([
      "이메일",
      "인쇄물받을주소",
      ...ACCOUNT_FIELDS,
    ]);
  });

  it("배송지는 shipping step, 계좌는 정책 대상 기수 전용 단계다", () => {
    const shipping = BASIC_INFO_STEPS.find((s) => s.field === "인쇄물받을주소");
    expect(shipping?.type).toBe("shipping");
    const account = BASIC_INFO_STEPS.filter((s) =>
      ACCOUNT_FIELDS.includes(s.field),
    );
    expect(account.every((s) => s.policyOnly)).toBe(true);
  });

  it("자문계약서 카드는 지난 기수도 계좌를 낼 수 있게 정책 표시 없이 계좌를 유지한다", () => {
    expect(CONTRACT_STEPS.map((s) => s.field)).toEqual([
      "계약서시안",
      ...ACCOUNT_FIELDS,
    ]);
    expect(CONTRACT_STEPS.some((s) => s.policyOnly)).toBe(false);
  });
});

describe("배송지 단계 저장", () => {
  const shippingSteps = BASIC_INFO_STEPS.filter((s) => s.type === "shipping");

  function setup(initialValues: Record<string, string | null>) {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const onComplete = vi.fn();
    render(
      <QuestWizardDialog
        open
        onClose={vi.fn()}
        onComplete={onComplete}
        title="기본 정보 입력"
        steps={shippingSteps}
        initialValues={initialValues}
      />,
    );
    return { fetchMock, onComplete };
  }

  it("값이 그대로면 저장 요청을 보내지 않는다 (발주 뒤 잠긴 배송지의 409 방지)", async () => {
    const { fetchMock, onComplete } = setup({
      인쇄물받을주소: "서울특별시 강남구 테헤란로 1",
      받는분이름: "홍길동",
      수령연락처: "010-1234-5678",
      우편번호: null,
    });
    fireEvent.click(screen.getByRole("button", { name: /완료/ }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("값을 바꾸면 배송 필드를 한 번에 저장한다", async () => {
    const { fetchMock, onComplete } = setup({
      인쇄물받을주소: "서울특별시 강남구 테헤란로 1",
      받는분이름: "홍길동",
      수령연락처: "010-1234-5678",
    });
    fireEvent.change(screen.getByLabelText("받으실 주소"), {
      target: { value: "서울특별시 송파구 올림픽로 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /완료/ }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      인쇄물받을주소: "서울특별시 송파구 올림픽로 2",
      받는분이름: "홍길동",
      수령연락처: "010-1234-5678",
      우편번호: "",
    });
  });
});

describe("로고 설명 단계", () => {
  const descriptionSteps = LOGO_INFO_STEPS.filter(
    (s) => s.field === "로고제작요청사항",
  );

  function setup(description: string) {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <QuestWizardDialog
        open
        onClose={vi.fn()}
        title="로고 제작 정보"
        steps={descriptionSteps}
        initialValues={{ 로고제작요청사항: description }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /완료/ }));
    return fetchMock;
  }

  it.each([
    ["", 0],
    ["깔끔하게 해주세요", 9],
  ])(
    "설명이 비었거나 짧으면(%j) 제작 불가 안내를 띄우고 저장하지 않는다",
    async (description, length) => {
      const fetchMock = setup(description);
      expect(
        await screen.findByText(
          `⚠ 로고 설명 및 요청내용 없이는 제작이 불가능합니다. 20자 이상 적어 주세요. (지금 ${length}자)`,
        ),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
