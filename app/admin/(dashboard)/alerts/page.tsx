import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bell } from "lucide-react";
import AlertsClient from "./alerts-client";

export default async function AlertsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const [alerts, cohorts] = await Promise.all([
    prisma.systemAlert.findMany({
      orderBy: [{ isActive: "desc" }, { endDate: "asc" }, { priority: "desc" }],
    }),
    prisma.cohort.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Date → string 직렬화
  const serializedAlerts = alerts.map((a) => ({
    ...a,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">팝업 관리</h1>
          <p className="text-sm text-gray-500">
            기수별 자료제출 마감 팝업 게재 현황
          </p>
        </div>
      </div>

      <AlertsClient alerts={serializedAlerts} cohorts={cohorts} />
    </div>
  );
}
