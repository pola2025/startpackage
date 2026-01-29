import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { verify as otpVerify, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import prisma from "./lib/prisma";
import { userCredentialsProvider } from "./lib/auth/providers/user-credentials";
import { adminCredentialsProvider } from "./lib/auth/providers/admin-credentials";

const otpCrypto = new NobleCryptoPlugin();
const otpBase32 = new ScureBase32Plugin();

// ✅ Feature Flag: 새 Provider 사용 여부
const USE_NEW_PROVIDER = process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true";

console.log("[AUTH] USE_NEW_PROVIDER:", USE_NEW_PROVIDER);
console.log("[AUTH] NEXT_PUBLIC_USE_NEW_PROVIDER env:", process.env.NEXT_PUBLIC_USE_NEW_PROVIDER);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: USE_NEW_PROVIDER
    ? [
        // ✅ 새 Provider (분리된 구조)
        userCredentialsProvider,
        adminCredentialsProvider,
      ]
    : [
        // ✅ 기존 Provider (Fallback - Backward Compatibility)
        Credentials({
          credentials: {
            email: { label: "이메일", type: "email" },
            password: { label: "비밀번호", type: "password" },
          },
          async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
              return null;
            }

            const emailOrPhone = credentials.email as string;
            const password = credentials.password as string;

            // 전화번호 형식인지 확인 (숫자만 10-11자리)
            const isPhone = /^[0-9]{10,11}$/.test(emailOrPhone.replace(/-/g, ""));

            if (isPhone) {
              // 전화번호로 사용자 찾기
              const cleanPhone = emailOrPhone.replace(/-/g, "");
              // 하이픈 포함/미포함 형식 모두 검색 (DB 데이터 불일치 대응)
              const formattedPhone = cleanPhone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");

              const user = await prisma.user.findFirst({
                where: {
                  OR: [
                    { 연락처: cleanPhone },
                    { 연락처: formattedPhone },
                  ],
                },
                include: {
                  cohort: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                },
              });

              if (user) {
                const isPasswordValid = await compare(password, user.password);

                if (isPasswordValid) {
                  return {
                    id: user.id,
                    email: user.email,
                    name: user.이름,
                    role: user.role as "user" | "super" | "designer" | "operator",
                    cohortId: user.cohortId,
                    cohortName: user.cohort?.name,
                    status: user.status,
                    graduatedAt: user.graduatedAt,
                  };
                }
              }
            } else {
              // 이메일로 사용자 확인
              const user = await prisma.user.findUnique({
                where: { email: emailOrPhone },
                include: {
                  cohort: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                },
              });

              if (user) {
                const isPasswordValid = await compare(password, user.password);

                if (isPasswordValid) {
                  return {
                    id: user.id,
                    email: user.email,
                    name: user.이름,
                    role: user.role as "user" | "super" | "designer" | "operator",
                    cohortId: user.cohortId,
                    cohortName: user.cohort?.name,
                    status: user.status,
                    graduatedAt: user.graduatedAt,
                  };
                }
              }

              // 관리자 확인 (TOTP 인증)
              const admin = await prisma.admin.findUnique({
                where: { email: emailOrPhone },
              });

              console.log("[AUTH DEBUG] Admin lookup:", {
                email: emailOrPhone,
                found: !!admin,
                adminRole: admin?.role,
              });

              if (admin) {
                // 2FA 미설정 관리자는 로그인 거부
                if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
                  console.log("[AUTH DEBUG] Admin 2FA not set up:", emailOrPhone);
                  throw new Error("2FA_NOT_SETUP");
                }

                // TOTP 코드 검증 (password 필드를 TOTP 코드로 사용)
                const totpResult = await otpVerify({
                  secret: admin.twoFactorSecret,
                  token: password,
                  crypto: otpCrypto,
                  base32: otpBase32,
                });

                console.log("[AUTH DEBUG] TOTP check:", {
                  email: emailOrPhone,
                  valid: totpResult.valid,
                });

                if (totpResult.valid) {
                  console.log("[AUTH DEBUG] Admin TOTP login successful:", {
                    id: admin.id,
                    email: admin.email,
                    role: admin.role,
                  });

                  return {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role as "user" | "super" | "designer" | "operator",
                  };
                }
              }
            }

            console.log("[AUTH DEBUG] Login failed - returning null");
            return null;
          },
        }),
      ],
  callbacks: {
    async jwt({ token, user, account }) {
      // ✅ 새 Provider: account.provider로 userType 설정
      if (USE_NEW_PROVIDER && account) {
        token.userType = account.provider; // "user-credentials" | "admin-credentials"
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType; // ✅ user 객체에서도 가져옴
        token.cohortId = user.cohortId;
        token.cohortName = user.cohortName;
        token.status = user.status;
        token.graduatedAt = user.graduatedAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "user" | "super" | "designer" | "operator";
        session.user.userType = token.userType as "user" | "admin" | undefined;
        session.user.cohortId = token.cohortId as string | undefined;
        session.user.cohortName = token.cohortName as string | undefined;
        session.user.status = token.status as string | undefined;
        session.user.graduatedAt = token.graduatedAt as Date | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
