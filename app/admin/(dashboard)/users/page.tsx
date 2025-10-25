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
    orderBy: { createdAt: "desc" },
  });
}

export default async function UsersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const users = await getUsers();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">사용자 관리</h1>
          <p className="text-gray-600">
            등록된 모든 사용자를 관리하고 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border-2 border-blue-200">
          <Users className="w-5 h-5 text-blue-600" />
          <span className="text-2xl font-bold text-blue-600">
            {users.length}
          </span>
          <span className="text-sm text-gray-600">명</span>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-white border-2 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">전체 사용자 목록</CardTitle>
          <CardDescription className="text-gray-600">
            기수별 사용자 정보 및 워크플로우 상태
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                {users.map((user) => {
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
                        {user.이름}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
