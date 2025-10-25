"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white animate-pulse">로딩 중...</div>
      </div>
    );
  }

  // Middleware에서 리다이렉트 처리하므로 여기서는 렌더링만
  if (status === "authenticated") {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Feature Flag: 새 Provider 사용 시 "admin-credentials", 기존은 "credentials"
      const providerId = process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true"
        ? "admin-credentials"
        : "credentials";

      const result = await signIn(providerId, {
        email,
        password,
        redirect: false,
        callbackUrl: "/admin",
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호가 일치하지 않습니다.");
      } else if (result?.ok) {
        // 로그인 성공 - 관리자 대시보드로 이동
        // 레이아웃에서 role 체크하므로 여기서는 바로 이동
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen grid-background overflow-hidden">
      {/* Red gradient for admin */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black via-black to-neon-red/20 animate-pulse"
        style={{ animationDuration: "3s" }}
      />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md glass border-neon-red/30">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-neon-red to-neon-orange flex items-center justify-center shadow-neon-red">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold neon-text-red mb-2">
                ADMIN ACCESS
              </CardTitle>
              <p className="text-sm text-gray-500">스타트패키지 관리자 시스템</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@startpackage.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-black/50 border-white/20 focus:border-neon-red focus:ring-neon-red/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-black/50 border-white/20 focus:border-neon-red focus:ring-neon-red/50"
                />
              </div>

              {error && (
                <div className="neon-border-red rounded-md p-3 text-sm text-neon-red">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-neon-red text-white hover:bg-neon-red/90 hover:shadow-neon-red transition-all font-semibold"
                size="lg"
                disabled={loading}
              >
                {loading ? "로그인 중..." : "로그인"}
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <p className="text-xs text-center text-gray-600">
                계정이 없으신가요?{" "}
                <button
                  onClick={() => router.push("/admin/register")}
                  className="text-neon-red hover:underline"
                >
                  가입 신청
                </button>
              </p>
              <p className="text-xs text-center text-gray-600">
                관리자 전용 접근 시스템 • 무단 접근 금지
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
