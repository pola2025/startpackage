"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, Lock, Check, ArrowRight, Calendar } from "lucide-react";
import { ValidationRegex, ValidationMessages } from "@/lib/validation/schemas";

interface Cohort {
  id: string;
  name: string;
  교육시작일: string;
  자료제출마감일: string;
}

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const [formData, setFormData] = useState({
    이름: "",
    연락처: "",
    이메일: "",
    cohortId: "",
  });

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // 활성 기수 불러오기
  useEffect(() => {
    fetch("/api/cohorts/active")
      .then((res) => res.json())
      .then((data) => {
        setCohorts(data);
        // 기수가 1개만 있으면 자동 선택
        if (data.length === 1) {
          setFormData((prev) => ({ ...prev, cohortId: data[0].id }));
        }
      })
      .catch((err) => console.error("기수 로딩 실패:", err));
  }, []);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.이름 || !formData.연락처 || !formData.이메일 || !formData.cohortId) {
      setError(ValidationMessages.required);
      return;
    }

    if (!ValidationRegex.email.test(formData.이메일)) {
      setError(ValidationMessages.email);
      return;
    }

    if (!ValidationRegex.phone.test(formData.연락처)) {
      setError(ValidationMessages.phone);
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 숫자 4자리 검증
    if (!ValidationRegex.userPassword.test(password)) {
      setError(ValidationMessages.userPassword);
      return;
    }

    if (password !== passwordConfirm) {
      setError(ValidationMessages.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 상세 에러 정보가 있으면 표시
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((d: any) => `${d.field}: ${d.message}`).join('\n');
          throw new Error(errorMessages || data.error);
        }
        throw new Error(data.error || "가입 중 오류가 발생했습니다.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCohort = cohorts.find((c) => c.id === formData.cohortId);

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="absolute inset-0 pattern-background opacity-30" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-white border-2 border-gray-200 shadow-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
              <User className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-4xl font-bold text-gray-900">
              START PACKAGE
            </CardTitle>
            <CardDescription className="text-base text-gray-700">
              비즈액터스쿨 자료 제출 시스템
            </CardDescription>

            <div className="flex items-center justify-center gap-2 pt-4">
              <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`h-0.5 w-8 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          </CardHeader>

          <CardContent>
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="cohort" className="text-gray-900 font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    기수 선택
                  </Label>
                  <div className="border-2 border-green-300 rounded-lg p-3 bg-green-50 mb-2">
                    <p className="text-sm text-green-800 font-medium">
                      📢 1~18기 대표님들은 &quot;수료생&quot;을 선택해주세요
                    </p>
                  </div>
                  <Select
                    value={formData.cohortId}
                    onValueChange={(value) => setFormData({ ...formData, cohortId: value })}
                  >
                    <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900">
                      <SelectValue placeholder="기수를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {cohorts.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id} className="text-gray-900">
                          {cohort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCohort && selectedCohort.name !== "수료생" && (
                    <p className="text-xs text-gray-600">
                      마감일: {new Date(selectedCohort.자료제출마감일).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-900 font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    이름
                  </Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    value={formData.이름}
                    onChange={(e) => setFormData({ ...formData, 이름: e.target.value })}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-900 font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    연락처
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    value={formData.연락처}
                    onChange={(e) => setFormData({ ...formData, 연락처: e.target.value })}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-600">하이픈(-) 없이 숫자만 입력</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900 font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.이메일}
                    onChange={(e) => setFormData({ ...formData, 이메일: e.target.value })}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {error && (
                  <div className="border-2 border-red-300 bg-red-50 rounded-md p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all font-semibold"
                  size="lg"
                >
                  다음 단계
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-5">
                <div className="border-2 border-blue-300 rounded-lg p-4 space-y-2 bg-blue-50">
                  <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    입력하신 정보
                  </p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>기수: <span className="text-gray-900 font-medium">{selectedCohort?.name}</span></p>
                    <p>이름: <span className="text-gray-900 font-medium">{formData.이름}</span></p>
                    <p>연락처: <span className="text-gray-900 font-medium">{formData.연락처}</span></p>
                    <p>이메일: <span className="text-gray-900 font-medium">{formData.이메일}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    수정하기
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-900 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    비밀번호 설정
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="숫자 4자리 (예: 1234)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="text-gray-900 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    비밀번호 확인
                  </Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {error && (
                  <div className="border-2 border-red-300 bg-red-50 rounded-md p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all font-semibold"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "가입 중..." : "가입 완료"}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
