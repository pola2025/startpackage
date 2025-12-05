"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Loader2,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

export default function HomepagePaymentPage() {
  // 폼 상태
  const [imwebId, setImwebId] = useState("");
  const [isNaverLogin, setIsNaverLogin] = useState(false);
  const [naverId, setNaverId] = useState("");
  const [naverPw, setNaverPw] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("");
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);

  // 상태
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 비밀번호 유효성 검사 (대문자+소문자+숫자)
  const validatePassword = (pw: string) => {
    const hasUppercase = /[A-Z]/.test(pw);
    const hasLowercase = /[a-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    return hasUppercase && hasLowercase && hasNumber;
  };

  const handleCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드 가능합니다");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("파일 크기는 10MB 이하여야 합니다");
        return;
      }
      setCardImage(file);
      setCardPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // 유효성 검사
    if (!imwebId.trim()) {
      setError("아임웹 ID를 입력해주세요");
      return;
    }
    if (isNaverLogin && (!naverId.trim() || !naverPw.trim())) {
      setError("네이버 로그인 정보를 입력해주세요");
      return;
    }
    if (!adminPassword.trim()) {
      setError("관리자 비밀번호를 입력해주세요");
      return;
    }
    if (!validatePassword(adminPassword)) {
      setError("관리자 비밀번호는 대문자, 소문자, 숫자를 모두 포함해야 합니다");
      return;
    }
    if (!birthDate.trim()) {
      setError("생년월일을 입력해주세요");
      return;
    }
    if (!paymentPeriod) {
      setError("결제 기준을 선택해주세요");
      return;
    }
    if (!cardImage) {
      setError("카드 이미지를 업로드해주세요");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("imwebId", imwebId);
      formData.append("isNaverLogin", isNaverLogin.toString());
      if (isNaverLogin) {
        formData.append("naverId", naverId);
        formData.append("naverPw", naverPw);
      }
      formData.append("adminPassword", adminPassword);
      formData.append("birthDate", birthDate);
      formData.append("paymentPeriod", paymentPeriod);
      formData.append("cardImage", cardImage);

      const response = await fetch("/api/communication/payment-request", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "요청 실패");
      }

      // 성공
      setSuccess(true);
      resetForm();
    } catch (err: any) {
      setError(err.message || "요청 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setImwebId("");
    setIsNaverLogin(false);
    setNaverId("");
    setNaverPw("");
    setAdminPassword("");
    setBirthDate("");
    setPaymentPeriod("");
    setCardImage(null);
    setCardPreview(null);
    setError(null);
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">홈페이지 결제요청</h1>
          <p className="text-gray-600 mt-2">아임웹 결제 대행 서비스</p>
        </div>

        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                결제 대행 요청이 접수되었습니다
              </h2>
              <p className="text-gray-600 mb-6">
                카드 정보는 보안 채널로 전송되었으며, 결제 완료 후 즉시 삭제됩니다.
                <br />
                처리 완료 시 문의하기를 통해 안내드리겠습니다.
              </p>
              <Button onClick={() => setSuccess(false)}>
                새 요청 작성
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">홈페이지 결제요청</h1>
        <p className="text-gray-600 mt-2">아임웹 결제 대행 서비스</p>
      </div>

      {/* 안내 문구 */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <p className="font-semibold mb-2">아임웹 결제 대행 안내</p>
          <p>
            아임웹 결제가 어려우신 분들을 위한 결제 대행 서비스입니다.
            <br />
            아래 정보를 입력해 주시면 결제를 대리해 드립니다.
          </p>
          <p className="mt-2">
            <a
              href="https://guide.imweb.me/4e0a31a3-8ab9-43f7-9e10-6d67aff2a21c"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              아임웹 카드 등록 가이드 보기
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 폼 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              결제 정보 입력
            </CardTitle>
            <CardDescription>
              결제 대행에 필요한 정보를 입력해 주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 아임웹 ID */}
            <div className="space-y-2">
              <Label htmlFor="imwebId">
                아임웹 ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="imwebId"
                value={imwebId}
                onChange={(e) => setImwebId(e.target.value)}
                placeholder="아임웹 로그인 ID"
              />
            </div>

            {/* 네이버 로그인 여부 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="naverLogin"
                checked={isNaverLogin}
                onCheckedChange={(checked) => setIsNaverLogin(checked === true)}
              />
              <Label htmlFor="naverLogin" className="text-sm cursor-pointer">
                네이버로 로그인하는 경우 (ID/PW 추가 입력 필요)
              </Label>
            </div>

            {/* 네이버 로그인 정보 */}
            {isNaverLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="naverId">
                    네이버 ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="naverId"
                    value={naverId}
                    onChange={(e) => setNaverId(e.target.value)}
                    placeholder="네이버 ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naverPw">
                    네이버 비밀번호 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="naverPw"
                    type="password"
                    value={naverPw}
                    onChange={(e) => setNaverPw(e.target.value)}
                    placeholder="네이버 비밀번호"
                  />
                </div>
              </div>
            )}

            {/* 관리자 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="adminPassword">
                관리자 비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="대문자 + 소문자 + 숫자 조합"
              />
              <p className="text-xs text-gray-500">
                대문자, 소문자, 숫자를 모두 포함해야 합니다 (예: Abc123)
              </p>
              {adminPassword && !validatePassword(adminPassword) && (
                <p className="text-xs text-red-500">
                  대문자, 소문자, 숫자를 모두 포함해주세요
                </p>
              )}
              {adminPassword && validatePassword(adminPassword) && (
                <p className="text-xs text-green-600">올바른 형식입니다</p>
              )}
            </div>

            {/* 생년월일 */}
            <div className="space-y-2">
              <Label htmlFor="birthDate">
                생년월일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="YYMMDD (예: 901225)"
                maxLength={6}
              />
              <p className="text-xs text-gray-500">
                신용카드 결제 시 필요한 생년월일 6자리
              </p>
            </div>

            {/* 결제 기준 */}
            <div className="space-y-2">
              <Label>
                결제 기준 <span className="text-red-500">*</span>
              </Label>
              <Select value={paymentPeriod} onValueChange={setPaymentPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="결제 기간을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="월별">월별</SelectItem>
                  <SelectItem value="3개월">3개월</SelectItem>
                  <SelectItem value="6개월">6개월</SelectItem>
                  <SelectItem value="12개월">12개월 (1년)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 카드 이미지 업로드 */}
            <div className="space-y-2">
              <Label>
                신용카드 이미지 <span className="text-red-500">*</span>
              </Label>
              <Alert className="bg-amber-50 border-amber-200 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  카드 번호, 유효기간, CVC가 보이도록 촬영해주세요.
                  <br />
                  이 이미지는 서버에 저장되지 않으며, 보안 채널로만 전송됩니다.
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {cardPreview ? (
                  <div className="relative">
                    <Image
                      src={cardPreview}
                      alt="카드 이미지"
                      width={400}
                      height={250}
                      className="mx-auto rounded-lg object-contain max-h-60"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setCardImage(null);
                        setCardPreview(null);
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCardImageChange}
                    />
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Upload className="w-10 h-10 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        클릭하여 카드 이미지 업로드
                      </p>
                      <p className="text-xs text-gray-400">
                        이미지 파일만 가능 (최대 10MB)
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 제출 버튼 */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
              >
                초기화
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  "결제 대행 요청"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 보안 안내 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                카드 정보 보안 안내
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-3">
              <p>
                입력하신 카드 정보는 <strong>서버에 저장되지 않습니다.</strong>
              </p>
              <p>
                보안 채널(슬랙)을 통해서만 전송되며, 결제 완료 후 즉시 삭제됩니다.
              </p>
              <p>
                처리 현황은 <strong>문의하기</strong> 메뉴에서 확인하실 수 있습니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">처리 안내</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>• 요청은 영업일 기준 1~2일 내 처리됩니다.</p>
              <p>• 결제 완료 시 문의하기를 통해 안내드립니다.</p>
              <p>• 긴급 문의: mkt@polarad.co.kr</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
