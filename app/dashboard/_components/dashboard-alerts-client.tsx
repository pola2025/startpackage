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
}

const QUEST_MAP: Record<
  string,
  { title: string; description: string; steps: QuestStep[] }
> = {
  "basic-info": {
    title: "기본 정보 입력",
    description:
      "사업자등록증·프로필 사진을 포함한 기본 정보 6가지를 차례로 입력합니다.",
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

const COLORS: Record<AlertNotification["type"], string> = {
  urgent: "text-terra-600 hover:bg-terra-50 border-terra-100",
  warning: "text-terra-500 hover:bg-terra-50 border-terra-100",
  info: "text-navy-600 hover:bg-navy-50 border-navy-200",
  success: "text-ok-700 hover:bg-ok-50 border-ok-100",
};

const BADGE_COLORS: Record<AlertNotification["type"], string> = {
  urgent: "bg-terra-50 text-terra-600 border-terra-100",
  warning: "bg-terra-50 text-terra-500 border-terra-100",
  info: "bg-navy-50 text-navy-600 border-navy-200",
  success: "bg-ok-50 text-ok-700 border-ok-100",
};

export default function DashboardAlertsClient({
  notifications,
  todoCounts,
  submission,
  representativeName,
}: Props) {
  const [questId, setQuestId] = useState<string | null>(null);

  if (notifications.length === 0) return null;

  const quest = questId ? QUEST_MAP[questId] : null;

  return (
    <>
      <Card className="bg-white border-2 border-rose-100">
        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm md:text-base text-gray-900 flex items-center gap-2">
              <span className="text-rose-600">⚠️</span>
              내가 처리해야 할 것
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[11px] md:text-xs">
              {todoCounts.urgent > 0 && (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded border border-rose-200">
                  미입력 {todoCounts.urgent}
                </span>
              )}
              {todoCounts.confirm > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200">
                  컨펌 {todoCounts.confirm}
                </span>
              )}
              {todoCounts.waiting > 0 && (
                <span className="px-2 py-0.5 bg-slate-50 text-slate-600 font-bold rounded border border-slate-200">
                  대기 {todoCounts.waiting}
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
        <CardContent className="p-3 md:p-4 pt-0">
          <div className="space-y-1">
            {notifications.map((n) => {
              const isQuest = n.id in QUEST_MAP;
              const className = `flex items-center gap-2 p-2 md:p-2.5 rounded-lg border bg-white ${COLORS[n.type]} transition-all cursor-pointer group w-full text-left`;

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
          steps={quest.steps}
          initialValues={
            (submission as Record<string, string | null | undefined>) ?? {}
          }
          representativeName={representativeName}
        />
      )}
    </>
  );
}
