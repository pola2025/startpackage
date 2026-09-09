import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { signCursor } from "@/lib/d1/read-policy";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, CheckCircle2 } from "lucide-react";
import AddCohortButton from "./add-cohort-button";
import CohortsList from "./cohorts-list";

async function getCohorts(adminId?: string) {
  if (adminId && isD1RuntimeEnabled()) {
    return callDataService<{
      items: any[];
      stats: { total: number; active: number; students: number };
      nextCursor?: string;
    }>("admin-pages/cohorts-page", { adminId, pageSize: 50 });
  }

  const pageSize = 50;
  const rows = await prisma.cohort.findMany({
    take: pageSize + 1,
    include: { _count: { select: { users: true } } },
    orderBy: [{ 교육시작일: "desc" }, { id: "desc" }],
  });
  const items = rows.slice(0, pageSize);
  const [total, active, students] = await Promise.all([
    prisma.cohort.count(),
    prisma.cohort.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "user" } }),
  ]);
  const last = items[items.length - 1];
  const cursorSecret = process.env.D1_CURSOR_SECRET || process.env.NEXTAUTH_SECRET;
  if (rows.length > pageSize && (!cursorSecret || cursorSecret.length < 16)) {
    throw new Error("Cohort pagination is unavailable without a valid cursor secret");
  }
  return {
    items,
    stats: { total, active, students },
    ...(rows.length > pageSize && last && cursorSecret
      ? {
          nextCursor: signCursor(cursorSecret, {
            version: 1,
            scope: "admin-pages-cohorts-start-desc",
            sort: [
              { field: "교육시작일", value: String(last.교육시작일.getTime()) },
              { field: "id", value: last.id },
            ],
          }),
        }
      : {}),
  };
}

export default async function CohortsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const data = await getCohorts(String((session.user as any).id));
  const cohorts = Array.isArray(data) ? data : data.items;

  const activeCohorts = Array.isArray(data) ? cohorts.filter((c) => c.isActive).length : data.stats.active;
  const totalStudents = Array.isArray(data) ? cohorts.reduce((sum, c) => sum + c._count.users, 0) : data.stats.students;
  const totalCohorts = Array.isArray(data) ? cohorts.length : data.stats.total;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            기수 관리
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            기수를 생성하고 활성화 상태를 관리하세요
          </p>
        </div>
        <AddCohortButton />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <Card className="bg-white border border-gray-200 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1 sm:gap-2">
              <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">전체 기수</span>
              <span className="sm:hidden">기수</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {totalCohorts}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1 sm:gap-2">
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span className="hidden sm:inline">활성 기수</span>
              <span className="sm:hidden">활성</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700">
              {activeCohorts}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-md">
          <CardHeader className="p-2 sm:p-3 md:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1 sm:gap-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gold-600" />
              <span className="hidden sm:inline">전체 수강생</span>
              <span className="sm:hidden">수강생</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-700">
              {totalStudents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohorts List */}
      <CohortsList cohorts={cohorts} nextCursor={Array.isArray(data) ? null : data.nextCursor ?? null} />
    </div>
  );
}
