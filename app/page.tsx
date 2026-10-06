"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Phone, Lock, LogIn, KeyRound } from "lucide-react";
import Link from "next/link";
import {
  PASSWORD_RESET_COOLDOWN_SECONDS,
  describeLoginFailure,
  formatCooldown,
  parseLoginFailureCode,
} from "@/lib/auth/login-attempt-policy";
import { RETURN_PATH_PARAM, safeReturnPath } from "@/lib/auth/return-path";

// 알림톡 버튼처럼 대시보드 안쪽 주소로 들어왔다가 로그인 화면으로 온 경우 그 화면으로 돌려보낸다.
function readReturnPath() {
  return safeReturnPath(new URLSearchParams(window.location.search).get(RETURN_PATH_PARAM));
}

// 새로고침해도 재발급 버튼 쿨다운이 유지되도록 저장 (서버도 전화번호 기준 3분 쿨다운을 강제)
const RESET_COOLDOWN_STORAGE_KEY = "startpackage.passwordResetCooldownUntil";

function readStoredCooldown() {
  try {
    const value = Number(window.localStorage.getItem(RESET_COOLDOWN_STORAGE_KEY));
    return Number.isFinite(value) && value > Date.now() ? value : null;
  } catch {
    return null;
  }
}

function storeCooldown(until: number) {
  try {
    window.localStorage.setItem(RESET_COOLDOWN_STORAGE_KEY, String(until));
  } catch {
    // 저장소를 쓸 수 없어도 화면 상태로는 쿨다운을 유지한다.
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // ✅ 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(readReturnPath());
    }
  }, [status, router]);

  useEffect(() => {
    setCooldownUntil(readStoredCooldown());
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) setCooldownUntil(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownSeconds = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const coolingDown = cooldownSeconds > 0;

  // 로딩 중이거나 이미 인증된 경우 렌더링하지 않음
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gold-600 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  const startCooldown = (seconds: number) => {
    const until = Date.now() + Math.max(1, seconds) * 1000;
    storeCooldown(until);
    setCooldownUntil(until);
  };

  const goToReset = (message = "") => {
    setMode("reset");
    setError("");
    setSuccess("");
    setPassword("");
    setNotice(message);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Feature Flag: 새 Provider 사용 시 "user-credentials", 기존은 "credentials"
      const USE_NEW_PROVIDER =
        process.env.NEXT_PUBLIC_USE_NEW_PROVIDER === "true";
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
        const failure = describeLoginFailure(parseLoginFailureCode(result.code));
        if (failure.goToReset) {
          // 반복 실패/차단 → 전화번호는 유지한 채 비밀번호 재발급 화면으로 이동
          goToReset(failure.message);
        } else {
          setError(failure.message);
        }
      } else {
        router.push(readReturnPath());
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
    if (coolingDown) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 연락처: phone }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const retryAfter = Number(data.retryAfterSeconds);
        startCooldown(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter
            : PASSWORD_RESET_COOLDOWN_SECONDS,
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "비밀번호 재발급 중 오류가 발생했습니다.",
        );
      }

      // 문자 1회 발송 후 3분간 재요청 불가
      startCooldown(PASSWORD_RESET_COOLDOWN_SECONDS);
      setNotice("");
      setSuccess(data.message);

      // 3초 후 로그인 모드로 전환 (전화번호는 유지해 임시 비밀번호로 바로 로그인)
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
    <div className="relative min-h-screen bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl border-gray-200">
          <CardHeader className="space-y-4 text-center border-b border-gray-100 bg-white">
            <div className="mx-auto w-20 h-20 rounded-full bg-navy-900 flex items-center justify-center shadow-lg">
              {mode === "login" ? (
                <User className="w-10 h-10 text-white" />
              ) : (
                <KeyRound className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-4xl font-bold text-navy-900 mb-2">
                {mode === "login" ? "START PACKAGE" : "비밀번호 재발급"}
              </CardTitle>
              <CardDescription className="text-base text-navy-700">
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
                  <Label
                    htmlFor="phone"
                    className="text-navy-900 flex items-center gap-2 font-semibold"
                  >
                    <Phone className="w-4 h-4" />
                    전화번호
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/-/g, ""))}
                    required
                    disabled={loading}
                    className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                  />
                  <p className="text-xs text-red-600">
                    숫자만 입력 (하이픈 자동 제거)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-navy-900 flex items-center gap-2 font-semibold"
                  >
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
                    className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => goToReset()}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors font-medium"
                >
                  <KeyRound className="w-3 h-3" />
                  비밀번호를 잊으셨나요?
                </button>

                {error && (
                  <div
                    role="alert"
                    className="whitespace-pre-line rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-navy-800 text-white hover:bg-navy-900 transition-all font-semibold shadow-md"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "로그인 중..." : "로그인"}
                  <LogIn className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {notice && (
                  <div
                    role="alert"
                    className="whitespace-pre-line rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200"
                  >
                    {notice}
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="reset-phone"
                    className="text-navy-900 flex items-center gap-2 font-semibold"
                  >
                    <Phone className="w-4 h-4" />
                    가입 시 등록한 전화번호
                  </Label>
                  <Input
                    id="reset-phone"
                    type="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/-/g, ""))}
                    required
                    disabled={loading}
                    className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                  />
                  <p className="text-xs text-red-600">
                    숫자만 입력 (해당 번호로 4자리 임시 비밀번호 발송)
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="whitespace-pre-line rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-md p-3 text-sm bg-green-50 text-green-700 border border-green-200"
                  >
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
                      setNotice("");
                      setSuccess("");
                    }}
                    className="flex-1 border-gold-300 text-navy-700 hover:bg-gold-50"
                    disabled={loading}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-navy-800 text-white hover:bg-navy-900 transition-all font-semibold shadow-md"
                    disabled={loading || coolingDown}
                  >
                    {loading
                      ? "발송 중..."
                      : coolingDown
                        ? `${formatCooldown(cooldownSeconds)} 후 재요청`
                        : "재발급 신청"}
                  </Button>
                </div>

                {coolingDown && (
                  <p className="text-xs text-center text-red-600" aria-live="polite">
                    문자 발송 후 3분이 지나야 다시 요청할 수 있습니다.
                  </p>
                )}
              </form>
            )}

            {mode === "login" && (
              <div className="space-y-3 border-t border-gray-100 pt-6">
                <Link href="/signup">
                  <Button
                    variant="outline"
                    className="w-full border-gold-300 text-navy-700 hover:bg-gold-50 font-semibold"
                    size="lg"
                  >
                    신규 가입하기
                  </Button>
                </Link>

                <p className="text-xs text-center text-black">
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
