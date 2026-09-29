// 일반 사용자 Credentials Provider
// Phase 2: Auth Layer - Provider Separation

import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "../services/user-auth.service";
import {
  clearLoginFailures,
  getLoginRateLimitKey,
  getLoginRetryAfterSeconds,
  isLoginRateLimited,
  recordLoginFailure,
  reserveLoginAttempt,
} from "../login-rate-limit";
import { LoginBlockedError, blockedLoginFor, invalidLoginFor } from "../login-errors";

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
    if (isLoginRateLimited(key)) throw new LoginBlockedError("account", getLoginRetryAfterSeconds(key));
    const distributed = await reserveLoginAttempt(credentials.emailOrPhone, request);
    if (!distributed.allowed) throw blockedLoginFor(distributed);

    const user = await authenticateUser(
      credentials.emailOrPhone,
      credentials.password
    );

    if (!user) {
      // 실패 횟수를 code로 전달 → 로그인 화면이 남은 시도/재발급 이동을 안내한다.
      throw invalidLoginFor(recordLoginFailure(key), distributed);
    }

    clearLoginFailures(key);
    return user;
  },
});
