// 관리자 Credentials Provider
// TOTP (Google Authenticator) 기반 인증

import Credentials from "next-auth/providers/credentials";
import { authenticateAdmin } from "../services/admin-auth.service";

export const adminCredentialsProvider = Credentials({
  id: "admin-credentials",
  name: "Admin Login",
  credentials: {
    email: { label: "Email", type: "email" },
    totpCode: { label: "TOTP Code", type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.totpCode) {
      return null;
    }

    const result = await authenticateAdmin(
      credentials.email as string,
      credentials.totpCode as string
    );

    // 2FA 미설정 에러인 경우
    if (result && "error" in result) {
      throw new Error(result.error);
    }

    return result;
  },
});
