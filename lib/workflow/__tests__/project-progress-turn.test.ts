import { describe, expect, it } from "vitest";

import { getProjectProgressView } from "../project-progress";

const view = (type: string, status: string) =>
  getProjectProgressView({ id: `${type}-${status}`, type, status });

describe("project progress turn and note", () => {
  it("splits the old owner wording into whose turn it is", () => {
    expect(view("명찰", "발주대기").turn).toBe("mine");
    expect(view("자문계약서 내지", "발주요청").turn).toBe("polarad");
    expect(view("명함", "발주완료").turn).toBe("printer");
    expect(view("자문계약서 표지", "대기").turn).toBe("waiting");
    expect(view("로고", "최종확정").turn).toBe("done");
    expect(view("명함", "알 수 없는 상태").turn).toBe("unknown");
  });

  it("explains the next action for the customer and the current work otherwise", () => {
    expect(view("명찰", "발주대기").note).toBe(
      "시안을 보고 발주 전 내용을 확인해 주세요.",
    );
    expect(view("명함", "발주완료").note).toBe("인쇄소에서 제작하고 있어요.");
    expect(view("홈페이지", "대기").note).toBe(
      "제작 자료를 입력하면 제작을 시작해요.",
    );
    expect(view("명함", "알 수 없는 상태").note).toBe(
      "현재 상태: 알 수 없는 상태",
    );
  });
});
