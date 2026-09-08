import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./lib/prisma";
import { userCredentialsProvider } from "./lib/auth/providers/user-credentials";
import { adminCredentialsProvider } from "./lib/auth/providers/admin-credentials";
import { authenticateAdmin } from "./lib/auth/services/admin-auth.service";
import { authenticateUser } from "./lib/auth/services/user-auth.service";
import { isD1RuntimeEnabled } from "./lib/d1/runtime";
import { findD1AdminState } from "./lib/d1/auth-client";
import { isAdminSessionCurrent } from "./lib/auth/admin-session";
import {
  clearLoginFailures,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure,
  reserveLoginAttempt,
} from "./lib/auth/login-rate-limit";

// ✅ Feature Flag: 새 Provider 사용 여부
const USE_NEW_PROVIDER = process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true";

console.log("[AUTH] USE_NEW_PROVIDER:", USE_NEW_PROVIDER);
console.log(
  "[AUTH] NEXT_PUBLIC_USE_NEW_PROVIDER env:",
  process.env.NEXT_PUBLIC_USE_NEW_PROVIDER,
);

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
          async authorize(credentials, request) {
            if (typeof credentials?.email !== "string" || typeof credentials?.password !== "string") {
              return null;
            }

            const emailOrPhone = credentials.email;
            const password = credentials.password;
            const key = getLoginRateLimitKey(emailOrPhone, request);
            if (isLoginRateLimited(key)) return null;
            const distributed = await reserveLoginAttempt(emailOrPhone, request);
            if (!distributed.allowed) return null;

            const authenticatedUser = await authenticateUser(emailOrPhone, password);
            if (authenticatedUser) {
              clearLoginFailures(key);
              return authenticatedUser;
            }
            if (!/^[0-9]{10,11}$/.test(emailOrPhone.replace(/-/g, ""))) {
              const authenticatedAdmin = await authenticateAdmin(emailOrPhone, password);
              if (authenticatedAdmin && "error" in authenticatedAdmin) {
                recordLoginFailure(key);
                throw new Error(authenticatedAdmin.error);
              }
              if (authenticatedAdmin) {
                clearLoginFailures(key);
                return authenticatedAdmin;
              }
            }
            recordLoginFailure(key);
            return null;

          },
        }),
      ],
  callbacks: {
    async jwt({ token, user, account }) {
      // ✅ 새 Provider: account.provider로 userType 설정
      if (USE_NEW_PROVIDER && account) {
        token.userType = account.provider === "admin-credentials" ? "admin" : "user";
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType; // ✅ user 객체에서도 가져옴
        token.cohortId = user.cohortId;
        token.cohortName = user.cohortName;
        token.status = user.status;
        token.graduatedAt = user.graduatedAt;
        token.adminUpdatedAt = user.adminUpdatedAt;
        token.revoked = false;
      }

      const adminRole = ["super", "designer", "operator"].includes(token.role as string);
      if ((token.userType === "admin" || adminRole) && token.id && !token.revoked) {
        const admin = isD1RuntimeEnabled()
          ? await findD1AdminState(token.id as string)
          : await prisma.admin.findUnique({
              where: { id: token.id as string },
              select: { role: true, updatedAt: true },
            });
        if (!admin) {
          token.revoked = true;
          token.role = "user";
          token.userType = undefined;
        } else if (!isAdminSessionCurrent(token.adminUpdatedAt as number | undefined, {
          role: admin.role,
          updatedAt: typeof admin.updatedAt === "number" ? admin.updatedAt : admin.updatedAt.getTime(),
        })) {
          token.revoked = true;
          token.role = "user";
          token.userType = undefined;
        } else {
          token.role = admin.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.revoked ? "" : (token.id as string);
        session.user.role = token.role as
          | "user"
          | "super"
          | "designer"
          | "operator";
        session.user.userType = token.userType as "user" | "admin" | undefined;
        session.user.cohortId = token.cohortId as string | undefined;
        session.user.cohortName = token.cohortName as string | undefined;
        session.user.status = token.status as string | undefined;
        session.user.graduatedAt = token.graduatedAt as Date | null | undefined;
        session.user.adminUpdatedAt = token.adminUpdatedAt as number | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // 7일 유지 (기존 기본값 30일에서 단축) — 관리자 디바이스 탈취 시 위험도 ↓
    maxAge: 7 * 24 * 60 * 60,
    // 하루 단위로 토큰 갱신 (활성 사용자는 계속 로그인 유지)
    updateAge: 24 * 60 * 60,
  },
  // 프로덕션에서 강제로 Secure 쿠키 사용 (설정 drift 방지)
  useSecureCookies: process.env.NODE_ENV === "production",
});
