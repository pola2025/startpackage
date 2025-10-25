"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Phone, Lock, LogIn, KeyRound } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  // 로딩 중이거나 이미 인증된 경우 렌더링하지 않음
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-blue-600 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Feature Flag: 새 Provider 사용 시 "user-credentials", 기존은 "credentials"
      const USE_NEW_PROVIDER = process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true";
      const providerId = USE_NEW_PROVIDER ? "user-credentials" : "credentials";

      // 새 Provider는 "emailOrPhone" 필드를 사용, 기존은 "email"
      const credentials = USE_NEW_PROVIDER
        ? { emailOrPhone: phone, password }
        : { email: phone, password };

      const result = await signIn(providerId, {
        ...credentials,
        redirect: false,
      });

      if (result?.error) {
        setError("전화번호 또는 비밀번호가 일치하지 않습니다.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 연락처: phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "비밀번호 재발급 중 오류가 발생했습니다.");
      }

      setSuccess(data.message);
      setPhone("");

      // 3초 후 로그인 모드로 전환
      setTimeout(() => {
        setMode("login");
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
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
              {mode === "login" ? (
                <User className="w-10 h-10 text-white" />
              ) : (
                <KeyRound className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-4xl font-bold text-blue-900 mb-2">
                {mode === "login" ? "START PACKAGE" : "비밀번호 재발급"}
              </CardTitle>
              <CardDescription className="text-base text-blue-700">
                {mode === "login"
                  ? "비즈액터스쿨 자료 제출 시스템"
                  : "등록된 전화번호로 임시 비밀번호를 발송합니다"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-blue-900 flex items-center gap-2 font-semibold">
                    <Phone className="w-4 h-4" />
                    전화번호
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-blue-50/50 border-blue-200 focus:border-blue-600 focus:ring-blue-600"
                  />
                  <p className="text-xs text-blue-600">하이픈(-) 없이 입력</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-blue-900 flex items-center gap-2 font-semibold">
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
                    className="bg-blue-50/50 border-blue-200 focus:border-blue-600 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors font-medium"
                >
                  <KeyRound className="w-3 h-3" />
                  비밀번호를 잊으셨나요?
                </button>

                {error && (
                  <div className="rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-700 text-white hover:bg-blue-800 transition-all font-semibold shadow-md"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "로그인 중..." : "로그인"}
                  <LogIn className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-phone" className="text-blue-900 flex items-center gap-2 font-semibold">
                    <Phone className="w-4 h-4" />
                    가입 시 등록한 전화번호
                  </Label>
                  <Input
                    id="reset-phone"
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-blue-50/50 border-blue-200 focus:border-blue-600 focus:ring-blue-600"
                  />
                  <p className="text-xs text-blue-600">
                    해당 번호로 4자리 임시 비밀번호가 발송됩니다
                  </p>
                </div>

                {error && (
                  <div className="rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-md p-3 text-sm bg-green-50 text-green-700 border border-green-200">
                    {success}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setSuccess("");
                      setPhone("");
                    }}
                    className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    disabled={loading}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-700 text-white hover:bg-blue-800 transition-all font-semibold shadow-md"
                    disabled={loading}
                  >
                    {loading ? "발송 중..." : "재발급 신청"}
                  </Button>
                </div>
              </form>
            )}

            {mode === "login" && (
              <div className="space-y-3 border-t border-blue-100 pt-6">
                <Link href="/signup">
                  <Button
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                    size="lg"
                  >
                    신규 가입하기
                  </Button>
                </Link>

                <p className="text-xs text-center text-blue-600">
                  계정이 없으신가요? 위 버튼을 클릭하여 가입해주세요
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
