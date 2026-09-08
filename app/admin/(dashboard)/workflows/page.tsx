import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { redirect } from "next/navigation";
import WorkflowCreateButton from "./workflow-create-button";
import WorkflowsClient from "./workflows-client";

async function getWorkflows() {
  return await prisma.workflow.findMany({
    include: {
      user: {
        select: {
          id: true,
          이름: true,
          연락처: true,
          email: true,
          cohortId: true,
          cohort: {
            select: {
              id: true,
              name: true,
            },
          },
          // 광고자동화 정보
          adAutomationEnabled: true,
          adAutomationStartDate: true,
          adAutomationEndDate: true,
          marketingSupportEndDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getCohorts() {
  return await prisma.cohort.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });
}

export default async function WorkflowsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  if (isD1RuntimeEnabled()) {
    const result = await callDataService<{
      workflowsByUser: Record<string, { user: any; workflows: any[] }>;
      stats: any;
      cohorts: Array<{ id: string; name: string }>;
      workflowTypes: string[];
      nextCursor?: string;
    }>("admin-pages/workflows-page", {
      adminId: String((session.user as any).id),
      pageSize: 50,
    });

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">워크플로우 관리</h1>
            <p className="text-sm sm:text-base text-gray-600">
              사용자별 제작 진행 상황을 추적하고 관리하세요
            </p>
          </div>
          <WorkflowCreateButton />
        </div>

        <WorkflowsClient
          workflowsByUser={result.workflowsByUser}
          stats={result.stats}
          cohorts={result.cohorts}
          workflowTypes={result.workflowTypes}
          nextCursor={result.nextCursor ?? null}
          pagingEnabled
        />
      </div>
    );
  }

  const [workflows, cohorts] = await Promise.all([
    getWorkflows(),
    getCohorts(),
  ]);

  // 사용자별로 워크플로우 그룹화
  const workflowsByUser = workflows.reduce((acc, workflow) => {
    const userId = workflow.userId;
    if (!acc[userId]) {
      acc[userId] = {
        user: workflow.user,
        workflows: [],
      };
    }
    acc[userId].workflows.push(workflow);
    return acc;
  }, {} as Record<string, { user: any; workflows: any[] }>);

  const stats = {
    대기: workflows.filter((w) => w.status === "대기").length,
    시안중: workflows.filter((w) => w.status === "시안중").length,
    발주대기: workflows.filter((w) => w.status === "발주대기").length,
    제작중: workflows.filter((w) => ["발주완료", "제작완료"].includes(w.status)).length,
    발송완료: workflows.filter((w) => w.status === "발송완료").length,
  };

  // 워크플로우 타입 목록 추출
  const workflowTypes = Array.from(new Set(workflows.map((w) => w.type).filter(Boolean)));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">워크플로우 관리</h1>
          <p className="text-sm sm:text-base text-gray-600">
            사용자별 제작 진행 상황을 추적하고 관리하세요
          </p>
        </div>
        <WorkflowCreateButton />
      </div>

      <WorkflowsClient
        workflowsByUser={workflowsByUser}
        stats={stats}
        cohorts={cohorts}
        workflowTypes={workflowTypes}
      />
    </div>
  );
}
