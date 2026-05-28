import { describe, expect, it } from "vitest";
import {
  calculateMarketingSupportEndDate,
  getMarketingSupportDurationLabel,
  usesEightWeekMarketingSupport,
} from "../marketing-support";

describe("marketing support policy", () => {
  it("keeps older cohorts on the legacy 3 month policy", () => {
    expect(usesEightWeekMarketingSupport("26-4기")).toBe(false);
    expect(getMarketingSupportDurationLabel("26기 4기")).toBe("3개월");

    const endDate = calculateMarketingSupportEndDate(
      new Date("2026-04-01T00:00:00.000Z"),
      "26-4기",
    );

    expect(endDate.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("uses 8 weeks from 26-5 onward", () => {
    expect(usesEightWeekMarketingSupport("26-5기")).toBe(true);
    expect(usesEightWeekMarketingSupport("26기 5기")).toBe(true);
    expect(getMarketingSupportDurationLabel("26-5기")).toBe("8주");

    const endDate = calculateMarketingSupportEndDate(
      new Date("2026-05-01T00:00:00.000Z"),
      "26-5기",
    );

    expect(endDate.toISOString().slice(0, 10)).toBe("2026-06-26");
  });

  it("treats later year-style cohorts as 8 week cohorts", () => {
    expect(usesEightWeekMarketingSupport("27-1기")).toBe(true);
    expect(usesEightWeekMarketingSupport("2027-1기")).toBe(true);
  });
});
