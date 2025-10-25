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

// Temporary Progress component
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ""}`}>
      <div
        className="h-full bg-blue-600 transition-all"
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
        where: {
          status: "pending",
        },
        orderBy: {
          requestDate: "desc",
        },
        take: 1,
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

  // Workflow stats (인쇄물만 카운트, 로고와 홈페이지 제외)
  const printWorkflows = user.workflows.filter(
    (w) => w.type !== "로고" && w.type !== "홈페이지"
  );
  const completedWorkflows = printWorkflows.filter(
    (w) => w.status === "발송완료" || w.status === "제작완료"
  ).length;
  const totalWorkflows = printWorkflows.length;

  // 마케팅 지원 기간 계산 (교육시작일 기준)
  let marketingStartDate: Date | null = null;
  let marketingEndDate: Date | null = null;

  if (user.marketingSupportEnabled && user.marketingSupportStartDate && user.marketingSupportEndDate) {
    // DB에 설정된 값이 있으면 사용 (연장된 경우)
    marketingStartDate = new Date(user.marketingSupportStartDate);
    marketingEndDate = new Date(user.marketingSupportEndDate);
  } else if (user.cohort?.교육시작일) {
    // 교육시작일 기준으로 자동 계산
    marketingStartDate = new Date(user.cohort.교육시작일);
    marketingEndDate = new Date(user.cohort.교육시작일);
    marketingEndDate.setMonth(marketingEndDate.getMonth() + 3);
  }

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
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 px-6 py-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700 mb-0.5">자료 제출 마감일</p>
                <p className="text-3xl font-bold text-orange-600">{dday}</p>
              </div>
            </div>
          )}
          {marketingEndDate && (() => {
            const now = new Date();
            const daysRemaining = Math.ceil((marketingEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining <= 0;
            const isUrgent = daysRemaining <= 7;
            const isWarning = daysRemaining <= 30;

            return (
              <div className={`inline-flex items-center gap-3 rounded-2xl border-2 px-6 py-4 ${
                isExpired
                  ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300"
                  : isUrgent
                  ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                  : isWarning
                  ? "bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200"
                  : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
              }`}>
                <div className={`flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm`}>
                  <Megaphone className={`w-6 h-6 ${
                    isExpired ? "text-gray-600" : isUrgent ? "text-red-600" : isWarning ? "text-orange-600" : "text-purple-600"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-medium mb-0.5 ${
                    isExpired ? "text-gray-700" : isUrgent ? "text-red-700" : isWarning ? "text-orange-700" : "text-purple-700"
                  }`}>
                    마케팅 지원 종료일
                  </p>
                  <p className={`text-3xl font-bold ${
                    isExpired ? "text-gray-600" : isUrgent ? "text-red-600" : isWarning ? "text-orange-600" : "text-purple-600"
                  }`}>
                    {isExpired ? "종료됨" : `D-${daysRemaining}`}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* User Info Card */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            내 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">이름</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">{user.이름}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">연락처</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">{user.연락처}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">이메일</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats - 주요 지표 */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* 자료 제출 완료율 */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-md">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">자료 제출</p>
                <p className="text-4xl sm:text-5xl font-bold text-blue-600">
                  {completionPercent}<span className="text-2xl">%</span>
                </p>
              </div>
            </div>
            <Progress value={completionPercent} className="h-3 mb-3" />
            <p className="text-sm text-gray-600">
              {completedFields}개 완료 / 전체 {totalFields}개
            </p>
          </CardContent>
        </Card>

        {/* 제작 진행률 */}
        <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl shadow-md">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">제작 진행</p>
                <p className="text-4xl sm:text-5xl font-bold text-green-700">
                  {totalWorkflows > 0
                    ? Math.round((completedWorkflows / totalWorkflows) * 100)
                    : 0}
                  <span className="text-2xl">%</span>
                </p>
              </div>
            </div>
            <Progress
              value={
                totalWorkflows > 0
                  ? (completedWorkflows / totalWorkflows) * 100
                  : 0
              }
              className="h-3 mb-3"
            />
            <p className="text-sm text-gray-600">
              {completedWorkflows}개 완료 / 전체 {totalWorkflows}개
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Status - 깔끔하고 직관적인 디자인 */}
      <Card className="bg-white border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl text-gray-900 font-bold tracking-tight">
                자료 제출 현황
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {completionPercent === 100
                  ? "모든 자료가 제출되었습니다! 🎉"
                  : "필수 자료를 제출하여 진행을 완료하세요"}
              </CardDescription>
            </div>
            <PrintRequestButton
              completionRate={completionPercent}
              hasWorkflows={user.workflows.length > 0}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {user.submission ? (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  label: "사업자등록증",
                  value: user.submission.사업자등록증URL,
                  tab: "basic",
                  icon: FileText
                },
                { label: "프로필사진", value: user.submission.프로필사진URL, tab: "basic", icon: User },
                { label: "브랜드명", value: user.submission.브랜드명, tab: "basic", icon: Package },
                { label: "업종", value: user.submission.업종, tab: "basic", icon: Package },
                { label: "주소", value: user.submission.주소, tab: "basic", icon: Package },
                { label: "명함스타일 선택", value: user.submission.명함시안, tab: "namecard", icon: FileText },
                {
                  label: "홈페이지 컬러",
                  value: user.submission.홈페이지컬러컨셉,
                  tab: "website",
                  icon: Globe
                },
              ].map((item, idx) => {
                const ItemWrapper = item.value ? "div" : Link;
                const wrapperProps = item.value ? {} : { href: `/dashboard/submission?tab=${item.tab}` };
                const Icon = item.icon;

                return (
                  <ItemWrapper
                    key={idx}
                    {...wrapperProps}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br ${
                      item.value
                        ? "from-green-50 to-emerald-50 border-2 border-green-200"
                        : "from-gray-50 to-gray-100 border-2 border-gray-200 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 cursor-pointer"
                    } transition-all duration-200 ${!item.value ? "hover:shadow-md" : ""}`}
                  >
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                      item.value ? "bg-green-600" : "bg-gray-400 group-hover:bg-blue-600"
                    } transition-colors`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate mb-1">{item.label}</p>
                      {item.value ? (
                        <div className="flex items-center gap-1.5 text-green-700">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-medium">제출 완료</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-orange-600 group-hover:text-blue-600">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-medium">제출 필요</span>
                        </div>
                      )}
                    </div>
                  </ItemWrapper>
                );
              })}
            </div>
          ) : (
            <Link href="/dashboard/submission?tab=basic" className="block">
              <div className="text-center py-12 px-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">자료를 아직 제출하지 않으셨어요</p>
                <p className="text-blue-600 font-medium">클릭하여 지금 제출하기 →</p>
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
                    ? "green-600"
                    : workflow.status === "진행중"
                      ? "orange-600"
                      : "gray-400";

                const statusBorderColor =
                  workflow.status === "완료"
                    ? "border-green-500"
                    : workflow.status === "진행중"
                      ? "border-orange-500"
                      : "border-gray-400";

                return (
                  <div
                    key={workflow.id}
                    className="p-3 sm:p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 transition-all"
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
                          <span className="truncate">시안 업로드: {formatDate(workflow.시안업로드일)}</span>
                        </div>
                      )}
                      {workflow.발주승인일 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">발주 승인: {formatDate(workflow.발주승인일)}</span>
                        </div>
                      )}
                      {workflow.택배회사 && workflow.운송장번호 && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Truck className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">배송: {workflow.택배회사} ({workflow.운송장번호})</span>
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
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              마케팅 지원 서비스
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              교육 기간 동안 제공되는 마케팅 지원 항목 및 기간 관리
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 지원 기간 */}
            <div className="bg-white p-5 rounded-xl border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                지원 기간
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-600 mb-1">시작일 (교육시작일)</p>
                  <p className="text-base font-bold text-gray-900">
                    {marketingStartDate.toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">종료일</p>
                  <p className="text-base font-bold text-purple-700">
                    {marketingEndDate.toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
            </div>

            {/* 지원 항목 */}
            <div className="bg-white p-5 rounded-xl border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                지원 항목
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: BarChart3, label: "Meta 광고 게재 지원", color: "blue" },
                  { icon: Database, label: "잠재고객 접수 자동화", color: "green" },
                  { icon: Bell, label: "실시간 DB 접수 알림", color: "orange" },
                  { icon: MessageSquare, label: "고객 안내 SMS 발송", color: "purple" },
                  { icon: Sheet, label: "구글 스프레드시트 저장", color: "teal" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200"
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-${item.color}-100 flex-shrink-0`}>
                        <Icon className={`w-5 h-5 text-${item.color}-600`} />
                      </div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 연장 신청 */}
            {(() => {
              const now = new Date();
              const daysRemaining = Math.ceil((marketingEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const hasPendingRequest = user.marketingExtensionRequests && user.marketingExtensionRequests.length > 0;

              // Calculate new end date (current + 3 months)
              const newEndDate = new Date(marketingEndDate);
              newEndDate.setMonth(newEndDate.getMonth() + 3);

              return (
                <div className="bg-white p-5 rounded-xl border-2 border-purple-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    기간 연장
                  </h3>

                  {hasPendingRequest ? (
                    <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-yellow-900 mb-1">
                            연장 신청 검토 중
                          </p>
                          <p className="text-xs text-yellow-800">
                            관리자가 검토 중입니다. 승인 시 알림을 보내드립니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">현재 남은 기간</p>
                          <p className={`text-2xl font-bold ${daysRemaining <= 7 ? "text-red-600" : daysRemaining <= 30 ? "text-orange-600" : "text-purple-600"}`}>
                            {daysRemaining > 0 ? `${daysRemaining}일` : "종료됨"}
                          </p>
                        </div>
                        <MarketingExtensionDialog
                          currentEndDate={marketingEndDate}
                          newEndDate={newEndDate}
                        />
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="font-medium text-gray-900 mb-1">연장 안내</p>
                        <p>3개월 단위로 연장이 가능하며, 승인 후 결제 정보를 안내드립니다.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
