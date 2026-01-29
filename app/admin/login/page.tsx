"use client";

import { useState, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, KeyRound } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const totpInputRef = useRef<HTMLInputElement>(null);

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-blue-600">로딩 중...</div>
      </div>
    );
  }

  // Middleware에서 리다이렉트 처리하므로 여기서는 렌더링만
  if (status === "authenticated") {
    return null;
  }

  const handleTotpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (totpCode.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const providerId = process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true"
        ? "admin-credentials"
        : "credentials";

      const result = await signIn(providerId, {
        email,
        totpCode,
        redirect: false,
        callbackUrl: "/admin",
      });

      if (result?.error) {
        if (result.error.includes("2FA_NOT_SETUP")) {
          setError("2FA 설정이 필요합니다. 관리자에게 셋업 링크를 요청하세요.");
        } else {
          setError("이메일 또는 인증 코드가 일치하지 않습니다.");
        }
      } else if (result?.ok) {
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
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl border-blue-200">
          <CardHeader className="space-y-4 text-center border-b border-blue-100 bg-gradient-to-b from-blue-50/30 to-transparent">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-blue-900 mb-2">
                ADMIN ACCESS
              </CardTitle>
              <p className="text-sm text-blue-700">스타트패키지 관리자 시스템</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-900 flex items-center gap-2 font-semibold">
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
                  className="bg-blue-50/50 border-blue-200 focus:border-blue-600 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totpCode" className="text-blue-900 flex items-center gap-2 font-semibold">
                  <KeyRound className="w-4 h-4" />
                  인증 코드
                </Label>
                <Input
                  ref={totpInputRef}
                  id="totpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={totpCode}
                  onChange={handleTotpChange}
                  maxLength={6}
                  required
                  disabled={loading}
                  className="bg-blue-50/50 border-blue-200 focus:border-blue-600 focus:ring-blue-600 text-center text-2xl tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-blue-500">
                  Google Authenticator 앱에서 6자리 코드를 입력하세요
                </p>
              </div>

              {error && (
                <div className="rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-700 text-white hover:bg-blue-800 transition-all font-semibold shadow-md"
                size="lg"
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? "인증 중..." : "로그인"}
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="border-t border-blue-100 pt-4 space-y-2">
              <p className="text-xs text-center text-blue-600">
                계정이 없으신가요?{" "}
                <button
                  onClick={() => router.push("/admin/register")}
                  className="text-blue-700 hover:underline font-semibold"
                >
                  가입 신청
                </button>
              </p>
              <p className="text-xs text-center text-blue-600">
                관리자 전용 접근 시스템 • Google Authenticator 필수
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
