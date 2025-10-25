// 일반 사용자 인증 서비스
// Phase 2: Auth Layer - User Authentication

import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * 전화번호로 사용자 인증
 */
export async function authenticateUserByPhone(phone: string, password: string) {
  const cleanPhone = phone.replace(/-/g, "");

  const user = await prisma.user.findFirst({
    where: { 연락처: cleanPhone },
    include: { cohort: true },
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await compare(password, user.password);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.이름,
    role: user.role as "user",
    userType: "user" as const,
    cohortId: user.cohortId,
  };
}

/**
 * 이메일로 사용자 인증
 */
export async function authenticateUserByEmail(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { cohort: true },
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await compare(password, user.password);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.이름,
    role: user.role as "user",
    userType: "user" as const,
    cohortId: user.cohortId,
  };
}

/**
 * 이메일 또는 전화번호로 사용자 인증 (통합)
 */
export async function authenticateUser(emailOrPhone: string, password: string) {
  // 전화번호 형식 체크 (숫자만 10-11자리)
  const isPhone = /^[0-9]{10,11}$/.test(emailOrPhone.replace(/-/g, ""));

  if (isPhone) {
    return await authenticateUserByPhone(emailOrPhone, password);
  }

  return await authenticateUserByEmail(emailOrPhone, password);
}
