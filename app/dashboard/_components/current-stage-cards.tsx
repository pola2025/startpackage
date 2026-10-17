"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import QuestWizardDialog, {
  LOGO_COMPLETION,
  LOGO_INFO_STEPS,
} from "@/components/dashboard/quest-wizard-dialog";
import type {
  LogoStage,
  MetaSetupStage,
  PartItem,
} from "@/lib/submission/parts";

export interface LogoStageProps {
  stage: LogoStage;
  existing: boolean;
  items: PartItem[];
}

export interface MetaStageProps {
  stage: MetaSetupStage;
  requestedAt: number | null;
  type: "instagram" | "google" | null;
}

interface Props {
  logo: LogoStageProps | null;
  meta: MetaStageProps | null;
  submission: Record<string, unknown> | null;
  representativeName?: string;
  accountEmail?: string;
}

const formatDate = (ms: number | null) => {
  if (!ms) return "";
  const date = new Date(ms);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const STEPS = ["접수", "시안 제작", "고객 검토", "확정"];
const STEP_INDEX: Record<LogoStage, number> = {
  info: -1,
  partial: -1,
  working: 1,
  review: 2,
  done: 4,
};

function Stepper({ stage }: { stage: LogoStage }) {
  const current = STEP_INDEX[stage];
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1 text-[11px] font-bold">
      {STEPS.map((label, index) => {
        const done = index < current || (stage === "done" && index <= 3);
        const active = index === current && stage !== "done";
        return (
          <li
            key={label}
            className={
              done
                ? "rounded bg-emerald-50 py-1 text-center text-emerald-700"
                : active
                  ? stage === "review"
                    ? "rounded bg-amber-500 py-1 text-center text-white"
                    : "rounded bg-gov-blue py-1 text-center text-white"
                  : "rounded bg-slate-100 py-1 text-center text-slate-400"
            }
          >
            {done ? "✓ " : active ? "● " : ""}
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function Checklist({ items }: { items: PartItem[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-[13px]">
      {items.map((item) => (
        <li
          key={item.key}
          className={
            item.done
              ? "flex items-center gap-1.5 text-emerald-700"
              : "flex items-center gap-1.5 text-red-700"
          }
        >
          {item.done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span>
            {item.label}
            {item.hint && !item.done ? (
              <span className="text-slate-400"> ({item.hint})</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

const TAG = {
  todo: "bg-red-50 text-red-700",
  working: "bg-gov-blue-50 text-gov-blue",
  review: "bg-amber-50 text-amber-800",
  done: "bg-emerald-50 text-emerald-700",
};

const primaryButton =
  "mt-4 block w-full rounded-lg bg-navy-900 py-3 text-center text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-700 focus-visible:ring-offset-2";
const secondaryButton =
  "mt-4 block w-full rounded-lg border border-slate-300 bg-white py-2.5 text-center text-sm font-bold text-slate-700 hover:bg-slate-50";

export default function CurrentStageCards({
  logo,
  meta,
  submission,
  representativeName,
  accountEmail,
}: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [initialField, setInitialField] = useState<string | null>(null);

  const openLogoWizard = (field: string | null) => {
    setInitialField(field);
    setWizardOpen(true);
  };

  const cards: {
    key: string;
    needsAction: boolean;
    summary: string;
    node: React.ReactNode;
  }[] = [];

  if (logo) {
    const missing = logo.items.filter((item) => !item.done);
    const firstMissing = missing[0]?.key ?? null;
    let node: React.ReactNode;
    if (logo.stage === "info" || logo.stage === "partial") {
      const partial = logo.stage === "partial";
      node = (
        <article
          className={`rounded-xl border-4 bg-white p-5 ${partial ? "border-red-300" : "border-gold-500"}`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.todo}`}
            >
              {partial ? "보완 필요 · 아직 접수 전" : "지금 해야 할 일"}
            </span>
            <span className="text-[11px] text-slate-400">로고</span>
          </div>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            {partial
              ? `로고 정보 ${missing.length}가지가 빠졌어요`
              : logo.existing
                ? "기존 로고 파일을 올려 주세요"
                : "로고 정보를 제출해 주세요"}
          </h3>
          <p className="mt-1 text-[13px] text-slate-600">
            {partial
              ? "일부만 입력한 상태로는 디자이너에게 전달되지 않습니다."
              : `아래 ${logo.items.length}가지를 모두 내야 디자이너가 작업을 시작합니다.`}
          </p>
          <Checklist items={logo.items} />
          <button
            type="button"
            onClick={() => openLogoWizard(firstMissing)}
            className={primaryButton}
          >
            {partial ? "빠진 정보 입력하기" : "로고 정보 입력하기"}
          </button>
        </article>
      );
      cards.push({
        key: "logo",
        needsAction: true,
        summary: "로고 정보 제출 필요",
        node,
      });
    } else if (logo.stage === "working") {
      node = (
        <article className="rounded-xl border-4 border-gov-blue-100 bg-white p-5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.working}`}
          >
            접수 완료 · 폴라애드 작업 중
          </span>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            {logo.existing
              ? "폴라애드가 로고 파일을 확인하고 있어요"
              : "디자이너가 로고를 제작하고 있어요"}
          </h3>
          <p className="mt-1 text-[13px] text-slate-600">
            시안은 1~2일 안에 전달됩니다. 지금은 기다리시면 됩니다.
          </p>
          <Stepper stage="working" />
          <button
            type="button"
            onClick={() => openLogoWizard(null)}
            className={secondaryButton}
          >
            제출한 정보 보기
          </button>
        </article>
      );
      cards.push({
        key: "logo",
        needsAction: false,
        summary: "로고 제작 중",
        node,
      });
    } else if (logo.stage === "review") {
      node = (
        <article className="stage-blink rounded-xl border-4 border-amber-400 bg-white p-5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.review}`}
          >
            확인 필요
          </span>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            로고 시안이 도착했어요
          </h3>
          <p className="mt-1 text-[13px] text-slate-600">
            시안을 보고 확정하거나 수정 의견을 남겨 주세요.
          </p>
          <Stepper stage="review" />
          <Link
            href="/dashboard/workflows"
            className={`${primaryButton} stage-blink-button`}
          >
            시안 확인하기
          </Link>
        </article>
      );
      cards.push({
        key: "logo",
        needsAction: true,
        summary: "로고 시안 확인 필요",
        node,
      });
    } else {
      node = (
        <article className="rounded-xl border-4 border-emerald-300 bg-white p-5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.done}`}
          >
            완료
          </span>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            로고가 확정되었습니다
          </h3>
          <p className="mt-1 text-[13px] text-slate-600">
            확정된 로고로 명함·인쇄물·홈페이지 작업이 이어집니다.
          </p>
          <Link href="/dashboard/workflows" className={secondaryButton}>
            확정 로고 보기
          </Link>
        </article>
      );
      cards.push({
        key: "logo",
        needsAction: false,
        summary: "로고 확정",
        node,
      });
    }
  }

  if (meta) {
    let node: React.ReactNode;
    if (meta.stage === "none") {
      node = (
        <article className="rounded-xl border-4 border-gold-500 bg-white p-5">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.todo}`}
            >
              교육 전 필수
            </span>
            <span className="text-[11px] text-slate-400">Meta 설정</span>
          </div>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            마케팅 교육 전에 Meta 설정을 요청해 주세요
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            폴라애드가 페이스북·인스타그램 설정을 미리 해 두어야 교육 당일 바로
            실습할 수 있습니다.
          </p>
          <Checklist
            items={[
              {
                key: "meta",
                label: "인스타그램 ID/PW 또는 구글 ID/PW",
                done: false,
              },
            ]}
          />
          <Link href="/dashboard/meta-setup" className={primaryButton}>
            Meta 설정 요청하기
          </Link>
        </article>
      );
      cards.push({
        key: "meta",
        needsAction: true,
        summary: "Meta 설정요청 필요",
        node,
      });
    } else if (meta.stage === "requested") {
      node = (
        <article className="rounded-xl border-4 border-gov-blue-100 bg-white p-5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.working}`}
          >
            요청 완료
          </span>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            Meta 설정을 요청했어요
          </h3>
          <p className="mt-1 text-[13px] text-slate-600">
            {formatDate(meta.requestedAt)} 요청 ·{" "}
            {meta.type === "google" ? "구글" : "인스타그램"} 계정 · 폴라애드가
            교육 전에 설정합니다.
          </p>
          <Link href="/dashboard/meta-setup" className={secondaryButton}>
            요청 내용 보기·수정
          </Link>
        </article>
      );
      cards.push({
        key: "meta",
        needsAction: false,
        summary: "Meta 설정 요청 완료",
        node,
      });
    } else {
      node = (
        <article className="rounded-xl border-4 border-emerald-300 bg-white p-5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG.done}`}
          >
            설정 완료
          </span>
          <h3 className="mt-2 text-lg font-black text-navy-900">
            Meta 설정이 끝났어요
          </h3>
          <p className="mt-1 text-[13px] text-slate-600">
            교육용 토큰 2개를 메일과 Meta 설정 화면에서 확인할 수 있습니다.
          </p>
          <Link href="/dashboard/meta-setup" className={secondaryButton}>
            토큰 확인하기
          </Link>
        </article>
      );
      cards.push({
        key: "meta",
        needsAction: false,
        summary: "Meta 설정 완료",
        node,
      });
    }
  }

  if (cards.length === 0) return null;
  const ordered = [
    ...cards.filter((card) => card.needsAction),
    ...cards.filter((card) => !card.needsAction),
  ];
  const anyAction = ordered.some((card) => card.needsAction);

  return (
    <section aria-labelledby="current-stage-title" className="space-y-2">
      {/* 시안 확인이 필요하면 카드와 버튼이 계속 깜빡여 주의를 끈다 (사용자 지시 2026-10-17) */}
      <style>{`
        @keyframes stage-blink { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: #f59e0b; } 50% { box-shadow: 0 0 0 8px rgba(245,158,11,.35); border-color: #fbbf24; } }
        @keyframes stage-blink-button { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
        .stage-blink { animation: stage-blink 1.2s ease-in-out infinite; }
        .stage-blink-button { animation: stage-blink-button 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .stage-blink, .stage-blink-button { animation: none; }
          .stage-blink { box-shadow: 0 0 0 6px rgba(245,158,11,.35); }
        }
      `}</style>
      <h2
        id="current-stage-title"
        className="px-1 text-sm font-bold text-slate-900 md:text-base"
      >
        내 진행 단계
      </h2>
      {anyAction ? (
        <div className="grid gap-3 md:grid-cols-2">
          {ordered.map((card) => (
            <div key={card.key}>{card.node}</div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-4 border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          {ordered.map((card, index) => (
            <span key={card.key} className="flex items-center gap-2">
              {index > 0 ? <span className="text-slate-300">·</span> : null}
              {card.summary}
            </span>
          ))}
          <Link
            href="/dashboard/meta-setup"
            className="ml-auto text-xs font-bold text-gov-blue underline underline-offset-2"
          >
            Meta 설정 보기
          </Link>
        </div>
      )}

      {wizardOpen && (
        <QuestWizardDialog
          open
          onClose={() => {
            setWizardOpen(false);
            setInitialField(null);
          }}
          initialField={initialField}
          title="로고 제작 정보"
          description="로고 시안 제작에 필요한 항목을 입력합니다."
          steps={LOGO_INFO_STEPS}
          completion={LOGO_COMPLETION}
          initialValues={
            (submission as Record<string, string | null | undefined>) ?? {}
          }
          representativeName={representativeName}
          accountEmail={accountEmail}
        />
      )}
    </section>
  );
}
