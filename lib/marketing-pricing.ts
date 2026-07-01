export const ONLINE_MARKETING_BILLING_MONTHS = 3;
export const ONLINE_MARKETING_MONTHLY_PRICE = 330000;
export const ONLINE_MARKETING_TOTAL_PRICE =
  ONLINE_MARKETING_MONTHLY_PRICE * ONLINE_MARKETING_BILLING_MONTHS;
export const CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE = 220000;

export function formatWon(amount: number) {
  return amount.toLocaleString("ko-KR");
}

export function formatManwon(amount: number) {
  return `${Math.round(amount / 10000)}만원`;
}
