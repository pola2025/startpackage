import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isShippingPolicyCohort } from "@/lib/shipping-policy";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDday } from "@/lib/utils";
import PrintRequestButton from "./print-request-button";
import MarketingExtensionDialog from "./marketing-extension-dialog";
import { ensureUserWorkflows } from "@/lib/ensureUserWorkflows";
import ProgressVisualization from "@/components/dashboard/progress-visualization";
import DashboardAlertsClient from "./_components/dashboard-alerts-client";
import PrintDeliverableCards from "./_components/print-deliverable-cards";
import { isHomepageCompleteStatus } from "@/lib/workflow/homepage-status";
import {
  calculateMarketingSupportEndDate,
  getMarketingSupportDurationLabel,
} from "@/lib/marketing-support";

// Temporary Progress component
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ""}`}
    >
      <div
        className="h-full bg-gov-blue transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
import {
  Calendar,
  Clock,
  Package,
  AlertCircle,
  Megaphone,
  Database,
  Bell,
  MessageSquare,
  BarChart3,
  Sheet,
} from "lucide-react";

export default async function UserDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const userId = (session.user as any).id;

  // 워크플로우 누락 체크 및 자동 생성
  await ensureUserWorkflows(userId);

  // 사용자 정보 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      cohort: true,
      submission: true,
      workflows: {
        orderBy: { createdAt: "asc" },
      },
      marketingExtensionRequests: {
        orderBy: {
          requestDate: "desc",
        },
        take: 1,
      },
      communicationThreads: {
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-3" />
          <p className="text-gray-900">사용자 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  // 읽지 않은 공지사항 (나중에 구현)
  const unreadAnnouncements = 0;

  const dday = user.cohort?.자료제출마감일
    ? formatDday(user.cohort.자료제출마감일)
    : null;

  // Submission completion percentage
  const submissionFields = [
    user.submission?.사업자등록증URL,
    user.submission?.프로필사진URL,
    user.submission?.브랜드명,
    user.submission?.업종,
    user.submission?.주소,
    user.submission?.명함시안,
  ];
  const completedFields = submissionFields.filter(Boolean).length;
  const totalFields = submissionFields.length;
  const completionPercent = Math.round((completedFields / totalFields) * 100);

  // 마케팅 지원 기간 계산 (26-5기부터 8주, 이전 기수는 3개월)
  let marketingStartDate: Date | null = null;
  let marketingEndDate: Date | null = null;
  const marketingSupportDurationLabel = getMarketingSupportDurationLabel(
    user.cohort?.name,
  );

  if (
    user.marketingSupportEnabled &&
    user.marketingSupportStartDate &&
    user.marketingSupportEndDate
  ) {
    // DB에 설정된 값이 있으면 사용 (연장된 경우)
    marketingStartDate = new Date(user.marketingSupportStartDate);
    marketingEndDate = new Date(user.marketingSupportEndDate);
  } else if (user.cohort?.교육시작일) {
    // 교육시작일 기준으로 자동 계산
    marketingStartDate = new Date(user.cohort.교육시작일);
    marketingEndDate = calculateMarketingSupportEndDate(
      user.cohort.교육시작일,
      user.cohort.name,
    );
  }

  // === 알림 시스템 ===
  type Notification = {
    id: string;
    priority: number; // 1: 최고, 2: 높음, 3: 중간, 4: 낮음
    type: "urgent" | "warning" | "info" | "success";
    message: string;
    link: string;
    badge: string;
  };

  const notifications: Notification[] = [];

  // 1. 기본 정보 미입력 (최우선)
  if (
    !user.submission?.브랜드명 ||
    !user.submission?.사업자등록증URL ||
    !user.submission?.프로필사진URL
  ) {
    notifications.push({
      id: "basic-info",
      priority: 1,
      type: "urgent",
      message: "기본 정보를 입력해주세요",
      link: "/dashboard/submission#basic",
      badge: "필수",
    });
  }

  // 2. 로고 정보 미입력
  const hasBasicInfo =
    user.submission?.브랜드명 && user.submission?.사업자등록증URL;
  const hasLogoInfo =
    user.submission?.로고선호스타일 || user.submission?.로고선호폰트;
  if (hasBasicInfo && !hasLogoInfo) {
    notifications.push({
      id: "logo-info",
      priority: 2,
      type: "warning",
      message: "로고 제작 정보를 입력해주세요",
      link: "/dashboard/submission#logo",
      badge: "필수",
    });
  }

  // 3. 시안 확인 요청
  // 로고: 시안컨펌요청, 인쇄물: 발주대기 (시안완료) 상태
  const designConfirmWorkflows = user.workflows.filter(
    (w) =>
      w.type !== "홈페이지" &&
      (w.status === "시안컨펌요청" || w.status === "발주대기"),
  );
  designConfirmWorkflows.forEach((workflow) => {
    notifications.push({
      id: `design-confirm-${workflow.id}`,
      priority: 1,
      type: "urgent",
      message: `${workflow.type} 시안을 확인해주세요!`,
      link: "/dashboard/workflows",
      badge: "시안확인",
    });
  });

  // 4. 인쇄물 type별 자료 입력 알림 (로고 확정 + 기본정보 입력 후)
  const logoConfirmed = user.workflows.some(
    (w) => w.type === "로고" && w.status === "시안확정",
  );

  // 4-1. 명함/대봉투: 명함시안 + 명함색상 (둘이 한 묶음, 한쪽 입력하면 양쪽 ✓)
  const hasNamecardOrEnvelope = user.workflows.some(
    (w) => w.type === "명함" || w.type === "대봉투",
  );
  const namecardComplete =
    !!user.submission?.명함시안 && !!user.submission?.명함색상;
  if (
    logoConfirmed &&
    hasBasicInfo &&
    hasNamecardOrEnvelope &&
    !namecardComplete
  ) {
    notifications.push({
      id: "namecard-envelope-info",
      priority: 2,
      type: "warning",
      message: "명함·대봉투 정보 입력이 필요합니다",
      link: "/dashboard/submission#namecard",
      badge: "자료입력",
    });
  }

  // 4-2. 자문계약서: 은행명 + 계좌번호 (필수). 워크플로우는 표지/내지 2종.
  const hasContract = user.workflows.some(
    (w) => w.type === "자문계약서 표지" || w.type === "자문계약서 내지",
  );
  const contractComplete =
    !!user.submission?.은행명 && !!user.submission?.계좌번호;
  if (logoConfirmed && hasBasicInfo && hasContract && !contractComplete) {
    notifications.push({
      id: "contract-info",
      priority: 2,
      type: "warning",
      message: "자문계약서 계좌 정보 입력이 필요합니다",
      link: "/dashboard/submission#contract",
      badge: "자료입력",
    });
  }
  // 4-3. 명찰: 프로필사진 필요 — 기본정보(BASIC_INFO_STEPS)에 이미 포함되어 있으므로 별도 알림 불필요

  // 5. 로고 확정 후 홈페이지 정보 입력
  const hasWebsiteInfo =
    user.submission?.홈페이지스타일 || user.submission?.홈페이지컬러컨셉;
  if (logoConfirmed && !hasWebsiteInfo) {
    notifications.push({
      id: "website-info",
      priority: 3,
      type: "info",
      message: "홈페이지 제작정보 선택이 필요합니다",
      link: "/dashboard/submission#website",
      badge: "자료입력",
    });
  }

  // 6. 마케팅 정보 입력 필요
  const hasMarketingInfo =
    user.submission?.네이버검색광고ID || user.submission?.InstagramID;
  if (hasBasicInfo && !hasMarketingInfo) {
    notifications.push({
      id: "marketing-info",
      priority: 3,
      type: "info",
      message: "마케팅 정보 입력이 필요합니다",
      link: "/dashboard/submission#marketing",
      badge: "자료입력",
    });
  }

  // 7. 배송 정보 확인
  const shippingWorkflows = user.workflows.filter((w) => w.status === "배송중");
  shippingWorkflows.forEach((workflow) => {
    notifications.push({
      id: `shipping-${workflow.id}`,
      priority: 3,
      type: "info",
      message: `${workflow.type} 배송 정보를 확인해주세요`,
      link: "/dashboard/workflows",
      badge: "배송확인",
    });
  });

  // 8. 관리자 답변 확인
  const unreadThreads = user.communicationThreads.filter((thread) => {
    const lastMessage = thread.messages[0];
    return (
      lastMessage &&
      lastMessage.authorId !== userId &&
      lastMessage.authorType === "admin"
    );
  });
  if (unreadThreads.length > 0) {
    notifications.push({
      id: "admin-reply",
      priority: 3,
      type: "info",
      message: `관리자 답변 ${unreadThreads.length}건을 확인해주세요`,
      link: "/dashboard/communication",
      badge: "답변확인",
    });
  }

  // 9. 마케팅 지원 연장 신청
  if (marketingEndDate) {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (marketingEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const hasPendingExtension = user.marketingExtensionRequests.some(
      (req) => req.status === "pending",
    );
    if (daysRemaining <= 7 && daysRemaining > 0 && !hasPendingExtension) {
      notifications.push({
        id: "marketing-extension",
        priority: 3,
        type: "warning",
        message: "마케팅 지원 연장 신청이 가능합니다",
        link: "/dashboard#marketing-extension",
        badge: "연장신청",
      });
    }
  }

  // 10. 제작 완료 확인
  const completedWorkflows = user.workflows.filter(
    (w) =>
      w.status === "제작완료" ||
      w.status === "발송완료" ||
      isHomepageCompleteStatus(w.type, w.status),
  );
  completedWorkflows.forEach((workflow) => {
    notifications.push({
      id: `completed-${workflow.id}`,
      priority: 4,
      type: "success",
      message: `${workflow.type} 제작이 완료되었습니다!`,
      link: "/dashboard/workflows",
      badge: "완료확인",
    });
  });

  // 11. 마케팅 연장 승인됨
  const approvedExtension = user.marketingExtensionRequests.find(
    (req) => req.status === "approved",
  );
  if (approvedExtension) {
    notifications.push({
      id: "extension-approved",
      priority: 3,
      type: "success",
      message: "마케팅 지원 연장이 승인되었습니다",
      link: "/dashboard",
      badge: "승인완료",
    });
  }

  // 12. 마케팅 연장 거절됨
  const rejectedExtension = user.marketingExtensionRequests.find(
    (req) => req.status === "rejected",
  );
  if (rejectedExtension) {
    notifications.push({
      id: "extension-rejected",
      priority: 3,
      type: "warning",
      message: "마케팅 지원 연장이 거절되었습니다",
      link: "/dashboard/status",
      badge: "확인필요",
    });
  }

  // 13. 새 공지사항
  if (unreadAnnouncements > 0) {
    notifications.push({
      id: "announcements",
      priority: 4,
      type: "info",
      message: `새 공지사항 ${unreadAnnouncements}건이 있습니다`,
      link: "/dashboard/announcements",
      badge: "공지",
    });
  }

  // 14. 인쇄물 주문 가능
  const orderableWorkflows = user.workflows.filter(
    (w) =>
      w.status === "시안확정" && w.type !== "로고" && w.type !== "홈페이지",
  );
  orderableWorkflows.forEach((workflow) => {
    notifications.push({
      id: `orderable-${workflow.id}`,
      priority: 3,
      type: "info",
      message: `${workflow.type} 주문이 가능합니다`,
      link: "/dashboard/workflows",
      badge: "주문가능",
    });
  });

  // 우선순위에 따라 정렬
  notifications.sort((a, b) => a.priority - b.priority);

  // === 와이어프레임 v4 시각화용 데이터 매핑 ===
  // 로고 상태 매핑
  const logoWorkflow = user.workflows.find((w) => w.type === "로고");
  const logoStatusKey: "idle" | "working" | "ready" = (() => {
    const s = logoWorkflow?.status ?? "대기";
    if (s === "시안중" || s === "시안제작중") return "working";
    if (
      s === "시안컨펌요청" ||
      s === "시안확정" ||
      s === "최종확정" ||
      s === "발주완료" ||
      s === "제작완료" ||
      s === "발송완료"
    )
      return "ready";
    return "idle";
  })();

  // 인쇄물 정보 (5종 인쇄물 자료에 필요한 필드)
  // 배송지 필수 정책은 최근 2개 기수부터 적용한다 (지난 기수는 진행률을 건드리지 않는다)
  const 배송지필수 = isShippingPolicyCohort(user.cohort?.교육시작일);

  const printFields = [
    user.submission?.브랜드명,
    user.submission?.사업자등록증URL,
    user.submission?.프로필사진URL,
    user.submission?.업종,
    user.submission?.주소,
    user.submission?.대표번호,
    user.submission?.이메일,
    ...(배송지필수 ? [user.submission?.인쇄물받을주소] : []),
    user.submission?.명함시안,
  ];
  const printFilled = printFields.filter(Boolean).length;
  const printTotal = printFields.length;
  const printPercent = Math.round((printFilled / printTotal) * 100);
  const printConnected = printPercent >= 100;

  // 홈페이지 정보
  const webFields = [
    user.submission?.브랜드명,
    user.submission?.업종,
    user.submission?.홈페이지스타일,
    user.submission?.홈페이지컬러컨셉,
    user.submission?.도메인주소,
    user.submission?.로고URL,
  ];
  const webFilled = webFields.filter(Boolean).length;
  const webTotal = webFields.length;
  const webPercent = Math.round((webFilled / webTotal) * 100);
  const webConnected = webPercent >= 100;

  // 광고 연결: 마케팅 정보 + 광고 활성화
  const adConnected = !!(
    user.submission?.네이버검색광고ID || user.submission?.InstagramID
  );

  // 카테고리별 카운트 (와이어프레임 To-do 분류)
  const todoCounts = {
    urgent: notifications.filter((n) => n.type === "urgent").length,
    confirm: notifications.filter((n) => n.type === "warning").length,
    waiting: notifications.filter((n) => n.type === "info").length,
    completed: notifications.filter((n) => n.type === "success").length,
  };

  // 전체 진행률 계산 (자료제출 30% + 워크플로우 진행 70% 가중)
  const workflowProgressMap: Record<string, number> = {
    대기: 0,
    시안중: 30,
    시안제작중: 30,
    시안컨펌요청: 55,
    시안확정: 70,
    발주요청: 75,
    발주대기: 75,
    발주완료: 85,
    제작완료: 92,
    "제작 진행 중": 60,
    "제작 완료": 95,
    발송완료: 100,
    최종확정: 100,
  };
  const wfPercents = user.workflows.map(
    (w) => workflowProgressMap[w.status] ?? 0,
  );
  const wfAvg =
    wfPercents.length > 0
      ? Math.round(wfPercents.reduce((a, b) => a + b, 0) / wfPercents.length)
      : 0;
  const overallProgress = Math.round(completionPercent * 0.3 + wfAvg * 0.7);

  // 자료 제출 마감 = 교육시작일 + 4주 (28일). 모든 기수 공통 정책.
  // 마감 후에는 추가 입력/진행 불가 → 관리자 별도 문의로 유도
  let submissionDeadline: Date | null = null;
  let submissionDaysRemaining: number | null = null;
  let submissionExpired = false;
  if (user.cohort?.교육시작일) {
    submissionDeadline = new Date(user.cohort.교육시작일);
    submissionDeadline.setDate(submissionDeadline.getDate() + 28);
    submissionDaysRemaining = Math.ceil(
      (submissionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    submissionExpired = submissionDaysRemaining <= 0;
  }

  // 마케팅 D-Day (Meta 광고 카드 통합용)
  let marketingDaysRemaining: number | null = null;
  if (marketingEndDate) {
    marketingDaysRemaining = Math.ceil(
      (marketingEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
  }

  return (
    <div className="space-y-4">
      {/* 진행 현황 헤더: 좌측 사용자 정보 + 우측 전체 진행률 */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full">
            <div className="text-[11px] text-gray-500 font-medium">
              {user.이름}님
            </div>
            <h1 className="text-base md:text-lg font-bold text-slate-900">
              스타트패키지 진행 현황
            </h1>
            {submissionDeadline && (
              <p
                className={`text-[11px] mt-0.5 font-medium ${
                  submissionExpired
                    ? "text-amber-700"
                    : submissionDaysRemaining !== null &&
                        submissionDaysRemaining <= 7
                      ? "text-amber-700"
                      : "text-gray-500"
                }`}
              >
                {submissionExpired ? (
                  <>
                    자료 제출 기간 종료 — 추가 진행은{" "}
                    <a
                      href="/dashboard/communication"
                      className="underline font-semibold"
                    >
                      관리자 문의
                    </a>
                  </>
                ) : (
                  <>
                    자료 제출 마감 D-{submissionDaysRemaining} (교육시작 + 4주)
                  </>
                )}
              </p>
            )}
          </div>
          {user.cohort && (
            <span className="text-xs text-gray-500 font-medium">
              {user.cohort.name}
            </span>
          )}
          {user.cohort && dday && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold-50 border border-gold-200 rounded-full text-xs font-semibold text-gold-700">
              <Calendar className="w-3 h-3" />
              마감 {dday}
            </span>
          )}
          {marketingEndDate &&
            (() => {
              const now = new Date();
              const daysRemaining = Math.ceil(
                (marketingEndDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              const isExpired = daysRemaining <= 0;
              const isUrgent = daysRemaining <= 7;
              return (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    isExpired
                      ? "bg-gray-50 border-gray-200 text-gray-500"
                      : isUrgent
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-gov-blue-50 border-gov-blue-100 text-gov-blue"
                  }`}
                >
                  <Megaphone className="w-3 h-3" />
                  마케팅 {isExpired ? "종료" : `D-${daysRemaining}`}
                </span>
              );
            })()}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[11px] text-gray-500 font-medium">전체 진행</div>
          <div className="text-2xl md:text-3xl font-bold text-gov-blue">
            {overallProgress}
            <span className="text-base md:text-lg">%</span>
          </div>
        </div>
      </div>

      {/* 메인 시각화: 로고 동력원 + 결과물 박스 (와이어프레임 v4) */}
      <ProgressVisualization
        logoStatus={logoStatusKey}
        printConnected={printConnected}
        webConnected={webConnected}
        adConnected={adConnected}
        printPercent={printPercent}
        webPercent={webPercent}
        printFilled={printFilled}
        printTotal={printTotal}
        webFilled={webFilled}
        webTotal={webTotal}
        submissionDaysRemaining={submissionDaysRemaining}
        marketingDaysRemaining={marketingDaysRemaining}
      />

      {/* 내가 처리해야 할 것 (To-do 패널) — 알림 클릭 시 위자드 모달 */}
      <DashboardAlertsClient
        notifications={notifications}
        todoCounts={todoCounts}
        submission={user.submission as Record<string, unknown> | null}
        representativeName={user.이름}
        accountEmail={user.email}
        shippingRequired={배송지필수}
      />

      {/* 인쇄물별 필요 정보 카드 — outcome 중심 (이걸 만들려면 이런 게 필요해요) */}
      <PrintDeliverableCards
        shippingRequired={배송지필수}
        submission={user.submission as Record<string, unknown> | null}
        workflows={user.workflows.map((w) => ({
          type: w.type,
          status: w.status,
        }))}
        representativeName={user.이름}
        accountEmail={user.email}
        basicMissing={
          !user.submission?.브랜드명 ||
          !user.submission?.사업자등록증URL ||
          !user.submission?.프로필사진URL
        }
      />

      {/* 제작요청 버튼 (자료 100% 입력 시 활성화) */}
      <div className="flex justify-end">
        <PrintRequestButton
          completionRate={completionPercent}
          hasWorkflows={user.workflows.length > 0}
        />
      </div>

      {/* Workflow Status — 2열 미니 그리드 */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
          <CardTitle className="text-sm md:text-base text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4" />
            제작 진행 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          {user.workflows.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 md:gap-2">
              {user.workflows.map((workflow) => {
                const isComplete =
                  workflow.status === "완료" ||
                  workflow.status === "최종확정" ||
                  workflow.status === "제작완료" ||
                  workflow.status === "발송완료" ||
                  isHomepageCompleteStatus(workflow.type, workflow.status);
                const isInProgress =
                  workflow.status === "진행중" ||
                  workflow.status === "시안중" ||
                  workflow.status === "시안제작중" ||
                  workflow.status === "시안컨펌요청" ||
                  workflow.status === "발주요청" ||
                  workflow.status === "발주대기" ||
                  workflow.status === "발주완료" ||
                  workflow.status === "제작완료" ||
                  workflow.status === "제작 진행 중" ||
                  workflow.status === "제작 완료" ||
                  workflow.status === "시안확정";

                return (
                  <div
                    key={workflow.id}
                    className="flex items-center gap-2 p-2 md:p-2.5 rounded border border-slate-200 bg-white"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isComplete
                          ? "bg-emerald-500"
                          : isInProgress
                            ? "bg-amber-500"
                            : "bg-slate-300"
                      }`}
                    />
                    <span className="text-xs md:text-sm font-medium text-slate-900 truncate">
                      {workflow.type}
                    </span>
                    <span
                      className={`ml-auto text-[10px] md:text-xs px-2 py-0.5 rounded border font-bold flex-shrink-0 ${
                        isComplete
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isInProgress
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">
                워크플로우가 아직 생성되지 않았습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Support — 아코디언 (기본 접힘) */}
      {marketingStartDate && marketingEndDate && (
        <details className="bg-white border border-gray-200 rounded-lg">
          <summary className="flex items-center gap-2 p-3 md:p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <Megaphone className="w-4 h-4 text-gov-blue" />
            <span className="text-sm md:text-base font-bold text-gray-900 flex-1">
              마케팅 지원 서비스
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {marketingSupportDurationLabel}
            </span>
            {(() => {
              const now = new Date();
              const daysRemaining = Math.ceil(
                (marketingEndDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${daysRemaining <= 0 ? "bg-gray-100 text-gray-500" : daysRemaining <= 7 ? "bg-amber-50 text-amber-700" : "bg-gov-blue-50 text-gov-blue"}`}
                >
                  {daysRemaining <= 0 ? "종료" : `D-${daysRemaining}`}
                </span>
              );
            })()}
            <span className="text-gray-400 text-xs">▼</span>
          </summary>
          <div className="p-3 md:p-4 pt-0 space-y-3">
            {/* 기간 인라인 */}
            <div className="flex gap-4 text-xs text-gray-600">
              <span>
                시작:{" "}
                <strong className="text-gray-900">
                  {marketingStartDate.toLocaleDateString("ko-KR")}
                </strong>
              </span>
              <span>
                종료:{" "}
                <strong className="text-gov-blue">
                  {marketingEndDate.toLocaleDateString("ko-KR")}
                </strong>
              </span>
            </div>

            {/* 지원 항목 - 컴팩트 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {[
                { icon: BarChart3, label: "Meta 광고" },
                { icon: Database, label: "잠재고객 접수" },
                { icon: Bell, label: "DB 알림" },
                { icon: MessageSquare, label: "SMS 발송" },
                { icon: Sheet, label: "DB 시트 저장" },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded bg-gray-50 border border-gray-200"
                  >
                    <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-700">{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* 연장 신청 */}
            {(() => {
              const now = new Date();
              const daysRemaining = Math.ceil(
                (marketingEndDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              const hasPendingRequest = user.marketingExtensionRequests.some(
                (req) => req.status === "pending",
              );

              if (hasPendingRequest) {
                return (
                  <div className="flex items-center gap-2 p-2 bg-gold-50 border border-gold-200 rounded-lg text-xs text-gold-700">
                    <Clock className="w-3.5 h-3.5" />
                    연장 신청 검토 중
                  </div>
                );
              }

              return (
                <div className="flex items-center justify-between p-2 bg-gov-blue-50 rounded border border-gov-blue-100">
                  <div className="text-xs">
                    <span className="text-gray-600">남은 기간: </span>
                    <span
                      className={`font-bold ${daysRemaining <= 7 ? "text-amber-600" : "text-gov-blue"}`}
                    >
                      {daysRemaining > 0 ? `${daysRemaining}일` : "종료됨"}
                    </span>
                  </div>
                  <MarketingExtensionDialog currentEndDate={marketingEndDate} />
                </div>
              );
            })()}
          </div>
        </details>
      )}
    </div>
  );
}
