import { describe, expect, it } from "vitest";
import {
  BAS_MARKETING_SUPPORT_WEEKS,
  calculateMarketingSupportEndDate,
  getMarketingSupportDurationLabel,
} from "../marketing-support";

describe("marketing support policy", () => {
  it("uses a single eight-week policy for every cohort", () => {
    expect(BAS_MARKETING_SUPPORT_WEEKS).toBe(8);
    expect(getMarketingSupportDurationLabel()).toBe("8주");
  });

  it.each([
    ["2026-04-01", "2026-05-27"],
    ["2026-05-01", "2026-06-26"],
    ["2026-09-08", "2026-11-03"],
    ["2026-12-31", "2027-02-25"],
    ["2028-02-01", "2028-03-28"],
  ])("adds 56 days from %s without changing the original date", (start, expected) => {
    const input = new Date(`${start}T00:00:00.000Z`);
    expect(calculateMarketingSupportEndDate(input).toISOString())
      .toBe(`${expected}T00:00:00.000Z`);
    expect(input.toISOString()).toBe(`${start}T00:00:00.000Z`);
  });
});
