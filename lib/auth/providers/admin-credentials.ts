// 관리자 Credentials Provider
// TOTP (Google Authenticator) 기반 인증

import Credentials from "next-auth/providers/credentials";
import { authenticateAdmin } from "../services/admin-auth.service";
import {
  clearLoginFailures,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure,
  reserveLoginAttempt,
} from "../login-rate-limit";

export const adminCredentialsProvider = Credentials({
  id: "admin-credentials",
  name: "Admin Login",
  credentials: {
    email: { label: "Email", type: "email" },
    totpCode: { label: "TOTP Code", type: "text" },
  },
  async authorize(credentials, request) {
    if (typeof credentials?.email !== "string" || typeof credentials?.totpCode !== "string") {
      return null;
    }

    const key = getLoginRateLimitKey(credentials.email, request);
    if (isLoginRateLimited(key)) return null;
    const distributed = await reserveLoginAttempt(credentials.email, request);
    if (!distributed.allowed) return null;

    const result = await authenticateAdmin(
      credentials.email,
      credentials.totpCode
    );

    // 2FA 미설정 에러인 경우
    if (result && "error" in result) {
      recordLoginFailure(key);
      throw new Error(result.error);
    }

    if (!result) {
      recordLoginFailure(key);
      return null;
    }

    clearLoginFailures(key);
    return result;
  },
});
