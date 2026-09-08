export const ONLINE_MARKETING_BILLING_WEEKS = 8;
export const ONLINE_MARKETING_BILLING_DAYS = ONLINE_MARKETING_BILLING_WEEKS * 7;
export const ONLINE_MARKETING_TOTAL_PRICE = 990000;
export const CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE = 220000;

export function formatWon(amount: number) {
  return amount.toLocaleString("ko-KR");
}

export function formatManwon(amount: number) {
  return `${Math.round(amount / 10000)}만원`;
}
