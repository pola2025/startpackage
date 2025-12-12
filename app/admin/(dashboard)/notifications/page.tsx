import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bell,
  Mail,
  MessageSquare,
} from "lucide-react";
import NotificationsClient from "./notifications-client";

async function getNotifications() {
  return await prisma.notification.findMany({
    include: {
      user: {
        select: {
          이름: true,
          연락처: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

async function getNotificationStats() {
  const [total, smsCount, emailCount, successCount, failCount] =
    await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { channel: "SMS" } }),
      prisma.notification.count({ where: { channel: "EMAIL" } }),
      prisma.notification.count({ where: { status: "성공" } }),
      prisma.notification.count({ where: { status: "실패" } }),
    ]);

  return { total, smsCount, emailCount, successCount, failCount };
}

export default async function NotificationsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const [notifications, stats] = await Promise.all([
    getNotifications(),
    getNotificationStats(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">알림 이력</h1>
        <p className="text-sm sm:text-base text-gray-600">모든 SMS 및 이메일 발송 이력을 확인하세요</p>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1 sm:gap-2">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">전체 발송</span>
              <span className="sm:hidden">전체</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1 sm:gap-2">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              SMS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
              {stats.smsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-0 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1 sm:gap-2">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
              이메일
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
              {stats.emailCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
              성공률
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700">
              {stats.total > 0
                ? Math.round((stats.successCount / stats.total) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List - 날짜별 그룹화 */}
      <NotificationsClient notifications={notifications} />
    </div>
  );
}
