"use client";

import { useState, useRef, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, KeyRound, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const totpInputRef = useRef<HTMLInputElement>(null);

  // 이미 로그인된 상태면 어드민 대시보드로 리다이렉트
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  // 로딩 중 또는 인증됨 (리다이렉트 대기) → 로딩 화면 표시
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-gold-600 animate-spin" />
        <div className="text-gold-600 text-sm">
          {status === "authenticated"
            ? "관리자 페이지로 이동 중..."
            : "로딩 중..."}
        </div>
      </div>
    );
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
      const providerId =
        process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true"
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
    <div className="relative min-h-screen bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl border-gray-200">
          <CardHeader className="space-y-4 text-center border-b border-gray-100 bg-white">
            <div className="mx-auto w-20 h-20 rounded-full bg-navy-900 flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-navy-900 mb-2">
                ADMIN ACCESS
              </CardTitle>
              <p className="text-sm text-navy-700">
                스타트패키지 관리자 시스템
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-navy-900 flex items-center gap-2 font-semibold"
                >
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
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="totpCode"
                  className="text-navy-900 flex items-center gap-2 font-semibold"
                >
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
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600 text-center text-2xl tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-gold-600">
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
                className="w-full bg-navy-900 text-white hover:bg-navy-800 transition-all font-semibold shadow-md"
                size="lg"
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? "인증 중..." : "로그인"}
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs text-center text-gold-600">
                계정이 없으신가요?{" "}
                <button
                  onClick={() => router.push("/admin/register")}
                  className="text-navy-700 hover:underline font-semibold"
                >
                  가입 신청
                </button>
              </p>
              <p className="text-xs text-center text-gold-600">
                관리자 전용 접근 시스템 • Google Authenticator 필수
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
