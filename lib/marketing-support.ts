const EIGHT_WEEK_POLICY_YEAR = 26;
const EIGHT_WEEK_POLICY_SEQUENCE = 5;

export const LEGACY_MARKETING_SUPPORT_MONTHS = 3;
export const BAS_MARKETING_SUPPORT_WEEKS = 8;

function getCohortNumbers(cohortName?: string | null): number[] {
  return (cohortName?.match(/\d+/g) ?? []).map(Number);
}

export function usesEightWeekMarketingSupport(
  cohortName?: string | null,
): boolean {
  const [rawYear, sequence] = getCohortNumbers(cohortName);

  if (rawYear === undefined) {
    return false;
  }

  const year = rawYear >= 2000 ? rawYear % 100 : rawYear;

  if (year > EIGHT_WEEK_POLICY_YEAR) {
    return true;
  }

  if (year < EIGHT_WEEK_POLICY_YEAR) {
    return false;
  }

  return sequence !== undefined && sequence >= EIGHT_WEEK_POLICY_SEQUENCE;
}

export function getMarketingSupportDurationLabel(
  cohortName?: string | null,
): string {
  return usesEightWeekMarketingSupport(cohortName)
    ? `${BAS_MARKETING_SUPPORT_WEEKS}주`
    : `${LEGACY_MARKETING_SUPPORT_MONTHS}개월`;
}

export function calculateMarketingSupportEndDate(
  startDate: Date,
  cohortName?: string | null,
): Date {
  const endDate = new Date(startDate);

  if (usesEightWeekMarketingSupport(cohortName)) {
    endDate.setDate(endDate.getDate() + BAS_MARKETING_SUPPORT_WEEKS * 7);
  } else {
    endDate.setMonth(endDate.getMonth() + LEGACY_MARKETING_SUPPORT_MONTHS);
  }

  return endDate;
}
