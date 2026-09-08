export const BAS_MARKETING_SUPPORT_WEEKS = 8;

export function getMarketingSupportDurationLabel(): string {
  return `${BAS_MARKETING_SUPPORT_WEEKS}주`;
}

export function calculateMarketingSupportEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);

  endDate.setDate(endDate.getDate() + BAS_MARKETING_SUPPORT_WEEKS * 7);

  return endDate;
}
