const dashboardDateFields = new Set([
  "createdAt",
  "updatedAt",
  "교육시작일",
  "자료제출마감일",
  "자료제출일",
  "발주요청일",
  "확정일시",
  "requestDate",
  "lastReplyAt",
  "sentAt",
  "readAt",
  "completedAt",
  "approvedAt",
  "reviewedAt",
  "deletedAt",
  "publishedAt",
  "expiresAt",
]);

function reviveDashboardDates(value: unknown, key?: string): unknown {
  if (value instanceof Date || value === null || value === undefined) return value;
  if (typeof value === "string" && key && dashboardDateFields.has(key)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date;
  }
  if (Array.isArray(value)) return value.map((item) => reviveDashboardDates(item));
  if (typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      reviveDashboardDates(entryValue, entryKey),
    ]),
  );
}

export function normalizeDashboardDates<T>(value: T): T {
  return reviveDashboardDates(value) as T;
}
