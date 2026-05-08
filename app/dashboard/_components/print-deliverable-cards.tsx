"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  CreditCard,
  IdCard,
  FileText,
  Globe,
  Briefcase,
  Megaphone,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import QuestWizardDialog, {
  BASIC_INFO_STEPS,
  LOGO_INFO_STEPS,
  HOMEPAGE_INFO_STEPS,
  MARKETING_INFO_STEPS,
  NAMECARD_ENVELOPE_STEPS,
  CONTRACT_STEPS,
  type QuestStep,
} from "@/components/dashboard/quest-wizard-dialog";

type Submission = Record<string, unknown> | null;

interface WorkflowSummary {
  type: string;
  status: string;
}

interface FieldSpec {
  /** submission 필드명 또는 'logo-confirmed' 같은 가상 키 */
  key: string;
  /** 사용자에게 보여줄 라벨 */
  label: string;
  /** 자동 채움 (기본 정보·로고)인지 */
  auto?: boolean;
}

interface DeliverableSpec {
  /** 모달에 사용할 wizard ID */
  wizardId:
    | "logo-info"
    | "namecard-envelope-info"
    | "contract-info"
    | "website-info"
    | "basic-info"
    | "marketing-info";
  title: string;
  /** 매칭되는 workflow.type 배열 (한쪽이라도 보유 시 카드 표시) */
  workflowTypes: string[];
  /** true면 워크플로우 매칭 없이도 항상 카드 노출 (기본 정보·마케팅 같은 공통 카드) */
  alwaysShow?: boolean;
  icon: ReactNode;
  /** 이 인쇄물을 만들기 위한 모든 필요 항목 (자동 + 직접 입력) */
  fields: FieldSpec[];
  /** 카드 한 줄 부제 */
  subtitle: string;
}

const DELIVERABLES: DeliverableSpec[] = [
  {
    wizardId: "basic-info",
    title: "기본 정보",
    subtitle: "모든 인쇄물·홈페이지의 공통 기반 정보",
    workflowTypes: [],
    alwaysShow: true,
    icon: <Briefcase className="w-5 h-5" />,
    fields: [
      { key: "사업자등록증URL", label: "사업자등록증" },
      { key: "프로필사진URL", label: "프로필 사진" },
      { key: "브랜드명", label: "브랜드명" },
      { key: "업종", label: "업종" },
      { key: "주소", label: "사업장 주소" },
      { key: "대표번호", label: "대표 연락처" },
    ],
  },
  {
    wizardId: "logo-info",
    title: "로고",
    subtitle: "모든 인쇄물·홈페이지의 시작점",
    workflowTypes: ["로고"],
    icon: <Sparkles className="w-5 h-5" />,
    fields: [
      { key: "브랜드명", label: "브랜드명", auto: true },
      { key: "로고선호스타일", label: "로고 스타일" },
      { key: "로고선호폰트", label: "선호 폰트" },
      { key: "로고선호색상", label: "선호 색상" },
    ],
  },
  {
    wizardId: "namecard-envelope-info",
    title: "명함 · 대봉투",
    subtitle: "한 번 입력하면 양쪽에 같이 적용됩니다",
    workflowTypes: ["명함", "대봉투"],
    icon: <CreditCard className="w-5 h-5" />,
    fields: [
      { key: "브랜드명", label: "브랜드명", auto: true },
      { key: "업종", label: "업종", auto: true },
      { key: "주소", label: "주소", auto: true },
      { key: "대표번호", label: "대표 연락처", auto: true },
      { key: "사업자등록증URL", label: "사업자등록증", auto: true },
      { key: "로고-확정", label: "로고 (시안 확정)", auto: true },
      { key: "명함시안", label: "명함 스타일" },
      { key: "명함색상", label: "명함 색상" },
    ],
  },
  {
    wizardId: "basic-info",
    title: "명찰",
    subtitle: "기본 정보의 프로필 사진이 그대로 사용됩니다",
    workflowTypes: ["명찰"],
    icon: <IdCard className="w-5 h-5" />,
    fields: [
      { key: "브랜드명", label: "브랜드명", auto: true },
      { key: "프로필사진URL", label: "프로필 사진", auto: true },
    ],
  },
  {
    wizardId: "contract-info",
    title: "자문계약서",
    subtitle: "표지 + 내지에 같이 적용됩니다",
    workflowTypes: ["자문계약서 표지", "자문계약서 내지"],
    icon: <FileText className="w-5 h-5" />,
    fields: [
      { key: "브랜드명", label: "브랜드명", auto: true },
      { key: "사업자등록증URL", label: "사업자등록증", auto: true },
      { key: "은행명", label: "은행명" },
      { key: "계좌번호", label: "계좌번호" },
    ],
  },
  {
    wizardId: "website-info",
    title: "홈페이지",
    subtitle: "기본 정보·로고를 기반으로 제작됩니다",
    workflowTypes: ["홈페이지"],
    icon: <Globe className="w-5 h-5" />,
    fields: [
      { key: "브랜드명", label: "브랜드명", auto: true },
      { key: "업종", label: "업종", auto: true },
      { key: "로고-확정", label: "로고 (시안 확정)", auto: true },
      { key: "홈페이지스타일", label: "홈페이지 스타일" },
      { key: "홈페이지컬러컨셉", label: "메인 컬러" },
      { key: "도메인주소", label: "도메인 (선택)" },
    ],
  },
  {
    wizardId: "marketing-info",
    title: "마케팅 정보",
    subtitle: "이미 운영 중인 채널이 있으면 입력 (선택)",
    workflowTypes: [],
    alwaysShow: true,
    icon: <Megaphone className="w-5 h-5" />,
    fields: [
      { key: "네이버검색광고ID", label: "네이버 검색광고 ID" },
      { key: "InstagramID", label: "인스타그램 ID" },
    ],
  },
];

const QUEST_MAP: Record<
  string,
  { title: string; description: string; steps: QuestStep[] }
> = {
  "basic-info": {
    title: "기본 정보 입력",
    description:
      "사업자등록증·프로필 사진 등 기본 정보 6가지를 차례로 입력합니다.",
    steps: BASIC_INFO_STEPS,
  },
  "logo-info": {
    title: "로고 제작 정보",
    description: "로고 시안 제작에 필요한 항목을 입력합니다.",
    steps: LOGO_INFO_STEPS,
  },
  "website-info": {
    title: "홈페이지 제작 정보",
    description: "홈페이지 스타일·메인 컬러·도메인 주소를 입력합니다.",
    steps: HOMEPAGE_INFO_STEPS,
  },
  "namecard-envelope-info": {
    title: "명함·대봉투 정보",
    description: "명함과 대봉투에 공통으로 적용될 스타일과 색상을 선택합니다.",
    steps: NAMECARD_ENVELOPE_STEPS,
  },
  "contract-info": {
    title: "자문계약서 계좌 정보",
    description: "자문계약서에 기재될 입금 계좌 정보를 입력합니다.",
    steps: CONTRACT_STEPS,
  },
  "marketing-info": {
    title: "마케팅 채널 정보",
    description: "이미 운영 중인 광고 ID가 있으면 입력해주세요. (선택)",
    steps: MARKETING_INFO_STEPS,
  },
};

function fieldFilled(
  key: string,
  submission: Submission,
  workflows: WorkflowSummary[],
): boolean {
  if (key === "로고-확정") {
    return workflows.some((w) => w.type === "로고" && w.status === "시안확정");
  }
  const v = submission?.[key];
  return !!v;
}

interface Props {
  submission: Submission;
  workflows: WorkflowSummary[];
  representativeName?: string;
  /** 기본 정보 자체가 비어있는지 (사업자등록증·프로필사진·브랜드명 셋 다 미입력) */
  basicMissing: boolean;
}

export default function PrintDeliverableCards({
  submission,
  workflows,
  representativeName,
  basicMissing,
}: Props) {
  const [questId, setQuestId] = useState<string | null>(null);

  // 항상 노출(alwaysShow) 또는 사용자가 보유한 워크플로우 type 매칭 시 카드 노출
  const visibleDeliverables = DELIVERABLES.filter(
    (d) =>
      d.alwaysShow ||
      d.workflowTypes.some((t) => workflows.some((w) => w.type === t)),
  );

  if (visibleDeliverables.length === 0) return null;

  const quest = questId ? QUEST_MAP[questId] : null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm md:text-base font-bold text-navy-900">
            인쇄물별 필요 정보
          </h2>
          <span className="text-[11px] text-gray-500">
            카드를 눌러 필요한 정보를 입력하세요
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 auto-rows-fr">
          {visibleDeliverables.map((d) => {
            const filled = d.fields.filter((f) =>
              fieldFilled(f.key, submission, workflows),
            ).length;
            const total = d.fields.length;
            const remaining = total - filled;
            const complete = filled === total;
            const percent = Math.round((filled / total) * 100);

            // 직접 입력 필드 중 미입력
            const userMissing = d.fields.filter(
              (f) => !f.auto && !fieldFilled(f.key, submission, workflows),
            );

            const handleClick = () => {
              if (basicMissing && d.wizardId !== "basic-info") {
                setQuestId("basic-info");
              } else {
                setQuestId(d.wizardId);
              }
            };

            return (
              <button
                key={d.title}
                type="button"
                onClick={handleClick}
                className={`group flex flex-col h-full text-left rounded-xl border-2 p-3 md:p-3.5 transition-all hover:shadow-md ${
                  complete
                    ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                    : "border-gray-200 bg-white hover:border-navy-300 hover:bg-navy-50/30"
                }`}
              >
                {/* 헤더 — 고정 높이 (아이콘 + 타이틀 + 부제 2줄 영역 reserve) */}
                <div className="flex items-start justify-between gap-2 mb-2 min-h-[3.25rem]">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                        complete
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-navy-100 text-navy-700"
                      }`}
                    >
                      {d.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">
                        {d.title}
                      </h3>
                      <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2 min-h-[1.7rem]">
                        {d.subtitle}
                      </p>
                    </div>
                  </div>
                  {complete ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-50 text-navy-700 border border-navy-200 flex-shrink-0">
                      {filled}/{total}
                    </span>
                  )}
                </div>

                {/* 진행률 바 */}
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      complete ? "bg-emerald-500" : "bg-navy-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* 필요 항목 리스트 — flex-1로 남은 공간 흡수 → 푸터를 카드 바닥에 고정 */}
                <ul className="flex-1 space-y-0.5 mb-2">
                  {d.fields.map((f) => {
                    const has = fieldFilled(f.key, submission, workflows);
                    return (
                      <li
                        key={f.key}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          has ? "text-gray-500" : "text-gray-900 font-medium"
                        }`}
                      >
                        {has ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                        )}
                        <span
                          className={
                            has ? "line-through decoration-gray-300" : ""
                          }
                        >
                          {f.label}
                        </span>
                        {f.auto && (
                          <span className="text-[9px] text-gray-400 ml-auto whitespace-nowrap">
                            자동
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* 액션 안내 — 항상 카드 바닥에 고정 (mt-auto로 잡아줌) */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <span
                    className={`flex-1 min-w-0 text-[11px] font-medium truncate ${
                      complete
                        ? "text-emerald-700"
                        : userMissing.length > 0
                          ? "text-navy-700"
                          : "text-gray-500"
                    }`}
                  >
                    {complete
                      ? "확인 / 수정"
                      : basicMissing && d.wizardId !== "basic-info"
                        ? "기본 정보 먼저 입력"
                        : userMissing.length > 0
                          ? `${userMissing.map((f) => f.label).join(" · ")} 입력`
                          : "프로필·로고 등 자동 항목 채워주세요"}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      complete ? "text-emerald-600" : "text-navy-600"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
