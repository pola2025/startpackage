"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuestWizardDialog, {
  BASIC_INFO_STEPS,
  LOGO_INFO_STEPS,
  HOMEPAGE_INFO_STEPS,
  MARKETING_INFO_STEPS,
  NAMECARD_ENVELOPE_STEPS,
  CONTRACT_STEPS,
  type QuestStep,
} from "@/components/dashboard/quest-wizard-dialog";

export type AlertNotification = {
  id: string;
  priority: number;
  type: "urgent" | "warning" | "info" | "success";
  message: string;
  link: string;
  badge: string;
};

type TodoCounts = {
  urgent: number;
  confirm: number;
  waiting: number;
  completed: number;
};

interface Props {
  notifications: AlertNotification[];
  todoCounts: TodoCounts;
  submission: Record<string, unknown> | null;
  /** 사업자 대표명 (account-holder step에 표시) */
  representativeName?: string;
  /** 가입 계정 이메일 (이메일 step 기본값) */
  accountEmail?: string;
  /** 배송지 필수 정책 대상 기수 여부 (최근 2개 기수만 true) */
  shippingRequired?: boolean;
}

const QUEST_MAP: Record<
  string,
  { title: string; description: string; steps: QuestStep[] }
> = {
  "basic-info": {
    title: "기본 정보 입력",
    description:
      "사업자등록증·프로필 사진을 포함한 기본 정보를 차례로 입력합니다.",
    steps: BASIC_INFO_STEPS,
  },
  "logo-info": {
    title: "로고 제작 정보",
    description: "로고 시안 제작에 필요한 4가지 항목을 입력합니다.",
    steps: LOGO_INFO_STEPS,
  },
  "website-info": {
    title: "홈페이지 제작 정보",
    description: "홈페이지 스타일·메인 컬러·도메인 주소를 입력합니다.",
    steps: HOMEPAGE_INFO_STEPS,
  },
  "marketing-info": {
    title: "마케팅 채널 정보",
    description: "이미 운영 중인 광고 ID가 있으면 입력해주세요.",
    steps: MARKETING_INFO_STEPS,
  },
  "namecard-envelope-info": {
    title: "명함·대봉투 정보",
    description:
      "명함과 대봉투에 공통으로 적용될 스타일과 색상을 선택합니다. 둘 중 한쪽만 입력해도 양쪽 모두 반영됩니다.",
    steps: NAMECARD_ENVELOPE_STEPS,
  },
  "contract-info": {
    title: "자문계약서 계좌 정보",
    description:
      "자문계약서에 기재될 입금 계좌 정보를 입력합니다. 그 외 정보는 기본정보에서 자동으로 가져옵니다.",
    steps: CONTRACT_STEPS,
  },
};

// 관공서 톤: 미입력=amber(주의), 컨펌=gov-blue(처리 중), 정보=slate, 완료=emerald
const COLORS: Record<AlertNotification["type"], string> = {
  urgent: "text-slate-900 hover:bg-amber-50 border-amber-200",
  warning: "text-slate-900 hover:bg-amber-50 border-amber-100",
  info: "text-slate-900 hover:bg-gov-blue-50 border-slate-200",
  success: "text-slate-900 hover:bg-emerald-50 border-emerald-100",
};

const BADGE_COLORS: Record<AlertNotification["type"], string> = {
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  warning: "bg-amber-50 text-amber-600 border-amber-100",
  info: "bg-gov-blue-50 text-gov-blue border-gov-blue-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function DashboardAlertsClient({
  notifications,
  todoCounts,
  submission,
  representativeName,
  accountEmail,
  shippingRequired = false,
}: Props) {
  const [questId, setQuestId] = useState<string | null>(null);

  if (notifications.length === 0) return null;

  const quest = questId ? QUEST_MAP[questId] : null;

  return (
    <>
      {/* 처리 사항 패널 — 관공서 양식: 좌측 단색 액센트 + 차분한 헤더 */}
      <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm md:text-base text-slate-900 font-bold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-amber-500 text-white text-[10px] font-bold">
                !
              </span>
              처리 사항 안내
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[11px] md:text-xs">
              {todoCounts.urgent > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200">
                  미입력 {todoCounts.urgent}
                </span>
              )}
              {todoCounts.confirm > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200">
                  컨펌 {todoCounts.confirm}
                </span>
              )}
              {todoCounts.waiting > 0 && (
                <span className="px-2 py-0.5 bg-gov-blue-50 text-gov-blue font-bold rounded border border-gov-blue-100">
                  처리 중 {todoCounts.waiting}
                </span>
              )}
              {todoCounts.completed > 0 && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200">
                  완료 {todoCounts.completed}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-2">
          <div className="space-y-1">
            {notifications.map((n) => {
              const isQuest = n.id in QUEST_MAP;
              const className = `flex items-center gap-2 p-2 md:p-2.5 rounded border border-slate-200 bg-white ${COLORS[n.type]} transition-all cursor-pointer group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-blue`;

              const inner = (
                <>
                  <span
                    className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${BADGE_COLORS[n.type]}`}
                  >
                    {n.badge}
                  </span>
                  <span className="flex-1 text-xs md:text-sm font-medium line-clamp-1">
                    {n.message}
                  </span>
                </>
              );

              if (isQuest) {
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setQuestId(n.id)}
                    className={className}
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <Link key={n.id} href={n.link} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {quest && (
        <QuestWizardDialog
          open
          onClose={() => setQuestId(null)}
          title={quest.title}
          description={quest.description}
          steps={
            shippingRequired
              ? quest.steps
              : quest.steps.filter((s) => s.type !== "shipping")
          }
          initialValues={
            (submission as Record<string, string | null | undefined>) ?? {}
          }
          representativeName={representativeName}
          accountEmail={accountEmail}
        />
      )}
    </>
  );
}
