import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, CheckCircle2 } from "lucide-react";
import AddCohortButton from "./add-cohort-button";
import CohortsList from "./cohorts-list";

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
              {cohorts.length}
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
      <CohortsList cohorts={cohorts} />
    </div>
  );
}
