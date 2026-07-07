"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  X,
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
  /** true면 미입력 시 미완료로 표시하지 않고 "선택"으로 표시 (마케팅처럼 운영 채널이 없으면 비워둬도 됨) */
  optional?: boolean;
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
    subtitle: "이미 운영 중인 채널이 있으면 입력 (없으면 비워두셔도 됩니다)",
    workflowTypes: [],
    alwaysShow: true,
    optional: true,
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
  const router = useRouter();
  const [questId, setQuestId] = useState<string | null>(null);
  // 위자드 열 때 바로 진입할 항목(field). null이면 첫(또는 첫 미완료) 스텝
  const [initialField, setInitialField] = useState<string | null>(null);
  /** 직전에 완료한 wizardId (완료 banner 표시용) */
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // 5초 후 banner 자동 숨김
  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => setJustCompleted(null), 5000);
    return () => clearTimeout(t);
  }, [justCompleted]);

  // 항상 노출(alwaysShow) 또는 사용자가 보유한 워크플로우 type 매칭 시 카드 노출
  const visibleDeliverables = DELIVERABLES.filter(
    (d) =>
      d.alwaysShow ||
      d.workflowTypes.some((t) => workflows.some((w) => w.type === t)),
  );

  // 직전 완료 카드의 정보 + 다음 추천 카드 (미완성 첫 번째)
  const completionBanner = useMemo(() => {
    if (!justCompleted) return null;
    const justCompletedDeliv = visibleDeliverables.find(
      (d) => d.wizardId === justCompleted,
    );
    if (!justCompletedDeliv) return null;
    const next = visibleDeliverables.find((d) => {
      if (d.wizardId === justCompleted) return false;
      const filled = d.fields.filter((f) =>
        fieldFilled(f.key, submission, workflows),
      ).length;
      return filled < d.fields.length;
    });
    return { just: justCompletedDeliv, next };
  }, [justCompleted, visibleDeliverables, submission, workflows]);

  if (visibleDeliverables.length === 0) return null;

  const quest = questId ? QUEST_MAP[questId] : null;

  return (
    <>
      <div className="space-y-2">
        {/* 완료 banner — 5초 자동 사라짐 + 다음 카드 CTA (관공서 톤: 정부24식 안내 박스) */}
        {completionBanner && (
          <div className="flex items-center gap-3 p-3 rounded bg-emerald-50 border border-emerald-200 text-slate-900 animate-in fade-in slide-in-from-top-1 duration-300">
            <CheckCircle2
              className="w-5 h-5 text-emerald-600 flex-shrink-0"
              strokeWidth={2.5}
            />
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-semibold">
                «{completionBanner.just.title}» 입력 완료
              </span>
              {completionBanner.next && (
                <span className="text-slate-700 ml-1">
                  · 다음 처리 사항: «{completionBanner.next.title}»
                </span>
              )}
              {!completionBanner.next && (
                <span className="text-slate-700 ml-1">
                  · 모든 정보 입력이 완료되었습니다
                </span>
              )}
            </div>
            {completionBanner.next && (
              <button
                type="button"
                onClick={() => {
                  const nextId = completionBanner.next!.wizardId;
                  if (nextId === "website-info") {
                    router.push("/dashboard/homepage");
                  } else {
                    setQuestId(nextId);
                    setInitialField(null);
                  }
                }}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded bg-gov-blue text-white hover:bg-gov-blue-700 transition-colors"
              >
                바로 처리
              </button>
            )}
            <button
              type="button"
              onClick={() => setJustCompleted(null)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-700"
              aria-label="안내 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 섹션 헤더 — 관공서 양식 헤더 톤 */}
        <div className="flex items-baseline justify-between px-1 pt-1">
          <h2 className="text-sm md:text-base font-bold text-slate-900">
            신청 항목별 필요 정보
          </h2>
          <span className="text-[11px] text-slate-500">
            항목을 눌러 필요한 정보를 입력하세요
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 auto-rows-fr">
          {visibleDeliverables.map((d) => {
            const filled = d.fields.filter((f) =>
              fieldFilled(f.key, submission, workflows),
            ).length;
            const total = d.fields.length;
            const complete = filled === total;
            const percent = Math.round((filled / total) * 100);

            // 직접 입력 필드 중 미입력
            const userMissing = d.fields.filter(
              (f) => !f.auto && !fieldFilled(f.key, submission, workflows),
            );

            const openField = (field: string | null) => {
              // 홈페이지 카드 = 위자드 다이얼로그가 아닌 전용 페이지로 이동
              if (d.wizardId === "website-info") {
                router.push("/dashboard/homepage");
                return;
              }
              if (basicMissing && d.wizardId !== "basic-info") {
                // 기본 정보 미완성 → 기본 정보부터 유도
                setQuestId("basic-info");
                setInitialField(null);
                return;
              }
              setQuestId(d.wizardId);
              setInitialField(field);
            };
            // 카드 여백 클릭 = 첫 미완료 항목으로 진입 (없으면 첫 스텝)
            const handleClick = () => openField(userMissing[0]?.key ?? null);

            return (
              <button
                key={d.title}
                type="button"
                onClick={handleClick}
                className={`group flex flex-col h-full text-left rounded-lg border p-3 md:p-3.5 transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gov-blue ${
                  complete
                    ? "border-emerald-300 bg-white hover:border-emerald-400"
                    : d.optional
                      ? "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white"
                      : "border-slate-200 bg-white hover:border-gov-blue"
                }`}
              >
                {/* 헤더 — 고정 높이 (아이콘 + 타이틀 + 부제 2줄 영역 reserve) */}
                <div className="flex items-start justify-between gap-2 mb-2 min-h-[3.25rem]">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded flex-shrink-0 ${
                        complete
                          ? "bg-emerald-50 text-emerald-700"
                          : d.optional
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-100 text-gov-blue"
                      }`}
                    >
                      {d.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                        {d.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2 min-h-[1.7rem]">
                        {d.subtitle}
                      </p>
                    </div>
                  </div>
                  {complete ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
                      완료
                    </span>
                  ) : d.optional ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0">
                      선택
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-blue-50 text-gov-blue border border-gov-blue-100 flex-shrink-0">
                      {filled}/{total}
                    </span>
                  )}
                </div>

                {/* 진행률 바 — 관공서 톤 */}
                <div className="h-1 bg-slate-100 rounded-sm overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-sm transition-all ${
                      complete
                        ? "bg-emerald-500"
                        : d.optional
                          ? "bg-slate-400"
                          : "bg-gov-blue"
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
                        onClick={
                          f.auto
                            ? undefined
                            : (e) => {
                                e.stopPropagation();
                                openField(f.key);
                              }
                        }
                        title={f.auto ? undefined : `${f.label} 확인 / 변경`}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          !f.auto
                            ? "cursor-pointer rounded px-1 -mx-1 hover:bg-gov-blue-50 hover:text-gov-blue"
                            : ""
                        } ${
                          has
                            ? "text-slate-500"
                            : d.optional
                              ? "text-slate-500"
                              : "text-slate-900 font-medium"
                        }`}
                      >
                        {has ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        ) : d.optional ? (
                          <Circle className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        )}
                        <span
                          className={
                            has ? "line-through decoration-slate-300" : ""
                          }
                        >
                          {f.label}
                        </span>
                        {f.auto && (
                          <span className="text-[9px] text-slate-400 ml-auto whitespace-nowrap">
                            자동
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* 액션 안내 — 항상 카드 바닥에 고정 (mt-auto로 잡아줌) */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span
                    className={`flex-1 min-w-0 text-[11px] font-medium truncate ${
                      complete
                        ? "text-emerald-700"
                        : d.optional
                          ? "text-slate-500"
                          : userMissing.length > 0
                            ? "text-gov-blue"
                            : "text-slate-500"
                    }`}
                  >
                    {complete
                      ? "확인 / 수정"
                      : basicMissing && d.wizardId !== "basic-info"
                        ? "기본 정보 먼저 입력"
                        : d.optional
                          ? userMissing.length > 0
                            ? "운영 중인 채널이 있으면 입력"
                            : "확인 / 수정"
                          : userMissing.length === 0
                            ? "프로필·로고 등 자동 항목 채워주세요"
                            : userMissing.length <= 2
                              ? `${userMissing.map((f) => f.label).join(" · ")} 입력`
                              : `${userMissing[0].label} 외 ${userMissing.length - 1}건 입력`}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      complete
                        ? "text-emerald-600"
                        : d.optional
                          ? "text-slate-400"
                          : "text-gov-blue"
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
          onClose={() => {
            setQuestId(null);
            setInitialField(null);
          }}
          initialField={initialField}
          onComplete={() => {
            // questId는 onComplete 직후 onClose에서 null로 바뀌므로 여기서 미리 캡처
            if (questId) setJustCompleted(questId);
          }}
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
