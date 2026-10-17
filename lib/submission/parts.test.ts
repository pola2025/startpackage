import { describe, expect, it } from "vitest";
import {
  basicChecklist,
  isLogoConfirmed,
  isLogoInfoComplete,
  LOGO_DESCRIPTION_MIN_LENGTH,
  logoChecklist,
  logoStage,
  metaSetupStage,
  shippingChecklist,
  smsChecklist,
  smsUsage,
  toEpochMs,
} from "./parts";

const newLogo = (overrides: Record<string, unknown> = {}) => ({
  로고선호스타일: "미니멀",
  로고선호폰트: "고딕",
  로고선호색상: "파랑",
  로고제작요청사항: "가".repeat(LOGO_DESCRIPTION_MIN_LENGTH),
  로고예시디자인URL: "https://files.example.com/ref1.png",
  ...overrides,
});

describe("logoChecklist", () => {
  it("신규 제작은 5가지 항목을 요구한다", () => {
    const items = logoChecklist({});
    expect(items.map((entry) => entry.key)).toEqual([
      "로고선호스타일",
      "로고선호폰트",
      "로고선호색상",
      "로고제작요청사항",
      "로고예시디자인URL",
    ]);
    expect(items.every((entry) => !entry.done)).toBe(true);
  });

  it("기존 로고는 로고 파일 1개만 요구한다", () => {
    expect(logoChecklist({ 로고제작방식: "기존로고" })).toHaveLength(1);
    const done = logoChecklist({
      로고제작방식: "기존로고",
      로고URL: "https://files.example.com/logo.png",
    });
    expect(done).toEqual([
      expect.objectContaining({ key: "로고URL", done: true }),
    ]);
    expect(isLogoInfoComplete({ 로고제작방식: "기존로고" })).toBe(false);
    expect(
      isLogoInfoComplete({
        로고제작방식: "기존로고",
        로고URL: "https://x/logo.png",
      }),
    ).toBe(true);
  });

  it("설명 19자는 미완료, 20자는 완료", () => {
    expect(LOGO_DESCRIPTION_MIN_LENGTH).toBe(20);
    expect(
      isLogoInfoComplete(newLogo({ 로고제작요청사항: "가".repeat(19) })),
    ).toBe(false);
    expect(
      isLogoInfoComplete(newLogo({ 로고제작요청사항: "가".repeat(20) })),
    ).toBe(true);
  });

  it("설명 길이는 앞뒤 공백을 빼고 센다", () => {
    expect(
      isLogoInfoComplete(
        newLogo({ 로고제작요청사항: `  ${"가".repeat(19)}  ` }),
      ),
    ).toBe(false);
  });

  it("참고 로고는 2번째 칸만 있어도 완료", () => {
    const sub = newLogo({
      로고예시디자인URL: null,
      로고예시디자인2URL: "https://files.example.com/ref2.png",
    });
    expect(isLogoInfoComplete(sub)).toBe(true);
    expect(isLogoInfoComplete(newLogo({ 로고예시디자인URL: "" }))).toBe(false);
  });

  it("빈 문자열과 공백은 채워진 값으로 보지 않는다", () => {
    expect(isLogoInfoComplete(newLogo({ 로고선호스타일: "   " }))).toBe(false);
  });

  it("null·undefined 제출 정보도 처리한다", () => {
    expect(isLogoInfoComplete(null)).toBe(false);
    expect(isLogoInfoComplete(undefined)).toBe(false);
  });
});

describe("basicChecklist / shippingChecklist", () => {
  it("기본 정보는 7개, 배송 정보는 4개", () => {
    expect(basicChecklist({})).toHaveLength(7);
    expect(shippingChecklist({})).toHaveLength(4);
  });

  it("값이 있는 항목만 done", () => {
    const items = shippingChecklist({ 우편번호: "12345", 받는분이름: "" });
    expect(items.find((entry) => entry.key === "우편번호")?.done).toBe(true);
    expect(items.find((entry) => entry.key === "받는분이름")?.done).toBe(false);
  });
});

describe("smsUsage / smsChecklist", () => {
  it("사용 여부 값만 인정한다", () => {
    expect(smsUsage({ 문자발송사용여부: "사용" })).toBe("사용");
    expect(smsUsage({ 문자발송사용여부: "미사용" })).toBe("미사용");
    expect(smsUsage({ 문자발송사용여부: "기타" })).toBeNull();
    expect(smsUsage({})).toBeNull();
  });

  it("미선택이면 선택 항목 하나만 미완료로 남는다", () => {
    const items = smsChecklist({});
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: "문자발송사용여부", done: false });
  });

  it("미사용이면 서류 항목이 없어지고 선택 항목만 완료", () => {
    const items = smsChecklist({
      문자발송사용여부: "미사용",
      대표자신분증URL: "https://x/id.png",
    });
    expect(items).toHaveLength(1);
    expect(items[0].done).toBe(true);
  });

  it("사용이면 서류·계정 5개가 더 붙는다", () => {
    const items = smsChecklist({ 문자발송사용여부: "사용" });
    expect(items.map((entry) => entry.key)).toEqual([
      "문자발송사용여부",
      "대표자신분증URL",
      "통신서비스이용증명원URL",
      "신용카드앞면URL",
      "네이버클라우드ID",
      "네이버클라우드PW",
    ]);
    expect(items[0].done).toBe(true);
    expect(items.slice(1).every((entry) => !entry.done)).toBe(true);
  });
});

describe("logoStage", () => {
  it("최종확정·시안확정은 done", () => {
    expect(logoStage({}, "최종확정")).toBe("done");
    expect(logoStage({}, "시안확정")).toBe("done");
  });

  it("시안컨펌요청은 review", () => {
    expect(logoStage({}, "시안컨펌요청")).toBe("review");
  });

  it("시안제작중·시안중은 working", () => {
    expect(logoStage({}, "시안제작중")).toBe("working");
    expect(logoStage({}, "시안중")).toBe("working");
  });

  it("상태가 대기면 제출 정보로 판단한다", () => {
    expect(logoStage({}, "대기")).toBe("info");
    expect(logoStage({}, null)).toBe("info");
    expect(logoStage({}, undefined)).toBe("info");
    expect(logoStage({ 로고선호스타일: "미니멀" }, "대기")).toBe("partial");
    expect(logoStage({ 로고제작방식: "신규제작" }, null)).toBe("partial");
    expect(logoStage(newLogo(), "대기")).toBe("working");
  });

  it("작업 상태가 제출 정보보다 우선한다", () => {
    expect(logoStage(newLogo(), "최종확정")).toBe("done");
    expect(logoStage({}, "시안컨펌요청")).toBe("review");
  });
});

describe("isLogoConfirmed", () => {
  it("최종확정·시안확정만 true", () => {
    expect(isLogoConfirmed("최종확정")).toBe(true);
    expect(isLogoConfirmed("시안확정")).toBe(true);
    expect(isLogoConfirmed("시안컨펌요청")).toBe(false);
    expect(isLogoConfirmed("대기")).toBe(false);
    expect(isLogoConfirmed(null)).toBe(false);
    expect(isLogoConfirmed(undefined)).toBe(false);
  });
});

describe("metaSetupStage", () => {
  it("요청도 완료도 없으면 none", () => {
    expect(metaSetupStage({})).toBe("none");
    expect(metaSetupStage(null)).toBe("none");
    expect(
      metaSetupStage({ MetaSetupRequestedAt: null, MetaSetupDoneAt: null }),
    ).toBe("none");
  });

  it("요청만 있으면 requested", () => {
    expect(metaSetupStage({ MetaSetupRequestedAt: 1760000000000 })).toBe(
      "requested",
    );
    expect(
      metaSetupStage({ MetaSetupRequestedAt: "2026-10-17T05:20:00.000Z" }),
    ).toBe("requested");
  });

  it("완료 시각이 있으면 done (요청보다 우선)", () => {
    expect(
      metaSetupStage({ MetaSetupRequestedAt: 1, MetaSetupDoneAt: 2 }),
    ).toBe("done");
  });
});

describe("toEpochMs", () => {
  const iso = "2026-10-17T05:20:00.000Z";
  const ms = Date.parse(iso);

  it("Date를 밀리초로 바꾼다", () => {
    expect(toEpochMs(new Date(iso))).toBe(ms);
  });

  it("유효하지 않은 Date는 null", () => {
    expect(toEpochMs(new Date("nope"))).toBeNull();
  });

  it("숫자는 그대로, 유한하지 않은 숫자는 null", () => {
    expect(toEpochMs(ms)).toBe(ms);
    expect(toEpochMs(0)).toBe(0);
    expect(toEpochMs(Number.NaN)).toBeNull();
    expect(toEpochMs(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("숫자 문자열은 숫자로 바꾼다", () => {
    expect(toEpochMs(String(ms))).toBe(ms);
  });

  it("ISO 문자열은 파싱한다", () => {
    expect(toEpochMs(iso)).toBe(ms);
  });

  it("빈 값은 null", () => {
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs(undefined)).toBeNull();
    expect(toEpochMs("")).toBeNull();
  });

  it("잘못된 문자열과 다른 타입은 null", () => {
    expect(toEpochMs("not-a-date")).toBeNull();
    expect(toEpochMs({})).toBeNull();
    expect(toEpochMs(true)).toBeNull();
  });
});
