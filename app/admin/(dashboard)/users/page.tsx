import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { redirect } from "next/navigation";
import UsersClient from "./users-client";

async function getData(adminId?: string) {
  if (adminId && isD1RuntimeEnabled()) {
    return callDataService<{
      items: any[];
      cohorts: any[];
      stats: any[];
      nextCursor?: string;
    }>("admin-pages/users-page", { adminId, pageSize: 50, year: "2026" });
  }

  const [users, cohorts] = await Promise.all([
    prisma.user.findMany({
      include: {
        cohort: true,
        workflows: {
          select: { id: true, type: true, status: true },
        },
      },
      orderBy: { 이름: "asc" },
    }),
    prisma.cohort.findMany({
      orderBy: { 교육시작일: "asc" },
    }),
  ]);
  return { users, cohorts };
}

export default async function UsersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || !["super", "designer", "operator"].includes(userRole)) {
    redirect("/admin/login");
  }

  const data = await getData(String((session.user as any).id));
  const users = "items" in data ? data.items : data.users;
  const cohorts = "items" in data ? data.cohorts : data.cohorts;

  return (
    <UsersClient
      users={users}
      cohorts={cohorts}
      nextCursor={"items" in data ? data.nextCursor ?? null : null}
      pagingEnabled={"items" in data}
    />
  );
}
