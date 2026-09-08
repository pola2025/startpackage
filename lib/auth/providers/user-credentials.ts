// 일반 사용자 Credentials Provider
// Phase 2: Auth Layer - Provider Separation

import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "../services/user-auth.service";
import {
  clearLoginFailures,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure,
  reserveLoginAttempt,
} from "../login-rate-limit";

export const userCredentialsProvider = Credentials({
  id: "user-credentials",
  name: "User Login",
  credentials: {
    emailOrPhone: { label: "Email or Phone", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials, request) {
    if (typeof credentials?.emailOrPhone !== "string" || typeof credentials?.password !== "string") {
      return null;
    }

    const key = getLoginRateLimitKey(credentials.emailOrPhone, request);
    if (isLoginRateLimited(key)) return null;
    const distributed = await reserveLoginAttempt(credentials.emailOrPhone, request);
    if (!distributed.allowed) return null;

    const user = await authenticateUser(
      credentials.emailOrPhone,
      credentials.password
    );

    if (!user) {
      recordLoginFailure(key);
      return null;
    }

    clearLoginFailures(key);
    return user;
  },
});
