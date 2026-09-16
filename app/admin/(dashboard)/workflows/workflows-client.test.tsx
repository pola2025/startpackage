import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import WorkflowsClient from "./workflows-client";

describe("WorkflowsClient cohort groups", () => {
  afterEach(cleanup);

  it("shows an active empty latest cohort before older workflow groups", () => {
    render(
      <WorkflowsClient
        workflowsByUser={{
          "user-26": {
            user: {
              id: "user-26",
              이름: "26기 사용자",
              cohortId: "cohort-26",
              cohort: {
                id: "cohort-26",
                name: "26기",
                교육시작일: new Date("2026-08-13T00:00:00.000Z"),
              },
            },
            workflows: [
              {
                id: "workflow-26",
                userId: "user-26",
                type: "로고",
                status: "대기",
                createdAt: new Date("2026-08-13T00:00:00.000Z"),
                수정횟수: 0,
              },
            ],
          },
        }}
        stats={{ 대기: 1, 시안중: 0, 발주대기: 0, 제작중: 0, 발송완료: 0 }}
        cohorts={[
          {
            id: "cohort-27",
            name: "27기",
            isActive: true,
            교육시작일: new Date("2026-09-16T00:00:00.000Z"),
          },
          {
            id: "cohort-26",
            name: "26기",
            isActive: true,
            교육시작일: new Date("2026-08-13T00:00:00.000Z"),
          },
        ]}
        workflowTypes={["로고"]}
      />,
    );

    const cohortButtons = screen.getAllByRole("button", {
      name: /기 \d+명 · \d+개/,
    });
    expect(cohortButtons[0]).toHaveAccessibleName("27기 0명 · 0개");
    expect(cohortButtons[1]).toHaveAccessibleName("26기 1명 · 1개");
  });
});
