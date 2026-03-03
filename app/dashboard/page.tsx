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
        className="h-full bg-gold-500 transition-all"
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Header with D-Day */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
            안녕하세요, {user.이름}님
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            스타트패키지 진행 현황을 한눈에 확인하세요
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {user.cohort && dday && (
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-gold-100 to-gold-50 rounded-2xl border-2 border-gold-200 px-6 py-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                <Calendar className="w-6 h-6 text-gold-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gold-700 mb-0.5">
                  자료 제출 마감일
                </p>
                <p className="text-3xl font-bold text-gold-600">{dday}</p>
                <p className="text-xs text-gold-600 mt-1">
                  {new Date(user.cohort.자료제출마감일).toLocaleDateString(
                    "ko-KR",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    },
                  )}
                </p>
              </div>
            </div>
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
              const isWarning = daysRemaining <= 30;

              return (
                <div
                  className={`inline-flex items-center gap-3 rounded-2xl border-2 px-6 py-4 ${
                    isExpired
                      ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300"
                      : isUrgent
                        ? "bg-gradient-to-r from-terra-50 to-terra-50 border-terra-100"
                        : isWarning
                          ? "bg-gradient-to-r from-terra-50 to-terra-50 border-terra-100"
                          : "bg-gradient-to-r from-navy-50 to-gold-50 border-navy-200"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm`}
                  >
                    <Megaphone
                      className={`w-6 h-6 ${
                        isExpired
                          ? "text-gray-600"
                          : isUrgent
                            ? "text-terra-500"
                            : isWarning
                              ? "text-terra-500"
                              : "text-navy-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium mb-0.5 ${
                        isExpired
                          ? "text-gray-700"
                          : isUrgent
                            ? "text-terra-600"
                            : isWarning
                              ? "text-terra-600"
                              : "text-navy-700"
                      }`}
                    >
                      마케팅 지원 종료일
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        isExpired
                          ? "text-gray-600"
                          : isUrgent
                            ? "text-terra-500"
                            : isWarning
                              ? "text-terra-500"
                              : "text-navy-600"
                      }`}
                    >
                      {isExpired ? "종료됨" : `D-${daysRemaining}`}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isExpired
                          ? "text-gray-600"
                          : isUrgent
                            ? "text-terra-500"
                            : isWarning
                              ? "text-terra-500"
                              : "text-navy-600"
                      }`}
                    >
                      {marketingEndDate.toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                    {/* 연장 신청 버튼 */}
                    {!isExpired &&
                      daysRemaining <= 30 &&
                      daysRemaining > 0 &&
                      (() => {
                        const hasPendingExtension =
                          user.marketingExtensionRequests.some(
                            (req) => req.status === "pending",
                          );
                        if (
                          !hasPendingExtension &&
                          marketingStartDate &&
                          marketingEndDate
                        ) {
                          return (
                            <div className="mt-3">
                              <MarketingExtensionDialog
                                currentEndDate={marketingEndDate}
                              />
                            </div>
                          );
                        }
                      })()}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* 알림 리스트 - 모바일/데스크탑 모두 세로 리스트 */}
      {notifications.length > 0 && (
        <Card className="bg-gradient-to-r from-gold-50 to-gold-100 border-2 border-gold-200">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
            <CardTitle className="text-base md:text-xl text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-gold-600" />
              알림
              <span className="text-xs md:text-sm font-normal text-gray-500 ml-auto">
                {notifications.length}건
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="space-y-1.5 md:space-y-2">
              {notifications.map((notification, index) => {
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
                    className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-4 rounded-lg border bg-white ${colors[notification.type]} transition-all cursor-pointer group`}
                  >
                    <span className="hidden md:inline text-sm md:text-base font-semibold text-gray-600 min-w-[60px]">
                      알림{index + 1}.
                    </span>
                    <span
                      className={`text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded border whitespace-nowrap ${badgeColors[notification.type]}`}
                    >
                      {notification.badge}
                    </span>
                    <span className="flex-1 text-xs md:text-base font-medium line-clamp-1">
                      {notification.message}
                    </span>
                    <MessageSquare className="w-3 h-3 md:w-4 md:h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Info Card */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />내 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gold-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">이름</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">
                  {user.이름}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-ok-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-ok-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">기수</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">
                  {user.cohort?.name || "미지정"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-terra-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-terra-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">연락처</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">
                  {user.연락처}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">이메일</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats - 주요 지표 */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* 자료 제출 완료율 */}
        <Card className="bg-gradient-to-br from-gold-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-navy-900 rounded-2xl shadow-md">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  자료 제출
                </p>
                <p className="text-4xl sm:text-5xl font-bold text-gold-600">
                  {completionPercent}
                  <span className="text-2xl">%</span>
                </p>
              </div>
            </div>
            <Progress value={completionPercent} className="h-3 mb-3" />
            <p className="text-sm text-gray-600">
              {completedFields}개 완료 / 전체 {totalFields}개
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Status - 모바일 3열 그리드 */}
      <Card className="bg-white border-0 shadow-lg">
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-2">
              <CardTitle className="text-lg md:text-2xl lg:text-3xl text-gray-900 font-bold tracking-tight">
                자료 제출 현황
              </CardTitle>
              <CardDescription className="text-xs md:text-base text-gray-600">
                {completionPercent === 100
                  ? "모든 자료가 제출되었습니다!"
                  : "필수 자료를 제출하여 진행을 완료하세요"}
              </CardDescription>
            </div>
            <PrintRequestButton
              completionRate={completionPercent}
              hasWorkflows={user.workflows.length > 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-2">
          {user.submission ? (
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
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
                const sharedClassName = `group relative flex flex-col items-center p-2 md:p-4 rounded-lg md:rounded-xl bg-gradient-to-br ${
                  item.value
                    ? "from-white to-white border border-gray-200 md:border-2"
                    : "from-gray-50 to-gray-100 border border-gray-200 md:border-2 hover:from-navy-50 hover:to-navy-50 hover:border-navy-200 cursor-pointer"
                } transition-all duration-200 ${!item.value ? "hover:shadow-md" : ""}`;

                const progressRing = item.value ? (
                  <svg
                    className="absolute top-1 right-1 md:top-2 md:right-2 w-6 h-6 md:w-8 md:h-8"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeDasharray="97.39"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                    <text
                      x="18"
                      y="20"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#374151"
                      fontWeight="bold"
                    >
                      ✓
                    </text>
                  </svg>
                ) : (
                  <svg
                    className="absolute top-1 right-1 md:top-2 md:right-2 w-6 h-6 md:w-8 md:h-8"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#b85e52"
                      strokeWidth="3"
                      strokeDasharray="97.39"
                      strokeDashoffset="73.05"
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                );

                const content = (
                  <>
                    {progressRing}
                    <div
                      className={`flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl mb-1.5 md:mb-3 ${
                        item.value
                          ? "bg-navy-800"
                          : "bg-navy-300 group-hover:bg-navy-900"
                      } transition-colors`}
                    >
                      <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    <p className="text-[10px] md:text-sm font-semibold text-gray-900 text-center mb-0.5 md:mb-1 line-clamp-1">
                      <span className="md:hidden">{item.shortLabel}</span>
                      <span className="hidden md:inline">{item.label}</span>
                    </p>
                    {item.value ? (
                      <div className="flex items-center gap-0.5 md:gap-1.5 text-ok-600">
                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="text-[9px] md:text-xs font-medium">
                          완료
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 md:gap-1.5 text-terra-500 group-hover:text-navy-600">
                        <AlertCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="text-[9px] md:text-xs font-medium">
                          필요
                        </span>
                      </div>
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
              <div className="text-center py-8 md:py-12 px-4 md:px-6 bg-gradient-to-br from-gold-50 to-indigo-50 rounded-xl md:rounded-2xl border-2 border-gold-200 hover:border-gold-400 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-center w-14 h-14 md:w-20 md:h-20 bg-navy-900 rounded-full mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-7 h-7 md:w-10 md:h-10 text-white" />
                </div>
                <p className="text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                  자료를 아직 제출하지 않으셨어요
                </p>
                <p className="text-xs md:text-base text-gold-600 font-medium">
                  클릭하여 지금 제출하기 →
                </p>
              </div>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Workflow Status */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            제작 진행 현황
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-gray-600">
            명찰, 명함, 대봉투, 자문계약서 제작 상태
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.workflows.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {user.workflows.map((workflow) => {
                const statusColor =
                  workflow.status === "완료"
                    ? "ok-600"
                    : workflow.status === "진행중"
                      ? "navy-600"
                      : "navy-300";

                const statusBorderColor =
                  workflow.status === "완료"
                    ? "border-ok-600"
                    : workflow.status === "진행중"
                      ? "border-navy-600"
                      : "border-navy-300";

                return (
                  <div
                    key={workflow.id}
                    className="p-3 sm:p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-gold-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div
                          className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-${statusColor} flex-shrink-0`}
                        />
                        <h3 className="font-medium text-gray-900 text-sm sm:text-lg">
                          {workflow.type}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${statusBorderColor} text-${statusColor} text-xs flex-shrink-0`}
                      >
                        {workflow.status}
                      </Badge>
                    </div>

                    <div className="grid gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      {workflow.시안업로드일 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">
                            시안 업로드: {formatDate(workflow.시안업로드일)}
                          </span>
                        </div>
                      )}
                      {workflow.발주승인일 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">
                            발주 승인: {formatDate(workflow.발주승인일)}
                          </span>
                        </div>
                      )}
                      {workflow.택배회사 && workflow.운송장번호 && (
                        <div className="flex items-center gap-2 text-gold-600">
                          <Truck className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">
                            배송: {workflow.택배회사} ({workflow.운송장번호})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm sm:text-base text-gray-500">
                워크플로우가 아직 생성되지 않았습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Support Detail Card */}
      {marketingStartDate && marketingEndDate && (
        <Card className="bg-gradient-to-br from-navy-50 to-gold-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-navy-600" />
              마케팅 지원 서비스
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              교육 기간 동안 제공되는 마케팅 지원 항목 및 기간 관리
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 지원 기간 */}
            <div className="bg-white p-5 rounded-xl border-2 border-navy-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-navy-600" />
                지원 기간
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-600 mb-1">
                    시작일 (교육시작일)
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    {marketingStartDate.toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">종료일</p>
                  <p className="text-base font-bold text-navy-700">
                    {marketingEndDate.toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
            </div>

            {/* 지원 항목 */}
            <div className="bg-white p-5 rounded-xl border-2 border-navy-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-navy-600" />
                지원 항목
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: BarChart3,
                    label: "Meta 광고 게재 지원",
                    iconBg: "bg-gold-100",
                    iconColor: "text-gold-600",
                  },
                  {
                    icon: Database,
                    label: "잠재고객 접수 자동화",
                    iconBg: "bg-ok-100",
                    iconColor: "text-ok-600",
                  },
                  {
                    icon: Bell,
                    label: "실시간 DB 접수 알림",
                    iconBg: "bg-terra-100",
                    iconColor: "text-terra-500",
                  },
                  {
                    icon: MessageSquare,
                    label: "고객 안내 SMS 발송",
                    iconBg: "bg-navy-100",
                    iconColor: "text-navy-600",
                  },
                  {
                    icon: Sheet,
                    label: "고객 DB 시트 저장",
                    iconBg: "bg-navy-100",
                    iconColor: "text-navy-600",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200"
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg ${item.iconBg} flex-shrink-0`}
                      >
                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
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

              // Calculate new end date (current + 3 months)
              const newEndDate = new Date(marketingEndDate);
              newEndDate.setMonth(newEndDate.getMonth() + 3);

              return (
                <div className="bg-white p-5 rounded-xl border-2 border-navy-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-navy-600" />
                    기간 연장
                  </h3>

                  {hasPendingRequest ? (
                    <div className="bg-gold-50 p-4 rounded-lg border-2 border-gold-200">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-navy-900 mb-1">
                            연장 신청 검토 중
                          </p>
                          <p className="text-xs text-navy-800">
                            관리자가 검토 중입니다. 승인 시 알림을 보내드립니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 bg-navy-50 rounded-lg border border-navy-200">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">
                            현재 남은 기간
                          </p>
                          <p
                            className={`text-2xl font-bold ${daysRemaining <= 7 ? "text-terra-500" : daysRemaining <= 30 ? "text-terra-500" : "text-navy-600"}`}
                          >
                            {daysRemaining > 0
                              ? `${daysRemaining}일`
                              : "종료됨"}
                          </p>
                        </div>
                        <MarketingExtensionDialog
                          currentEndDate={marketingEndDate}
                        />
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="font-medium text-gray-900 mb-1">
                          연장 안내
                        </p>
                        <p>
                          3/6/12개월 단위로 연장이 가능하며, 장기 결제 시 할인
                          혜택이 적용됩니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* 모바일 플로팅 액션 버튼 - 자료 제출 바로가기 */}
      <FloatingActionButton href="/dashboard/submission" />
    </div>
  );
}
