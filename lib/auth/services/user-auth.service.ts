// 일반 사용자 인증 서비스
// Phase 2: Auth Layer - User Authentication

import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { findD1UserByEmail, findD1UserByPhone } from "@/lib/d1/auth-client";

/**
 * 전화번호로 사용자 인증
 */
export async function authenticateUserByPhone(phone: string, password: string) {
  const cleanPhone = phone.replace(/-/g, "");

  // 하이픈 포함/미포함 형식 모두 검색 (DB 데이터 불일치 대응)
  const formattedPhone = cleanPhone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");

  if (isD1RuntimeEnabled()) {
    const user = await findD1UserByPhone(phone);
    if (!user || !(await compare(password, user.password))) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "user",
      userType: "user" as const,
      cohortId: user.cohortId,
      cohortName: user.cohortName ?? undefined,
      status: user.status,
      graduatedAt: user.graduatedAt === null ? null : new Date(user.graduatedAt),
    };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ 연락처: cleanPhone }, { 연락처: formattedPhone }] },
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
    cohortName: user.cohort?.name,
    status: user.status,
    graduatedAt: user.graduatedAt,
  };
}

/**
 * 이메일로 사용자 인증
 */
export async function authenticateUserByEmail(email: string, password: string) {
  if (isD1RuntimeEnabled()) {
    const user = await findD1UserByEmail(email);
    if (!user || !(await compare(password, user.password))) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "user",
      userType: "user" as const,
      cohortId: user.cohortId,
      cohortName: user.cohortName ?? undefined,
      status: user.status,
      graduatedAt: user.graduatedAt === null ? null : new Date(user.graduatedAt),
    };
  }

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
    cohortName: user.cohort?.name,
    status: user.status,
    graduatedAt: user.graduatedAt,
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
