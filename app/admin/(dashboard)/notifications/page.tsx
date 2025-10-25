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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";

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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">알림 이력</h1>
        <p className="text-gray-600">모든 SMS 및 이메일 발송 이력을 확인하세요</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              전체 발송
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.smsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-600" />
              이메일
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.emailCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              성공률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {stats.total > 0
                ? Math.round((stats.successCount / stats.total) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card className="bg-white border-2 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            발송 이력
          </CardTitle>
          <CardDescription className="text-gray-600">
            최근 100건의 알림 발송 기록
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-gray-700 font-semibold">발송일시</TableHead>
                  <TableHead className="text-gray-700 font-semibold">수신자</TableHead>
                  <TableHead className="text-gray-700 font-semibold">연락처</TableHead>
                  <TableHead className="text-gray-700 font-semibold">채널</TableHead>
                  <TableHead className="text-gray-700 font-semibold">유형</TableHead>
                  <TableHead className="text-gray-700 font-semibold">제목</TableHead>
                  <TableHead className="text-gray-700 font-semibold">내용</TableHead>
                  <TableHead className="text-gray-700 font-semibold">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow
                    key={notification.id}
                    className="border-gray-200 hover:bg-blue-50/50"
                  >
                    <TableCell className="text-gray-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(notification.createdAt).toLocaleString(
                          "ko-KR",
                          {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {notification.user?.이름 || "-"}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {notification.user?.연락처 || notification.user?.email || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          notification.channel === "SMS"
                            ? "border-blue-300 text-blue-700 bg-blue-50"
                            : "border-orange-300 text-orange-700 bg-orange-50"
                        }
                      >
                        {notification.channel === "SMS" ? (
                          <MessageSquare className="w-3 h-3 mr-1" />
                        ) : (
                          <Mail className="w-3 h-3 mr-1" />
                        )}
                        {notification.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-gray-300 text-gray-700 bg-gray-50"
                      >
                        {notification.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-900 max-w-xs truncate">
                      {notification.title}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm max-w-sm truncate">
                      {notification.message}
                    </TableCell>
                    <TableCell>
                      {notification.status === "성공" ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">성공</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm">실패</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
