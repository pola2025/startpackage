"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Globe,
  IdCard,
  Mail,
  Package,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectProgressSummary,
  type ProjectProgressTurn,
  type ProjectProgressWorkflow,
  type ProjectProgressView,
} from "@/lib/workflow/project-progress";

export type { ProjectProgressWorkflow };

type Filter = "all" | "customer" | "working" | "complete";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "customer", label: "내 확인" },
  { value: "working", label: "진행 중" },
  { value: "complete", label: "완료" },
];

const ITEM_ICONS: Record<string, typeof Package> = {
  명함: CreditCard,
  명찰: IdCard,
  대봉투: Mail,
  "자문계약서 표지": BookOpen,
  "자문계약서 내지": FileText,
  로고: Sparkles,
  홈페이지: Globe,
};

// 누구 차례에 따라 표지와 단계 인디케이터 색을 함께 바꾼다 (2026-10-17 와이어프레임 v3)
const TURN: Record<
  ProjectProgressTurn,
  { label: string; chip: string; color: string; dark: string }
> = {
  mine: {
    label: "내 차례",
    chip: "bg-gold-50 text-gold-700 ring-1 ring-gold-200",
    color: "#c9a84c",
    dark: "#9a7a22",
  },
  polarad: {
    label: "폴라애드",
    chip: "bg-gov-blue-50 text-gov-blue-600",
    color: "#1c5a96",
    dark: "#003876",
  },
  printer: {
    label: "인쇄소",
    chip: "bg-gov-blue-50 text-gov-blue-600",
    color: "#1c5a96",
    dark: "#003876",
  },
  waiting: {
    label: "대기",
    chip: "bg-slate-100 text-slate-500",
    color: "#cbd5e1",
    dark: "#94a3b8",
  },
  done: {
    label: "완료",
    chip: "bg-emerald-50 text-emerald-700",
    color: "#10b981",
    dark: "#059669",
  },
  unknown: {
    label: "확인 중",
    chip: "bg-slate-100 text-slate-600",
    color: "#94a3b8",
    dark: "#64748b",
  },
};

const SHORT_STAGE: Record<string, string> = {
  "시안 제작": "시안",
  "고객 검토": "검토",
  "발주 확인": "발주",
  "인쇄 제작": "인쇄",
  "디자인 확정": "확정",
  "자료 입력": "자료",
  "제작 진행": "제작",
  "제작 완료": "완료",
};

// 내 차례 → 진행 중 → 확인 중 → 대기 → 완료, 진행 중인 묶음 안에서는 앞 단계부터
const KIND_RANK: Record<ProjectProgressView["kind"], number> = {
  customer: 0,
  working: 1,
  unknown: 2,
  waiting: 3,
  complete: 4,
};

const doneCount = (view: ProjectProgressView) =>
  view.stages.filter((stage) => stage.state === "done").length;

function stageSummary(view: ProjectProgressView) {
  const total = view.stages.length;
  const done = doneCount(view);
  const currentIndex = view.stages.findIndex(
    (stage) => stage.state === "current",
  );
  if (view.kind === "complete")
    return {
      title: "마친 단계",
      label: view.stages[total - 1]?.label ?? view.workflow.status,
      count: `${total}/${total}`,
    };
  if (view.kind === "unknown")
    return {
      title: "지금 상태",
      label: view.workflow.status,
      count: `${done}/${total}`,
    };
  if (currentIndex >= 0)
    return {
      title: "지금 단계",
      label: view.stages[currentIndex].label,
      count: `${currentIndex + 1}/${total}`,
    };
  if (done === 0)
    return { title: "지금 단계", label: "시작 전", count: `0/${total}` };
  // 인쇄를 마치고 발송을 기다리는 경우처럼 진행 중인 단계가 없을 때
  return {
    title: "다음 단계",
    label: view.stages[done]?.label ?? view.workflow.status,
    count: `${done}/${total}`,
  };
}

function StageIndicator({
  view,
  compact,
}: {
  view: ProjectProgressView;
  /** 모바일 작은 카드에서 점과 선만 보여 준다 */
  compact: boolean;
}) {
  const tone = TURN[view.turn];
  const count = view.stages.length;
  const edge = 100 / (2 * count);
  const reached = view.stages.reduce(
    (last, stage, index) => (stage.state === "pending" ? last : index),
    -1,
  );
  const fill = reached <= 0 ? 0 : (reached / (count - 1)) * (100 - 2 * edge);
  const dotSize = compact
    ? "h-3.5 w-3.5 sm:h-[22px] sm:w-[22px]"
    : "h-[22px] w-[22px]";
  const lineTop = compact ? "top-[6px] sm:top-[10px]" : "top-[10px]";

  return (
    <div className="relative">
      <span
        className={cn("absolute h-[2px] rounded-full bg-slate-200", lineTop)}
        style={{ left: `${edge}%`, right: `${edge}%` }}
        aria-hidden="true"
      />
      <span
        className={cn("absolute h-[2px] rounded-full", lineTop)}
        style={{ left: `${edge}%`, width: `${fill}%`, background: tone.dark }}
        aria-hidden="true"
      />
      <ol
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        aria-label={`${view.workflow.type} 진행 단계`}
      >
        {view.stages.map((stage, index) => (
          <li
            key={stage.label}
            className="flex flex-col items-center"
            aria-current={stage.state === "current" ? "step" : undefined}
          >
            {stage.state === "done" ? (
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full text-white",
                  dotSize,
                )}
                style={{ background: tone.dark }}
              >
                <Check
                  className={cn("h-3 w-3", compact && "hidden sm:block")}
                  strokeWidth={3}
                  aria-hidden="true"
                />
              </span>
            ) : stage.state === "current" ? (
              <span
                className={cn(
                  "progress-halo relative flex items-center justify-center rounded-full bg-white",
                  dotSize,
                )}
                style={
                  {
                    "--tone": tone.color,
                    boxShadow: `0 0 0 2px ${tone.color}`,
                  } as React.CSSProperties
                }
              >
                <span
                  className="relative h-[42%] w-[42%] rounded-full"
                  style={{ background: tone.color }}
                />
              </span>
            ) : (
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-400",
                  dotSize,
                )}
                style={{ boxShadow: "inset 0 0 0 1.5px #e2e8f0" }}
              >
                <span className={cn(compact && "hidden sm:inline")}>
                  {index + 1}
                </span>
              </span>
            )}
            <span
              className={cn(
                "mt-1.5 text-[11px] leading-none",
                compact && "hidden sm:block",
                stage.state === "current"
                  ? "font-bold"
                  : stage.state === "done"
                    ? "font-medium text-slate-500"
                    : "text-slate-400",
              )}
              style={
                stage.state === "current" ? { color: tone.dark } : undefined
              }
            >
              {SHORT_STAGE[stage.label] ?? stage.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProgressCard({
  view,
  hiddenOnMobile,
}: {
  view: ProjectProgressView;
  hiddenOnMobile: boolean;
}) {
  const focus = view.kind === "customer";
  const tone = TURN[view.turn];
  const Icon = ITEM_ICONS[view.workflow.type] ?? Package;
  const summary = stageSummary(view);

  return (
    <Link
      href={view.href}
      className={cn(
        "progress-card group flex flex-col rounded-2xl bg-white p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-gold-500 sm:p-5",
        focus && "progress-card-focus col-span-2 p-4 sm:col-span-1",
        hiddenOnMobile && "hidden sm:flex",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl",
            focus
              ? "bg-white text-gold-700 ring-1 ring-gold-200"
              : "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80",
          )}
        >
          <Icon
            className="h-4 w-4 sm:h-[19px] sm:w-[19px]"
            aria-hidden="true"
          />
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11.5px]",
            tone.chip,
          )}
        >
          {tone.label}
        </span>
      </div>

      <h3
        className={cn(
          "mt-2.5 break-keep font-bold leading-tight tracking-[-0.03em] text-slate-950 sm:mt-4 sm:text-[21px]",
          focus ? "text-[19px]" : "text-base",
        )}
      >
        {view.workflow.type}
      </h3>
      <p
        className={cn(
          "mt-1 text-[13px] text-slate-500",
          !focus && "hidden sm:block",
        )}
      >
        {view.workflow.status}
      </p>

      <div
        className={cn(
          "mt-3 sm:mt-4 sm:rounded-xl sm:px-3 sm:pb-3 sm:pt-2.5",
          focus
            ? "rounded-xl bg-white/70 px-3 pb-3 pt-2.5 ring-1 ring-gold-100"
            : "sm:bg-slate-50/80",
        )}
      >
        <div
          className={cn(
            "items-baseline justify-between",
            focus ? "flex" : "hidden sm:flex",
          )}
        >
          <p className="text-[11px] font-medium text-slate-400">
            {summary.title}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">
            {summary.count}
          </p>
        </div>
        <p
          className={cn(
            "mt-0.5 text-base font-bold tracking-[-0.02em] text-slate-900",
            !focus && "hidden sm:block",
          )}
        >
          {summary.label}
        </p>
        <div className={cn(focus ? "mt-3" : "sm:mt-3")}>
          <StageIndicator view={view} compact={!focus} />
        </div>
        {!focus && (
          <p className="mt-2 flex items-baseline justify-between gap-1 text-[11.5px] sm:hidden">
            <span className="truncate font-semibold text-slate-700">
              {summary.label}
            </span>
            <span className="shrink-0 text-slate-400">{summary.count}</span>
          </p>
        )}
        <p
          className={cn(
            "mt-3 break-keep text-pretty text-xs leading-snug text-slate-500",
            !focus && "hidden sm:block",
          )}
        >
          {view.note}
        </p>
      </div>

      <div className="flex-1" />
      {focus ? (
        <span className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-navy-900 text-[13px] font-semibold text-white group-hover:bg-navy-800 sm:mt-5">
          {view.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : (
        <span className="mt-5 hidden items-center justify-between border-t border-slate-100 pt-3 text-[12.5px] font-medium text-slate-500 group-hover:text-slate-900 sm:flex">
          {view.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

export default function ProjectProgress({
  workflows,
}: {
  workflows: ProjectProgressWorkflow[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showDoneOnMobile, setShowDoneOnMobile] = useState(false);
  const summary = useMemo(
    () => getProjectProgressSummary(workflows),
    [workflows],
  );
  const views = useMemo(
    () =>
      summary.views
        .filter((view) => filter === "all" || view.kind === filter)
        .sort(
          (a, b) =>
            KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
            (a.kind === "complete" ? 0 : doneCount(a) - doneCount(b)),
        ),
    [filter, summary.views],
  );
  const doneViews = views.filter((view) => view.kind === "complete");
  // 모바일 전체 보기에서는 완료 품목을 한 줄로 접어 둔다
  const foldDone =
    filter === "all" && !showDoneOnMobile && doneViews.length > 0;

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

  const counts: Record<Filter, number> = {
    all: summary.total,
    customer: summary.customer,
    working: summary.working,
    complete: summary.complete,
  };

  return (
    <section className="space-y-4" aria-labelledby="project-progress-title">
      {/* 지금 단계 점: 은은하게 퍼지는 고리 */}
      <style>{`
        @keyframes progress-halo { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(2.1); opacity: 0; } }
        .progress-halo::before { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: var(--tone); animation: progress-halo 1.8s ease-out infinite; }
        .progress-card { box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 0 0 1px rgba(15,23,42,.07); transition: transform .18s ease, box-shadow .18s ease; }
        .progress-card:hover { transform: translateY(-2px); box-shadow: 0 14px 32px -16px rgba(15,23,42,.28), 0 0 0 1px rgba(15,23,42,.09); }
        .progress-card-focus { box-shadow: 0 0 0 1.5px #d4b86a, 0 16px 36px -18px rgba(184,148,47,.55); background: linear-gradient(180deg, #fdfaf1 0%, #ffffff 46%); }
        .progress-card-focus:hover { box-shadow: 0 0 0 1.5px #c9a84c, 0 18px 40px -18px rgba(184,148,47,.65); }
        @media (prefers-reduced-motion: reduce) {
          .progress-card, .progress-card:hover { transition: none; transform: none; }
          .progress-halo::before { animation: none; opacity: .18; transform: scale(1.6); }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="project-progress-title"
              className="text-[21px] font-extrabold tracking-[-0.03em] text-slate-950 sm:text-[26px]"
            >
              품목별 제작 현황
            </h2>
            <Link
              href="/dashboard/workflows"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 sm:hidden"
            >
              전체 진행 내역{" "}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {summary.customer > 0 ? (
              <>
                {summary.total}개 품목 중{" "}
                <b className="font-semibold text-gold-700">
                  {summary.customer}개
                </b>
                가 확인을 기다리고 있어요.
              </>
            ) : (
              `${summary.total}개 품목 중 지금 확인할 품목은 없어요.`
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="grid flex-1 grid-cols-4 rounded-xl bg-slate-200/60 p-1 text-[12.5px] font-medium sm:inline-flex sm:flex-none"
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
                  "whitespace-nowrap rounded-lg px-2 py-1.5 sm:px-3",
                  filter === option.value
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {option.label}{" "}
                <span
                  className={cn(
                    "ml-0.5",
                    option.value === "customer" && counts.customer > 0
                      ? "text-gold-600"
                      : "text-slate-400",
                  )}
                >
                  {counts[option.value]}
                </span>
              </button>
            ))}
          </div>
          <Link
            href="/dashboard/workflows"
            className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-900 sm:inline-flex"
          >
            전체 진행 내역{" "}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {views.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
          이 조건에 해당하는 제작 항목이 없습니다.
        </p>
      ) : (
        <div
          // 사이드바 유무와 관계없이 카드 폭이 260px 아래로 줄지 않게 열 수를 정한다
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-4"
          aria-live="polite"
        >
          {views.map((view) => (
            <ProgressCard
              key={view.workflow.id}
              view={view}
              hiddenOnMobile={foldDone && view.kind === "complete"}
            />
          ))}
          {foldDone && (
            <button
              type="button"
              onClick={() => setShowDoneOnMobile(true)}
              aria-label={`완료한 품목 ${doneViews.length}개 펼치기: ${doneViews
                .map((view) => view.workflow.type)
                .join(" · ")}`}
              className="progress-card col-span-2 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-left sm:hidden"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="shrink-0 text-sm font-bold text-slate-900">
                완료 {doneViews.length}
              </span>
              <span className="truncate text-xs text-slate-500">
                {doneViews.map((view) => view.workflow.type).join(" · ")}
              </span>
              <ChevronDown
                className="ml-auto h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
