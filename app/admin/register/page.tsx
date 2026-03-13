"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Lock, User, Phone, Info } from "lucide-react";
import { ValidationRegex, ValidationMessages } from "@/lib/validation/schemas";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 클라이언트 측 검증
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password
    ) {
      setError(ValidationMessages.required);
      setLoading(false);
      return;
    }

    if (!ValidationRegex.email.test(formData.email)) {
      setError(ValidationMessages.email);
      setLoading(false);
      return;
    }

    if (!ValidationRegex.phone.test(formData.phone)) {
      setError(ValidationMessages.phone);
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError(ValidationMessages.adminPassword);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(ValidationMessages.passwordMismatch);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "가입 신청에 실패했습니다.");
      } else {
        setSuccess(true);
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          router.push("/admin/login");
        }, 3000);
      }
    } catch (err) {
      setError("가입 신청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

        <div className="relative flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-xl border-gray-200">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-navy-900 flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-navy-900">
                가입 신청 완료
              </h2>
              <p className="text-navy-700">
                관리자 승인 후 이메일로 안내드립니다.
                <br />
                텔레그램 알림이 발송되었습니다.
              </p>
              <p className="text-sm text-gold-600">
                잠시 후 로그인 페이지로 이동합니다...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                관리자 가입 신청
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
                  htmlFor="name"
                  className="text-navy-900 flex items-center gap-2 font-semibold"
                >
                  <User className="w-4 h-4" />
                  이름
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                />
              </div>

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
                  name="email"
                  type="email"
                  placeholder="admin@startpackage.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                />
              </div>

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
                  name="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                />
                <p className="text-xs text-gold-600">
                  하이픈(-) 포함 또는 제외 가능
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
                  name="password"
                  type="password"
                  placeholder="최소 8자 이상"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                />
                <div className="flex items-start gap-2 text-xs text-navy-700 bg-gold-50 rounded-md p-2 border border-gray-200">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-gold-600" />
                  <span>
                    최소 8자 이상 입력해주세요. (영문, 숫자, 특수문자 조합 권장)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-navy-900 flex items-center gap-2 font-semibold"
                >
                  <Lock className="w-4 h-4" />
                  비밀번호 확인
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-gold-50/50 border-gray-200 focus:border-gold-600 focus:ring-gold-600"
                />
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
                disabled={loading}
              >
                {loading ? "신청 중..." : "가입 신청"}
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs text-center text-gold-600">
                이미 계정이 있으신가요?{" "}
                <button
                  onClick={() => router.push("/admin/login")}
                  className="text-navy-700 hover:underline font-semibold"
                >
                  로그인
                </button>
              </p>
              <p className="text-xs text-center text-gold-600">
                관리자 승인 후 사용 가능 • 무단 신청 금지
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
