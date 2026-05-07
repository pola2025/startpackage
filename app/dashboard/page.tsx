import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDday } from "@/lib/utils";
import PrintRequestButton from "./print-request-button";
import MarketingExtensionDialog from "./marketing-extension-dialog";
import { ensureUserWorkflows } from "@/lib/ensureUserWorkflows";
import { FloatingActionButton } from "@/components/ui/floating-action-button";

// Temporary Progress component
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ""}`}
    >
      <div
        className="h-full bg-navy-700 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
import {
  Calendar,
  Clock,
  FileText,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Globe,
  Megaphone,
  TrendingUp,
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

  // 마케팅 지원 기간 계산 (교육시작일 기준)
  let marketingStartDate: Date | null = null;
  let marketingEndDate: Date | null = null;

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
    marketingEndDate = new Date(user.cohort.교육시작일);
    marketingEndDate.setMonth(marketingEndDate.getMonth() + 3);
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
    (w) => w.status === "시안컨펌요청" || w.status === "발주대기",
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

  // 4. 로고 확정 후 인쇄물 자료 제출 요청
  const logoConfirmed = user.workflows.some(
    (w) => w.type === "로고" && w.status === "시안확정",
  );
  const hasPrintWorkflows = user.workflows.some(
    (w) => w.type !== "로고" && w.type !== "홈페이지",
  );
  if (logoConfirmed && !hasPrintWorkflows && hasBasicInfo) {
    notifications.push({
      id: "print-submit",
      priority: 2,
      type: "warning",
      message: "인쇄물 자료 제출 바랍니다",
      link: "/dashboard/submission#namecard",
      badge: "자료제출",
    });
  }

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
    (w) => w.status === "제작완료" || w.status === "발송완료",
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

  return (
    <div className="space-y-4">
      {/* 진행 현황 헤더: 좌측 사용자 정보 + 우측 전체 진행률 */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full">
            <div className="text-[11px] text-gray-500 font-medium">
              {user.이름}님
            </div>
            <h1 className="text-base md:text-lg font-bold text-navy-900">
              스타트패키지 진행 현황
            </h1>
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
                        ? "bg-terra-50 border-terra-100 text-terra-600"
                        : "bg-navy-50 border-navy-200 text-navy-600"
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
          <div className="text-2xl md:text-3xl font-bold text-navy-700">
            {overallProgress}
            <span className="text-base md:text-lg">%</span>
          </div>
        </div>
      </div>

      {/* 마케팅 지원 임박/만료 강조 배너 (D-7 이하 또는 종료) */}
      {marketingEndDate &&
        (() => {
          const daysRemaining = Math.ceil(
            (marketingEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          if (daysRemaining > 7) return null;
          const isExpired = daysRemaining <= 0;
          return (
            <div
              className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border-2 ${
                isExpired
                  ? "bg-gray-50 border-gray-300"
                  : "bg-terra-50 border-terra-200"
              }`}
            >
              <Megaphone
                className={`w-5 h-5 flex-shrink-0 ${
                  isExpired ? "text-gray-500" : "text-terra-600"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-bold ${
                    isExpired ? "text-gray-700" : "text-terra-700"
                  }`}
                >
                  {isExpired
                    ? "마케팅 지원 기간이 종료되었습니다"
                    : `마케팅 지원 종료까지 ${daysRemaining}일 남았습니다`}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {isExpired
                    ? "지속적인 광고 운영을 위해 연장을 신청해주세요."
                    : "지원 종료 전 연장을 신청하시면 운영이 중단되지 않습니다."}
                </div>
              </div>
              <MarketingExtensionDialog currentEndDate={marketingEndDate} />
            </div>
          );
        })()}

      {/* 인라인 제출률 */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg">
        <FileText className="w-4 h-4 text-navy-700 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700">자료 제출</span>
        <span className="text-sm font-bold text-navy-700">
          {completionPercent}%
        </span>
        <Progress value={completionPercent} className="flex-1 h-1.5" />
        <span className="text-xs text-gray-500">
          {completedFields}/{totalFields}
        </span>
      </div>

      {/* 내가 처리해야 할 것 (To-do 패널) */}
      {notifications.length > 0 && (
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
              {notifications.map((notification) => {
                const colors = {
                  urgent: "text-terra-600 hover:bg-terra-50 border-terra-100",
                  warning: "text-terra-500 hover:bg-terra-50 border-terra-100",
                  info: "text-navy-600 hover:bg-navy-50 border-navy-200",
                  success: "text-ok-700 hover:bg-ok-50 border-ok-100",
                };

                const badgeColors = {
                  urgent: "bg-terra-50 text-terra-600 border-terra-100",
                  warning: "bg-terra-50 text-terra-500 border-terra-100",
                  info: "bg-navy-50 text-navy-600 border-navy-200",
                  success: "bg-ok-50 text-ok-700 border-ok-100",
                };

                return (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    className={`flex items-center gap-2 p-2 md:p-2.5 rounded-lg border bg-white ${colors[notification.type]} transition-all cursor-pointer group`}
                  >
                    <span
                      className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${badgeColors[notification.type]}`}
                    >
                      {notification.badge}
                    </span>
                    <span className="flex-1 text-xs md:text-sm font-medium line-clamp-1">
                      {notification.message}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 자료 제출 현황 */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base text-gray-900 font-bold">
              자료 제출 현황
            </CardTitle>
            <PrintRequestButton
              completionRate={completionPercent}
              hasWorkflows={user.workflows.length > 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-1">
          {user.submission ? (
            <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-1.5 md:gap-2">
              {[
                {
                  label: "사업자등록증",
                  shortLabel: "사업자",
                  value: user.submission.사업자등록증URL,
                  tab: "print",
                  icon: FileText,
                },
                {
                  label: "프로필사진",
                  shortLabel: "프로필",
                  value: user.submission.프로필사진URL,
                  tab: "print",
                  icon: User,
                },
                {
                  label: "브랜드명",
                  shortLabel: "브랜드",
                  value: user.submission.브랜드명,
                  tab: "basic",
                  icon: Package,
                },
                {
                  label: "업종",
                  shortLabel: "업종",
                  value: user.submission.업종,
                  tab: "basic",
                  icon: Package,
                },
                {
                  label: "주소",
                  shortLabel: "주소",
                  value: user.submission.주소,
                  tab: "basic",
                  icon: Package,
                },
                {
                  label: "명함스타일 선택",
                  shortLabel: "명함",
                  value: user.submission.명함시안,
                  tab: "print",
                  icon: FileText,
                },
                {
                  label: "홈페이지 컬러",
                  shortLabel: "홈페이지",
                  value: user.submission.홈페이지컬러컨셉,
                  tab: "website",
                  icon: Globe,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                const sharedClassName = `group flex flex-col items-center p-1.5 md:p-2 rounded-lg ${
                  item.value
                    ? "bg-white border border-gray-200"
                    : "bg-gray-50 border border-gray-200 hover:bg-navy-50 hover:border-navy-200 cursor-pointer"
                } transition-all`;

                const content = (
                  <>
                    <div
                      className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-lg mb-1 ${
                        item.value
                          ? "bg-navy-800"
                          : "bg-navy-300 group-hover:bg-navy-900"
                      } transition-colors`}
                    >
                      <Icon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    <p className="text-[9px] md:text-xs font-semibold text-gray-900 text-center line-clamp-1">
                      {item.shortLabel}
                    </p>
                    {item.value ? (
                      <CheckCircle2 className="w-3 h-3 text-ok-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-terra-500 mt-0.5" />
                    )}
                  </>
                );

                return item.value ? (
                  <div
                    key={idx}
                    className={sharedClassName}
                    style={{ opacity: 0.55 }}
                  >
                    {content}
                  </div>
                ) : (
                  <Link
                    key={idx}
                    href={`/dashboard/submission?tab=${item.tab}`}
                    className={sharedClassName}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link href="/dashboard/submission?tab=basic" className="block">
              <div className="text-center py-6 px-4 bg-white rounded-lg border border-gray-200 hover:border-gold-400 transition-all cursor-pointer group">
                <AlertCircle className="w-8 h-8 text-navy-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  자료를 아직 제출하지 않으셨어요
                </p>
                <p className="text-xs text-gold-600 font-medium">
                  클릭하여 지금 제출하기 →
                </p>
              </div>
            </Link>
          )}
        </CardContent>
      </Card>

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
                const statusColor =
                  workflow.status === "완료"
                    ? "ok-600"
                    : workflow.status === "진행중"
                      ? "navy-600"
                      : "navy-300";

                return (
                  <div
                    key={workflow.id}
                    className="flex items-center gap-2 p-2 md:p-2.5 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <div
                      className={`w-2 h-2 rounded-full bg-${statusColor} flex-shrink-0`}
                    />
                    <span className="text-xs md:text-sm font-medium text-gray-900 truncate">
                      {workflow.type}
                    </span>
                    <Badge
                      variant="outline"
                      className={`ml-auto text-[10px] md:text-xs px-1.5 py-0 border-${statusColor === "ok-600" ? "ok-100" : statusColor === "navy-600" ? "navy-200" : "gray-200"} text-${statusColor} flex-shrink-0`}
                    >
                      {workflow.status}
                    </Badge>
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
            <Megaphone className="w-4 h-4 text-navy-600" />
            <span className="text-sm md:text-base font-bold text-gray-900 flex-1">
              마케팅 지원 서비스
            </span>
            {(() => {
              const now = new Date();
              const daysRemaining = Math.ceil(
                (marketingEndDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${daysRemaining <= 0 ? "bg-gray-100 text-gray-500" : daysRemaining <= 7 ? "bg-terra-50 text-terra-600" : "bg-navy-50 text-navy-600"}`}
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
                <strong className="text-navy-700">
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
                <div className="flex items-center justify-between p-2 bg-navy-50 rounded-lg border border-navy-200">
                  <div className="text-xs">
                    <span className="text-gray-600">남은 기간: </span>
                    <span
                      className={`font-bold ${daysRemaining <= 7 ? "text-terra-500" : "text-navy-600"}`}
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

      {/* 모바일 플로팅 액션 버튼 - 자료 제출 바로가기 */}
      <FloatingActionButton href="/dashboard/submission" />
    </div>
  );
}
