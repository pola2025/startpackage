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
import { GraduationCap, Users, Calendar, CheckCircle2 } from "lucide-react";
import CohortActions from "./cohort-actions";
import AddCohortButton from "./add-cohort-button";

async function getCohorts() {
  return await prisma.cohort.findMany({
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function CohortsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const cohorts = await getCohorts();

  const activeCohorts = cohorts.filter((c) => c.isActive).length;
  const totalStudents = cohorts.reduce((sum, c) => sum + c._count.users, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">기수 관리</h1>
          <p className="text-gray-600">기수를 생성하고 활성화 상태를 관리하세요</p>
        </div>
        <AddCohortButton />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              전체 기수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {cohorts.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              활성 기수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {activeCohorts}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              전체 수강생
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {totalStudents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohorts Table */}
      <Card className="bg-white border-2 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            기수 목록
          </CardTitle>
          <CardDescription className="text-gray-600">
            모든 기수 정보 및 활성화 상태
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-gray-700 font-semibold">기수명</TableHead>
                  <TableHead className="text-gray-700 font-semibold">교육 요일</TableHead>
                  <TableHead className="text-gray-700 font-semibold">활성 상태</TableHead>
                  <TableHead className="text-gray-700 font-semibold">수강생 수</TableHead>
                  <TableHead className="text-gray-700 font-semibold">교육 시작일</TableHead>
                  <TableHead className="text-gray-700 font-semibold">자료 마감일</TableHead>
                  <TableHead className="text-gray-700 font-semibold">마케팅 지원 기간</TableHead>
                  <TableHead className="text-gray-700 font-semibold">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => (
                  <TableRow
                    key={cohort.id}
                    className="border-gray-200 hover:bg-blue-50/50"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {cohort.name}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {cohort.교육요일}
                    </TableCell>
                    <TableCell>
                      {cohort.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-green-300 text-green-700 bg-green-50"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          활성
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-gray-300 text-gray-600 bg-gray-50"
                        >
                          비활성
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-gray-500" />
                        {cohort._count.users}명
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {cohort.교육시작일 ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(cohort.교육시작일).toLocaleDateString("ko-KR")}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {cohort.자료제출마감일 ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(cohort.자료제출마감일).toLocaleDateString("ko-KR")}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cohort.교육시작일 ? (
                        (() => {
                          const startDate = new Date(cohort.교육시작일);
                          const endDate = new Date(cohort.교육시작일);
                          endDate.setMonth(endDate.getMonth() + 3);
                          const now = new Date();
                          const isExpired = now > endDate;
                          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>~{endDate.toLocaleDateString("ko-KR")}</span>
                              </div>
                              {isExpired ? (
                                <Badge variant="outline" className="text-xs border-gray-300 text-gray-500 bg-gray-50 w-fit">
                                  종료됨
                                </Badge>
                              ) : daysLeft <= 14 ? (
                                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 bg-orange-50 w-fit">
                                  D-{daysLeft}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 bg-blue-50 w-fit">
                                  진행중
                                </Badge>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CohortActions cohort={cohort} />
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
