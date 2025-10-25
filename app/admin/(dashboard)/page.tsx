import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Workflow,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Bell,
  Package,
} from "lucide-react";

// Temporary Progress component
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ""}`}>
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

async function getDashboardStats() {
  const [totalUsers, activeCohorts, workflows, notifications] =
    await Promise.all([
      prisma.user.count(),
      prisma.cohort.count({ where: { isActive: true } }),
      prisma.workflow.findMany({
        include: {
          user: {
            select: {
              이름: true,
              cohort: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

  const workflowStats = await prisma.workflow.groupBy({
    by: ["status"],
    _count: true,
  });

  return {
    totalUsers,
    activeCohorts,
    recentWorkflows: workflows,
    notifications,
    workflowStats,
  };
}

export default async function AdminDashboard() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const stats = await getDashboardStats();

  const statusCounts = {
    대기: 0,
    진행중: 0,
    완료: 0,
  };

  stats.workflowStats.forEach((stat) => {
    if (stat.status in statusCounts) {
      statusCounts[stat.status as keyof typeof statusCounts] = stat._count;
    }
  });

  const totalWorkflows = statusCounts.대기 + statusCounts.진행중 + statusCounts.완료;
  const completionRate = totalWorkflows > 0
    ? Math.round((statusCounts.완료 / totalWorkflows) * 100)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          관리자 대시보드
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          스타트패키지 시스템 전체 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* 전체 사용자 */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">전체 사용자</p>
                <p className="text-4xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">등록된 수강생</p>
          </CardContent>
        </Card>

        {/* 활성 기수 */}
        <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-xl shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">활성 기수</p>
                <p className="text-4xl font-bold text-green-700">{stats.activeCohorts}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">진행 중인 기수</p>
          </CardContent>
        </Card>

        {/* 대기 중 */}
        <Card className="bg-gradient-to-br from-orange-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-600 rounded-xl shadow-md">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">대기 중</p>
                <p className="text-4xl font-bold text-orange-600">{statusCounts.대기}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">워크플로우 대기</p>
          </CardContent>
        </Card>

        {/* 완료됨 */}
        <Card className="bg-gradient-to-br from-purple-50 to-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-xl shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">완료됨</p>
                <p className="text-4xl font-bold text-purple-600">{statusCounts.완료}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">완료된 워크플로우</p>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="bg-white border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              전체 진행률
            </CardTitle>
            <CardDescription className="text-gray-600">
              워크플로우 완료 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-end gap-2 mb-3">
                <p className="text-5xl font-bold text-blue-600">{completionRate}<span className="text-3xl">%</span></p>
                <p className="text-gray-600 mb-2">완료</p>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
            <p className="text-sm text-gray-600">
              {statusCounts.완료}개 완료 / 전체 {totalWorkflows}개
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              알림 발송 현황
            </CardTitle>
            <CardDescription className="text-gray-600">
              최근 7일간 발송된 알림
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-3">
              <p className="text-5xl font-bold text-blue-600">{stats.notifications}</p>
              <p className="text-gray-600 mb-2">건</p>
            </div>
            <p className="text-sm text-gray-600">
              SMS 및 이메일 알림 포함
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workflows */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900 font-bold tracking-tight">
            최근 워크플로우
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            최근 업데이트된 워크플로우 10개
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentWorkflows.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">아직 워크플로우가 없습니다</p>
              </div>
            ) : (
              stats.recentWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        workflow.status === "완료"
                          ? "bg-green-600"
                          : workflow.status === "진행중"
                            ? "bg-orange-600"
                            : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {workflow.user.이름} - {workflow.type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {workflow.user.cohort?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        workflow.status === "완료"
                          ? "bg-green-100 text-green-700"
                          : workflow.status === "진행중"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
