import { describe, expect, it } from "vitest";
import { normalizeDashboardDates } from "../dashboard/serialization";

describe("dashboard D1 serialization", () => {
  it("revives dates after an HTTP JSON roundtrip at every dashboard level", () => {
    const d1Payload = {
      cohort: { 교육시작일: "2026-09-01T00:00:00.000Z", 자료제출마감일: "2026-09-29T00:00:00.000Z" },
      submission: { 자료제출일: "2026-09-02T00:00:00.000Z" },
      workflows: [{ createdAt: "2026-09-03T00:00:00.000Z", updatedAt: "2026-09-04T00:00:00.000Z", 확정일시: "2026-09-05T00:00:00.000Z", 발주요청일: null }],
      marketingExtensionRequests: [{ requestDate: "2026-09-06T00:00:00.000Z" }],
      communicationThreads: [{ lastReplyAt: "2026-09-07T00:00:00.000Z", messages: [{ createdAt: "2026-09-08T00:00:00.000Z" }] }],
    };
    const payloadAfterHttp = JSON.parse(JSON.stringify(d1Payload));
    const normalized = normalizeDashboardDates(payloadAfterHttp);

    expect(normalized.cohort.교육시작일).toBeInstanceOf(Date);
    expect(normalized.submission.자료제출일).toBeInstanceOf(Date);
    expect(normalized.workflows[0].updatedAt).toBeInstanceOf(Date);
    expect(normalized.workflows[0].확정일시).toBeInstanceOf(Date);
    expect(normalized.marketingExtensionRequests[0].requestDate).toBeInstanceOf(Date);
    expect(normalized.communicationThreads[0].messages[0].createdAt).toBeInstanceOf(Date);
  });
});
