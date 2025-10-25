// 관리자 Credentials Provider
// Phase 2: Auth Layer - Provider Separation

import Credentials from "next-auth/providers/credentials";
import { authenticateAdmin } from "../services/admin-auth.service";

export const adminCredentialsProvider = Credentials({
  id: "admin-credentials",
  name: "Admin Login",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    const admin = await authenticateAdmin(
      credentials.email as string,
      credentials.password as string
    );

    return admin;
  },
});
