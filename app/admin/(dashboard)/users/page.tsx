import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import UsersClient from "./users-client";

async function getData() {
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

  const { users, cohorts } = await getData();

  return <UsersClient users={users} cohorts={cohorts} />;
}
