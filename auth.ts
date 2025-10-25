import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "./lib/prisma";
import { userCredentialsProvider } from "./lib/auth/providers/user-credentials";
import { adminCredentialsProvider } from "./lib/auth/providers/admin-credentials";

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
              const user = await prisma.user.findFirst({
                where: { 연락처: cleanPhone },
                include: { cohort: true },
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
                  };
                }
              }
            } else {
              // 이메일로 사용자 확인
              const user = await prisma.user.findUnique({
                where: { email: emailOrPhone },
                include: { cohort: true },
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
                  };
                }
              }

              // 관리자 확인
              const admin = await prisma.admin.findUnique({
                where: { email: emailOrPhone },
              });

              console.log("[AUTH DEBUG] Admin lookup:", {
                email: emailOrPhone,
                found: !!admin,
                adminRole: admin?.role,
              });

              if (admin) {
                const isPasswordValid = await compare(password, admin.password);

                console.log("[AUTH DEBUG] Password check:", {
                  email: emailOrPhone,
                  passwordValid: isPasswordValid,
                });

                if (isPasswordValid) {
                  console.log("[AUTH DEBUG] Admin login successful:", {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.userType = token.userType as any; // ✅ 세션에 주입
        session.user.cohortId = token.cohortId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
