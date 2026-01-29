"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone, CheckCircle2, Copy, Check } from "lucide-react";

export default function Setup2FAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-blue-600">2FA 설정 준비 중...</div>
      </div>
    }>
      <Setup2FAContent />
    </Suspense>
  );
}

function Setup2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [adminName, setAdminName] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (success) return;

    if (!token || !email) {
      setError("유효하지 않은 셋업 링크입니다.");
      setLoading(false);
      return;
    }

    async function fetchSetup() {
      try {
        const res = await fetch(
          `/api/admin/2fa/setup?token=${encodeURIComponent(token!)}&email=${encodeURIComponent(email!)}`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "셋업 정보를 불러올 수 없습니다.");
          return;
        }

        setQrCode(data.qrCode);
        setSecret(data.secret);
        setAdminName(data.name);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchSetup();
  }, [token, email, success]);

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTotpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(value);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (totpCode.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요.");
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch("/api/admin/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, totpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "인증에 실패했습니다.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/login");
      }, 3000);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-blue-600">2FA 설정 준비 중...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl border-green-200">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800">2FA 설정 완료</h2>
            <p className="text-sm text-green-700">
              Google Authenticator가 성공적으로 연결되었습니다.
            </p>
            <p className="text-xs text-gray-500">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !qrCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl border-red-200">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-800">셋업 오류</h2>
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/login")}
              className="mt-4"
            >
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-xl border-blue-200">
        <CardHeader className="space-y-4 text-center border-b border-blue-100 bg-gradient-to-b from-blue-50/30 to-transparent">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-blue-900 mb-1">
              Google Authenticator 설정
            </CardTitle>
            <p className="text-sm text-blue-700">
              {adminName}님, 2단계 인증을 설정해주세요
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Step 1: QR Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span className="text-sm font-semibold text-blue-900">
                Google Authenticator 앱에서 QR코드를 스캔하세요
              </span>
            </div>

            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg border border-blue-100">
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                />
              </div>
            )}

            {/* Manual secret */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">
                QR코드 스캔이 안 될 경우, 아래 코드를 직접 입력하세요:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs font-mono break-all">
                  {secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySecret}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2: Verify */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span className="text-sm font-semibold text-blue-900">
                앱에 표시된 6자리 코드를 입력하세요
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verifyCode" className="sr-only">
                인증 코드
              </Label>
              <Input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={totpCode}
                onChange={handleTotpChange}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono border-blue-200 focus:border-blue-600 focus:ring-blue-600"
              />
            </div>

            {error && (
              <div className="rounded-md p-3 text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-700 text-white hover:bg-blue-800 font-semibold"
              size="lg"
              disabled={verifying || totpCode.length !== 6}
            >
              {verifying ? "확인 중..." : "인증 완료"}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
