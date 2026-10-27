"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  formatRosterPhone,
  parseRosterText,
  type RosterMemberStatus,
  type RosterView,
} from "@/lib/cohort-roster";

type Detail = RosterView & {
  cohort: {
    id: string;
    name: string;
    startAt: number;
    deadlineAt: number;
    week2ReminderAt: number;
  };
};

interface CohortRosterDialogProps {
  cohort: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  /** 명단이 바뀌면 목록의 "대상자" 요약을 다시 부른다 */
  onChanged: () => void;
}

const SEND_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const STATUS_STYLE: Record<RosterMemberStatus, string> = {
  미가입: "bg-gray-100 text-gray-700 border-gray-200",
  "자료 미제출": "bg-orange-100 text-orange-700 border-orange-200",
  "자료 제출 완료": "bg-green-100 text-green-700 border-green-200",
};

function kst(ms: number, withTime = false): string {
  return new Date(ms).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export default function CohortRosterDialog({
  cohort,
  onOpenChange,
  onChanged,
}: CohortRosterDialogProps) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const parsed = parseRosterText(text);
  const cohortId = cohort?.id ?? null;

  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/cohort-roster?cohortId=${encodeURIComponent(id)}`,
        { cache: "no-store", signal },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "명단을 불러오지 못했습니다.");
      setDetail(data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "명단을 불러오지 못했습니다.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setText("");
    setNotice("");
    setPendingDelete(null);
    if (!cohortId) return;
    const controller = new AbortController();
    load(cohortId, controller.signal);
    return () => controller.abort();
  }, [cohortId, load]);

  const add = async (value: string) => {
    if (!cohortId || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/cohort-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId, text: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "명단을 저장하지 못했습니다.");
      setNotice(
        `${data.added}명을 추가했습니다.${data.duplicates ? ` 이미 있는 연락처 ${data.duplicates}명은 건너뛰었습니다.` : ""}`,
      );
      setText("");
      await load(cohortId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "명단을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!cohortId || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/cohort-roster/${encodeURIComponent(id)}?cohortId=${encodeURIComponent(cohortId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "명단에서 빼지 못했습니다.");
      setPendingDelete(null);
      await load(cohortId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "명단에서 빼지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const now = Date.now();
  const week2At = detail?.cohort.week2ReminderAt ?? 0;
  const week2Label = !detail
    ? ""
    : now < week2At
      ? `${kst(week2At)} 오전 10시 자동 발송 예정`
      : now < week2At + SEND_WINDOW_MS
        ? "발송 기간입니다 (매일 오전 10시)"
        : `발송 기간이 지났습니다 (${kst(week2At)})`;

  const reminderLabel = (member: Detail["members"][number]) => {
    if (member.reminder) {
      const via =
        member.reminder.channel === "알림톡"
          ? "알림톡"
          : member.reminder.channel
            ? `문자(${member.reminder.channel})`
            : "";
      return `${kst(member.reminder.createdAt, true)} ${via} ${member.reminder.status}`.trim();
    }
    if (member.status === "자료 제출 완료") return "대상 아님";
    if (now < week2At) return "발송 예정";
    if (now < week2At + SEND_WINDOW_MS) return "다음 10시 발송";
    return "-";
  };

  return (
    <Dialog open={Boolean(cohort)} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-2 border-gray-200 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {cohort?.name} 대상자 명단
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            {detail
              ? `교육 시작 ${kst(detail.cohort.startAt)} · 자료 마감 ${kst(detail.cohort.deadlineAt)}`
              : "명단에 있는 연락처로만 가입할 수 있습니다."}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
            <b className="text-blue-900">2주차 알림톡</b>{" "}
            <span className="text-blue-800">{week2Label}</span>
          </div>
        )}

        {detail && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["명단", detail.counts.roster],
              ["가입", detail.counts.joined],
              ["자료 제출 완료", detail.counts.complete],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3">
                <div className="text-2xl font-black text-gray-900">{value}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border p-3 space-y-2">
          <span className="text-sm font-medium text-gray-900">대상자 추가</span>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"한 줄에 한 명씩: 이름 연락처\n예) 홍길동 010-1234-5678"}
            rows={3}
            className="bg-white border-2 border-gray-300 focus:border-gold-500 text-gray-900 font-mono text-sm"
          />
          {parsed.errors.map((item) => (
            <p
              key={`${item.line}-${item.text}`}
              className="text-xs font-semibold text-red-600"
            >
              {item.line > 0 ? `${item.line}번째 줄: ` : ""}
              {item.message}
            </p>
          ))}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">
              {parsed.entries.length > 0
                ? `${parsed.entries.length}명 인식됨`
                : "쉼표·탭·공백 모두 구분자로 받습니다."}
            </span>
            <Button
              type="button"
              onClick={() => add(text)}
              disabled={
                saving || parsed.entries.length === 0 || parsed.errors.length > 0
              }
              className="bg-navy-900 text-white hover:bg-navy-800"
            >
              {saving ? "저장 중..." : "명단에 추가"}
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
            {notice}
          </p>
        )}

        {loading && !detail ? (
          <p className="py-8 text-center text-gray-500">불러오는 중...</p>
        ) : detail && detail.members.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            등록된 대상자가 없습니다. 명단이 없는 기수는 누구나 가입할 수
            있습니다.
          </p>
        ) : (
          detail && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2">이름</th>
                    <th>연락처</th>
                    <th>상태</th>
                    <th>2주차 알림</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {detail.members.map((member) => (
                    <tr key={member.id} className="border-b align-top">
                      <td className="py-3 font-semibold text-gray-900">
                        {member.name}
                        {member.userName && member.userName !== member.name && (
                          <div className="text-xs font-normal text-gray-500">
                            가입 이름: {member.userName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {formatRosterPhone(member.phone)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold ${STATUS_STYLE[member.status]}`}
                        >
                          {member.status === "자료 미제출"
                            ? "가입 · 자료 미제출"
                            : member.status}
                        </Badge>
                        {member.missing.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            빠진 항목: {member.missing.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">
                        {reminderLabel(member)}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {pendingDelete === member.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => remove(member.id)}
                              disabled={saving}
                              className="text-xs font-bold text-red-600"
                            >
                              빼기 확인
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(null)}
                              className="ml-2 text-xs font-bold text-gray-500"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(member.id)}
                            className="text-xs font-bold text-red-600"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {detail && detail.outsiders.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm space-y-2">
            <b className="text-red-800">
              명단에 없는 가입자 {detail.outsiders.length}명
            </b>
            {detail.outsiders.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-gray-800">
                  {user.name} · {formatRosterPhone(user.phone)} ·{" "}
                  {kst(user.createdAt)} 가입
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => add(`${user.name} ${user.phone}`)}
                  className="h-7 bg-white text-xs font-bold"
                >
                  명단에 추가
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500">
          자료 제출 완료는 수강생 대시보드와 같은 기준입니다. 기본 정보
          7항목과 로고 정보가 모두 채워져야 완료로 표시합니다.
        </p>
      </DialogContent>
    </Dialog>
  );
}
