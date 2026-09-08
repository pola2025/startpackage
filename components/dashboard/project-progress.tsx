"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectProgressSummary,
  type ProjectProgressWorkflow,
  type ProjectProgressView,
} from "@/lib/workflow/project-progress";

export type { ProjectProgressWorkflow };

type Filter = "all" | "customer" | "working" | "complete";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "customer", label: "내 확인 필요" },
  { value: "working", label: "작업 중" },
  { value: "complete", label: "완료" },
];

function kindLabel(kind: ProjectProgressView["kind"]) {
  if (kind === "customer") return "내 확인 필요";
  if (kind === "complete") return "완료";
  if (kind === "unknown") return "상태 확인 필요";
  if (kind === "waiting") return "대기";
  return "진행 중";
}

function kindClass(kind: ProjectProgressView["kind"]) {
  if (kind === "customer") return "border-gold-200 bg-gold-50 text-gold-800";
  if (kind === "complete")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (kind === "unknown") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-navy-200 bg-navy-50 text-navy-800";
}

function Timeline({ view }: { view: ProjectProgressView }) {
  return (
    <ol
      className="flex min-w-0 items-start"
      aria-label={`${view.workflow.type} 진행 단계`}
    >
      {view.stages.map((stage, index) => (
        <li key={stage.label} className="flex min-w-0 flex-1 items-start">
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                stage.state === "done" &&
                  "border-navy-800 bg-navy-800 text-white",
                stage.state === "current" &&
                  "border-gold-500 bg-gold-50 text-gold-800 ring-4 ring-gold-100",
                stage.state === "pending" &&
                  "border-slate-200 bg-white text-slate-400",
              )}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              {stage.state === "done" ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "mt-2 text-xs leading-4",
                stage.state === "pending"
                  ? "text-slate-400"
                  : "font-medium text-slate-700",
              )}
            >
              {stage.label}
            </span>
          </div>
          {index < view.stages.length - 1 && (
            <span
              className={cn(
                "mt-4 h-px min-w-3 flex-1",
                stage.state === "done" ? "bg-navy-800" : "bg-slate-200",
              )}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function StatusIcon({ kind }: { kind: ProjectProgressView["kind"] }) {
  if (kind === "complete")
    return <Check className="h-4 w-4" aria-hidden="true" />;
  if (kind === "customer" || kind === "unknown")
    return <CircleAlert className="h-4 w-4" aria-hidden="true" />;
  return <Clock3 className="h-4 w-4" aria-hidden="true" />;
}

export default function ProjectProgress({
  workflows,
}: {
  workflows: ProjectProgressWorkflow[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const summary = useMemo(
    () => getProjectProgressSummary(workflows),
    [workflows],
  );
  const views = useMemo(
    () =>
      summary.views.filter((view) => filter === "all" || view.kind === filter),
    [filter, summary.views],
  );
  const selected =
    views.find((view) => view.workflow.id === selectedId) ??
    views.find((view) => view.kind === "customer") ??
    views[0] ??
    null;

  if (workflows.length === 0) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-labelledby="project-progress-title"
      >
        <h2
          id="project-progress-title"
          className="text-base font-semibold text-slate-950"
        >
          제작 진행 현황
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          아직 접수된 제작 항목이 없습니다. 제작 요청을 제출하면 이곳에서 실제
          상태를 확인할 수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6"
      aria-labelledby="project-progress-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            START PACKAGE
          </p>
          <h2
            id="project-progress-title"
            className="mt-1 text-xl font-bold text-slate-950"
          >
            품목별 제작 현황
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            품목별 진행 단계와 다음 확인 사항을 안내합니다.
          </p>
        </div>
        <Link
          href="/dashboard/workflows"
          className="inline-flex items-center gap-1 self-start text-sm font-semibold text-navy-800 hover:underline sm:self-auto"
        >
          전체 진행 내역 <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["내 확인 필요", summary.customer, "customer"],
          ["폴라애드 진행 중", summary.working, "working"],
          ["완료한 품목", summary.complete, "complete"],
        ].map(([label, count, kind]) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(kind as Filter)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-navy-300"
            aria-label={`${label} ${count}건 보기`}
          >
            <span className="block text-xs text-slate-500">{label}</span>
            <span className="mt-1 block text-xl font-bold text-slate-950">
              {count}
              <span className="ml-1 text-xs font-normal text-slate-500">
                건
              </span>
            </span>
          </button>
        ))}
      </div>

      {(summary.waiting > 0 || summary.unknown > 0) && (
        <p className="text-sm text-slate-600">
          전체 {summary.total}개 품목 중 진행 대기 {summary.waiting}건 · 상태
          확인 필요 {summary.unknown}건이 있습니다. 전체 목록에서 확인해주세요.
        </p>
      )}

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-950">
                  {selected.workflow.type}
                </h3>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-semibold",
                    kindClass(selected.kind),
                  )}
                >
                  {kindLabel(selected.kind)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                현재 상태:{" "}
                <span className="font-semibold text-slate-900">
                  {selected.workflow.status}
                </span>{" "}
                · 담당: {selected.owner}
              </p>
            </div>
            <Link
              href={selected.href}
              className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800 hover:underline"
            >
              {selected.actionLabel}{" "}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5">
            <Timeline view={selected} />
          </div>
        </div>
      )}

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="제작 항목 필터"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
              filter === option.value
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-navy-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-2" aria-live="polite">
        {views.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
            이 조건에 해당하는 제작 항목이 없습니다.
          </p>
        ) : (
          views.map((view) => (
            <button
              key={view.workflow.id}
              type="button"
              onClick={() => setSelectedId(view.workflow.id)}
              className={cn(
                "flex w-full min-w-0 items-start gap-3 rounded-xl border bg-white p-3 text-left hover:border-navy-300",
                selected?.workflow.id === view.workflow.id
                  ? "border-navy-700 ring-1 ring-navy-200"
                  : "border-slate-200",
              )}
              aria-pressed={selected?.workflow.id === view.workflow.id}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  view.kind === "complete"
                    ? "bg-emerald-100 text-emerald-800"
                    : view.kind === "customer"
                      ? "bg-gold-100 text-gold-800"
                      : "bg-navy-100 text-navy-800",
                )}
              >
                <StatusIcon kind={view.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold text-slate-950">
                  {view.workflow.type}
                </span>
                <span className="block break-words text-xs text-slate-500">
                  담당: {view.owner}
                </span>
              </span>
              <span
                className={cn(
                  "max-w-[45%] whitespace-normal break-words rounded-full border px-2 py-1 text-right text-xs font-semibold",
                  kindClass(view.kind),
                )}
                title={view.workflow.status}
              >
                {view.workflow.status}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
