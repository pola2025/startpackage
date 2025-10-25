// 일반 사용자 Credentials Provider
// Phase 2: Auth Layer - Provider Separation

import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "../services/user-auth.service";

export const userCredentialsProvider = Credentials({
  id: "user-credentials",
  name: "User Login",
  credentials: {
    emailOrPhone: { label: "Email or Phone", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.emailOrPhone || !credentials?.password) {
      return null;
    }

    const user = await authenticateUser(
      credentials.emailOrPhone as string,
      credentials.password as string
    );

    return user;
  },
});
