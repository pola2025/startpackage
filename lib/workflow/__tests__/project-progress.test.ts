import { describe, expect, it } from "vitest";
import {
  getProjectProgressSummary,
  getProjectProgressView,
} from "../project-progress";

const workflow = (
  overrides: Partial<Parameters<typeof getProjectProgressView>[0]> = {},
) => ({
  id: "wf-1",
  type: "명함",
  status: "시안중",
  ...overrides,
});

describe("project progress status boundaries", () => {
  it("treats print 발주대기 as customer proof and order review", () => {
    const view = getProjectProgressView(workflow({ status: "발주대기" }));
    expect(view.kind).toBe("customer");
    expect(view.owner).toBe("고객 확인 필요");
    expect(view.actionLabel).toBe("시안·발주 확인");
  });

  it("keeps logo confirmation request distinct from final confirmation", () => {
    const review = getProjectProgressView(
      workflow({ type: "로고", status: "시안컨펌요청" }),
    );
    expect(review.kind).toBe("customer");
    expect(review.stages.map((stage) => stage.label)).toEqual([
      "접수",
      "시안 제작",
      "고객 검토",
      "디자인 확정",
    ]);
    expect(review.stages[2].state).toBe("current");
    expect(
      getProjectProgressView(workflow({ type: "로고", status: "최종확정" }))
        .kind,
    ).toBe("complete");
  });

  it("does not mark print fabrication as dispatched", () => {
    const view = getProjectProgressView(workflow({ status: "제작완료" }));
    expect(view.kind).toBe("working");
    expect(view.stages.at(-1)?.state).toBe("pending");
    expect(view.owner).toBe("발송 준비");
  });

  it("keeps print final design confirmation in progress until fabrication", () => {
    const view = getProjectProgressView(workflow({ status: "최종확정" }));
    expect(view.kind).toBe("working");
    expect(view.owner).toBe("폴라애드 발주 준비");
  });

  it("keeps print proof review and order availability customer-facing", () => {
    expect(
      getProjectProgressView(workflow({ status: "시안컨펌요청" })).kind,
    ).toBe("customer");
    expect(
      getProjectProgressView(workflow({ status: "시안확정" })).actionLabel,
    ).toBe("발주 가능 여부 확인");
    expect(
      getProjectProgressView(workflow({ status: "시안확정" })).stages.find(
        (stage) => stage.state === "current",
      )?.label,
    ).toBe("발주 확인");
    expect(getProjectProgressView(workflow({ status: "발주요청" })).owner).toBe(
      "폴라애드 발주 확인",
    );
    expect(getProjectProgressView(workflow({ status: "발송완료" })).owner).toBe(
      "발송 완료",
    );
  });

  it("keeps unknown statuses visible without fabricating progress", () => {
    const view = getProjectProgressView(workflow({ status: "보류" }));
    expect(view.kind).toBe("unknown");
    expect(view.stages.every((stage) => stage.state === "pending")).toBe(true);
    expect(view.currentLabel).toContain("보류");
  });

  it("keeps completed digital work distinct from dispatch", () => {
    expect(
      getProjectProgressView(workflow({ type: "로고", status: "시안확정" }))
        .owner,
    ).toBe("디자인 확정 완료");
    expect(
      getProjectProgressView(
        workflow({ type: "홈페이지", status: "제작 완료" }),
      ).owner,
    ).toBe("홈페이지 제작 완료");
  });

  it("does not count queued work as active production or infer stages for an unknown homepage state", () => {
    const summary = getProjectProgressSummary([workflow({ status: "대기" })]);
    expect(summary.working).toBe(0);
    expect(summary.waiting).toBe(1);
    expect(
      getProjectProgressView(
        workflow({ type: "홈페이지", status: "보류" }),
      ).stages.every((stage) => stage.state === "pending"),
    ).toBe(true);
  });

  it("shows an available proof at customer review and distinguishes order approval", () => {
    const review = getProjectProgressView(
      workflow({ status: "시안중", 시안URL: "proof.png" }),
    );
    expect(
      review.stages.find((stage) => stage.state === "current")?.label,
    ).toBe("고객 검토");
    const order = getProjectProgressView(workflow({ status: "발주요청" }));
    expect(order.stages.find((stage) => stage.state === "current")?.label).toBe(
      "발주 확인",
    );
  });

  it("counts customer, active, and completed work separately", () => {
    const summary = getProjectProgressSummary([
      workflow({ id: "a", status: "발주대기" }),
      workflow({ id: "b", status: "시안중" }),
      workflow({ id: "c", status: "발송완료" }),
    ]);
    expect(summary.customer).toBe(1);
    expect(summary.working).toBe(1);
    expect(summary.complete).toBe(1);
  });
});
