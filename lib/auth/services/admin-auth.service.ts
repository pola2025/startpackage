// 관리자 인증 서비스
// Phase 2: Auth Layer - Admin Authentication

import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * 관리자 인증
 */
export async function authenticateAdmin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    console.log("[AUTH] Admin not found:", email);
    return null;
  }

  const isPasswordValid = await compare(password, admin.password);

  if (!isPasswordValid) {
    console.log("[AUTH] Invalid password for admin:", email);
    return null;
  }

  console.log("[AUTH] Admin login successful:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as "super" | "designer" | "operator",
    userType: "admin" as const,
  };
}
