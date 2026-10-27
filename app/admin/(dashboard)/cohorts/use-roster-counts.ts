"use client";

import { useEffect, useState } from "react";

export type RosterCounts = { roster: number; joined: number; complete: number };

/**
 * 기수 목록의 "대상자" 칸에 쓸 명단 요약을 한 번에 받는다.
 * ids(쉼표로 이은 기수 ID)나 version 이 바뀔 때만 다시 부른다.
 */
export function useRosterCounts(
  ids: string,
  version: number,
): Record<string, RosterCounts> {
  const [counts, setCounts] = useState<Record<string, RosterCounts>>({});

  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    fetch(`/api/admin/cohort-roster/summary?ids=${encodeURIComponent(ids)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.counts) setCounts(data.counts);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [ids, version]);

  return counts;
}
