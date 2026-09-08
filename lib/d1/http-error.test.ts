import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DataServiceRequestError } from "./service-client";
import { getDataServiceErrorResponse } from "./http-error";

describe("getDataServiceErrorResponse", () => {
  it("preserves actionable service 4xx status with a safe Korean message", () => {
    const response = getDataServiceErrorResponse(
      new DataServiceRequestError(409, "SQLITE constraint failed: secret=do-not-leak"),
    );

    expect(response).toEqual({
      status: 409,
      body: { error: "다른 변경사항이 저장되었습니다. 새로고침 후 다시 시도해주세요." },
    });
    expect(JSON.stringify(response)).not.toContain("secret");
  });

  it("redacts upstream diagnostics for 5xx errors", () => {
    const response = getDataServiceErrorResponse(
      new DataServiceRequestError(500, "D1 SQL failed: token=super-secret"),
    );

    expect(response).toEqual({
      status: 500,
      body: { error: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
    });
    expect(JSON.stringify(response)).not.toContain("super-secret");
  });

  it("does not convert unrelated errors into service responses", () => {
    expect(getDataServiceErrorResponse(new Error("internal"))).toBeNull();
  });

  it("clamps invalid statuses without exposing the invalid value", () => {
    const response = getDataServiceErrorResponse(new DataServiceRequestError(700, "bad status"));

    expect(response).toEqual({
      status: 502,
      body: { error: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
    });
  });

  it.each([
    [400, "요청 내용을 확인해주세요."],
    [403, "권한이 없습니다."],
    [404, "요청한 항목을 찾을 수 없습니다."],
  ])("keeps route-actionable status %s", (status, error) => {
    expect(getDataServiceErrorResponse(new DataServiceRequestError(status, "internal detail"))).toEqual({
      status,
      body: { error },
    });
  });
});
