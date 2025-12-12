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
import { Users, Mail, Phone, Calendar, CheckCircle2, XCircle } from "lucide-react";
import UserActions from "./user-actions";

async function getUsers() {
  return await prisma.user.findMany({
    include: {
      cohort: true,
      workflows: {
        select: {
          id: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { 이름: "asc" },
  });
}

export default async function UsersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const users = await getUsers();

  // 한글 가나다순 정렬 (Intl.Collator 사용) - trim으로 앞뒤 공백 제거 후 비교
  const koreanCollator = new Intl.Collator('ko-KR', { sensitivity: 'base' });
  const sortedUsers = [...users].sort((a, b) =>
    koreanCollator.compare(a.이름.trim(), b.이름.trim())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">사용자 관리</h1>
          <p className="text-sm sm:text-base text-gray-600">
            등록된 모든 사용자를 관리하고 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 rounded-lg border-2 border-blue-200 self-start sm:self-auto">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <span className="text-xl sm:text-2xl font-bold text-blue-600">
            {sortedUsers.length}
          </span>
          <span className="text-xs sm:text-sm text-gray-600">명</span>
        </div>
      </div>

      {/* Mobile: Card Layout */}
      <div className="lg:hidden space-y-3">
        {sortedUsers.map((user) => {
          const completedWorkflows = user.workflows.filter(
            (w) => w.status === "완료"
          ).length;
          const totalWorkflows = user.workflows.length;

          return (
            <Card key={user.id} className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                {/* Header: 이름 + 기수 + 작업버튼 */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">{user.이름.trim()}</h3>
                    <Badge
                      variant="outline"
                      className="border-blue-300 text-blue-700 bg-blue-50 text-xs mt-1"
                    >
                      {user.cohort?.name || "미지정"}
                    </Badge>
                  </div>
                  <UserActions user={user} />
                </div>

                {/* Info Grid */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{user.연락처}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                {/* Footer: 워크플로우 + 수신동의 + 가입일 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {/* 워크플로우 */}
                    <div className="text-xs">
                      <span className="text-gray-500">진행</span>
                      <span className="ml-1 font-medium text-green-700">{completedWorkflows}</span>
                      <span className="text-gray-400">/{totalWorkflows}</span>
                    </div>
                    {/* 수신동의 */}
                    <div className="flex items-center gap-1">
                      {user.SMS수신동의 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      {user.이메일수신동의 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  </div>
                  {/* 가입일 */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop: Table Layout */}
      <Card className="hidden lg:block bg-white border-2 border-gray-200 shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl text-gray-900">전체 사용자 목록</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            기수별 사용자 정보 및 워크플로우 상태
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-gray-50">
                <TableHead className="text-gray-700 font-semibold">이름</TableHead>
                <TableHead className="text-gray-700 font-semibold">기수</TableHead>
                <TableHead className="text-gray-700 font-semibold">연락처</TableHead>
                <TableHead className="text-gray-700 font-semibold">이메일</TableHead>
                <TableHead className="text-gray-700 font-semibold">워크플로우</TableHead>
                <TableHead className="text-gray-700 font-semibold">수신동의</TableHead>
                <TableHead className="text-gray-700 font-semibold">가입일</TableHead>
                <TableHead className="text-gray-700 font-semibold">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => {
                const completedWorkflows = user.workflows.filter(
                  (w) => w.status === "완료"
                ).length;
                const totalWorkflows = user.workflows.length;

                return (
                  <TableRow
                    key={user.id}
                    className="border-gray-200 hover:bg-blue-50/50"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {user.이름.trim()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-blue-300 text-blue-700 bg-blue-50"
                      >
                        {user.cohort?.name || "미지정"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-500" />
                        {user.연락처}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-500" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-green-700 font-medium">
                          {completedWorkflows}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className="text-gray-600">{totalWorkflows}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.SMS수신동의 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500">SMS</span>
                        {user.이메일수신동의 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500">Email</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserActions user={user} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
