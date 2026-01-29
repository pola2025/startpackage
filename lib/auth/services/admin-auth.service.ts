// 관리자 인증 서비스
// TOTP (Google Authenticator) 기반 인증

import { TOTP, NobleCryptoPlugin, ScureBase32Plugin, verify as otpVerify } from "otplib";
import prisma from "@/lib/prisma";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

/**
 * 관리자 TOTP 인증
 * @param email 관리자 이메일
 * @param totpCode 6자리 TOTP 코드
 */
export async function authenticateAdmin(email: string, totpCode: string) {
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    console.log("[AUTH] Admin not found:", email);
    return null;
  }

  // 2FA 미설정 관리자는 로그인 거부
  if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
    console.log("[AUTH] 2FA not enabled for admin:", email);
    return {
      error: "2FA_NOT_SETUP",
      message: "2FA 설정이 필요합니다. 관리자에게 셋업 링크를 요청하세요.",
    };
  }

  // TOTP 코드 검증
  const result = await otpVerify({
    secret: admin.twoFactorSecret,
    token: totpCode,
    crypto,
    base32,
  });

  if (!result.valid) {
    console.log("[AUTH] Invalid TOTP code for admin:", email);
    return null;
  }

  console.log("[AUTH] Admin TOTP login successful:", {
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
