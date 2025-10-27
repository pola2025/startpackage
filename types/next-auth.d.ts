// NextAuth 타입 확장
// Phase 1: Foundation - Type Safety

import "next-auth";

declare module "next-auth" {
  /**
   * User 객체 확장
   * - authorize() 함수에서 반환되는 객체
   * - session.user로 접근 가능
   */
  interface User {
    id: string;
    email: string;
    name: string;
    role: "user" | "super" | "designer" | "operator";
    userType?: "user" | "admin"; // ✅ 추가: Provider 구분 (optional for backward compatibility)
    cohortId?: string; // 일반 사용자만 해당
    cohortName?: string; // 기수명
    isGraduated?: boolean; // 수료생 여부
  }

  /**
   * Session 객체 확장
   * - useSession() 또는 auth()로 접근
   */
  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT 토큰 확장
   * - callbacks.jwt()에서 사용
   */
  interface JWT {
    id: string;
    role: string;
    userType?: string; // ✅ 추가: Provider 구분
    cohortId?: string;
    cohortName?: string; // 기수명
    isGraduated?: boolean; // 수료생 여부
  }
}
