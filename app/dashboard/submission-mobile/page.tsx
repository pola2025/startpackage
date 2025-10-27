"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MobileFileUpload } from "@/components/ui/mobile-file-upload";
import { SubmissionProgress } from "@/components/ui/submission-progress";
import { CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { cn } from "@/lib/utils";

export default function MobileSubmissionPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // 수료생 접근 차단
  useEffect(() => {
    if (session?.user) {
      const cohortName = (session.user as any)?.cohortName;
      const isGraduated = (session.user as any)?.isGraduated === true || cohortName === "수료생";

      if (isGraduated) {
        router.push("/dashboard/communication");
      }
    }
  }, [session, router]);
  const [submission, setSubmission] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [activeSection, setActiveSection] = useState<"basic" | "print" | "marketing" | "website">("basic");
  const [uploading, setUploading] = useState(false);

  // 제출 데이터 로드
  useEffect(() => {
    fetchSubmission();
  }, []);

  const fetchSubmission = async () => {
    try {
      const res = await fetch("/api/submission");
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
        setFormData(data);
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    }
  };

  // 자동 저장
  const autoSaveState = useAutoSave(formData, {
    delay: 2000,
    onSave: async (data) => {
      if (!data || Object.keys(data).length === 0) return;

      await fetch("/api/submission/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onError: (error) => {
      console.error("Auto-save failed:", error);
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field: string, file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await updateSubmission(field, data.url);
      } else {
        throw new Error("Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const updateSubmission = async (field: string, value: any) => {
    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        await fetchSubmission();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Update failed:", error);
      return false;
    }
  };

  const handleManualSave = async () => {
    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchSubmission();
        alert("저장되었습니다!");
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Submit failed:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // 필수 항목 체크
  const requiredFields = [
    { label: "브랜드명", completed: !!submission?.브랜드명 },
    { label: "업종", completed: !!submission?.업종 },
    { label: "주소", completed: !!submission?.주소 },
    { label: "사업자등록증", completed: !!submission?.사업자등록증URL },
    { label: "프로필사진", completed: !!submission?.프로필사진URL },
    { label: "홈페이지 컬러컨셉", completed: !!submission?.홈페이지컬러컨셉 },
  ];

  const completedCount = requiredFields.filter((f) => f.completed).length;
  const progressPercentage = Math.round((completedCount / requiredFields.length) * 100);

  // 섹션 네비게이션
  const sections = [
    { id: "basic", label: "기본 정보", icon: "📄" },
    { id: "print", label: "인쇄물", icon: "🖨️" },
    { id: "marketing", label: "마케팅", icon: "📱" },
    { id: "website", label: "홈페이지", icon: "🌐" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 헤더 */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            자료 제출
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            각 항목을 작성하시면 자동으로 저장됩니다
          </p>
        </div>

        {/* 자동 저장 상태 표시 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200">
          <div className="flex items-center gap-2">
            {autoSaveState.isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-700">저장 중...</span>
              </>
            ) : autoSaveState.lastSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">
                  마지막 저장: {new Date(autoSaveState.lastSaved).toLocaleTimeString("ko-KR")}
                </span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">자동 저장 대기 중</span>
              </>
            )}
          </div>
        </div>

        {/* 진행 상황 */}
        <SubmissionProgress
          percentage={progressPercentage}
          status={submission?.submissionStatus || "작성중"}
          requiredFields={requiredFields}
        />

        {/* 섹션 네비게이션 - 모바일 최적화 */}
        <div className="sticky top-0 z-10 bg-white border-2 border-gray-200 rounded-xl p-2 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
                  "p-3 rounded-lg font-semibold text-sm transition-all",
                  "active:scale-95",
                  activeSection === section.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className="text-lg sm:text-base">{section.icon}</span>
                <span className="text-xs sm:text-sm">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 기본 정보 */}
        {activeSection === "basic" && (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">기본 정보</CardTitle>
              <CardDescription>
                인쇄물에 들어갈 기본 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="브랜드명" className="text-gray-900">
                  브랜드명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="브랜드명"
                  value={formData.브랜드명 || ""}
                  onChange={(e) => handleInputChange("브랜드명", e.target.value)}
                  placeholder="브랜드명을 입력하세요"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="업종" className="text-gray-900">
                  업종 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="업종"
                  value={formData.업종 || ""}
                  onChange={(e) => handleInputChange("업종", e.target.value)}
                  placeholder="업종을 입력하세요"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="주소" className="text-gray-900">
                  주소 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="주소"
                  value={formData.주소 || ""}
                  onChange={(e) => handleInputChange("주소", e.target.value)}
                  placeholder="주소를 입력하세요"
                  className="h-12 text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="대표번호" className="text-gray-900">대표번호</Label>
                  <Input
                    id="대표번호"
                    value={formData.대표번호 || ""}
                    onChange={(e) => handleInputChange("대표번호", e.target.value)}
                    placeholder="010-1234-5678"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="이메일" className="text-gray-900">이메일</Label>
                  <Input
                    id="이메일"
                    type="email"
                    value={formData.이메일 || ""}
                    onChange={(e) => handleInputChange("이메일", e.target.value)}
                    placeholder="example@email.com"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="은행명" className="text-gray-900">은행명</Label>
                  <Input
                    id="은행명"
                    value={formData.은행명 || ""}
                    onChange={(e) => handleInputChange("은행명", e.target.value)}
                    placeholder="예: 국민은행"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="계좌번호" className="text-gray-900">계좌번호</Label>
                  <Input
                    id="계좌번호"
                    value={formData.계좌번호 || ""}
                    onChange={(e) => handleInputChange("계좌번호", e.target.value)}
                    placeholder="123-45-678910"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="인쇄물받을주소" className="text-gray-900">
                  인쇄물 받을 주소
                </Label>
                <Input
                  id="인쇄물받을주소"
                  value={formData.인쇄물받을주소 || ""}
                  onChange={(e) => handleInputChange("인쇄물받을주소", e.target.value)}
                  placeholder="인쇄물 배송받을 주소"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 인쇄물 */}
        {activeSection === "print" && (
          <div className="space-y-4">
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">필수 서류</CardTitle>
                <CardDescription>
                  사업자등록증과 프로필 사진을 업로드해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MobileFileUpload
                  label="사업자등록증"
                  accept="image/*,application/pdf"
                  currentFileUrl={submission?.사업자등록증URL}
                  onUpload={(file) => handleFileUpload("사업자등록증URL", file)}
                  required
                  helpText="최대 10MB"
                  allowCamera
                />

                <MobileFileUpload
                  label="프로필사진"
                  accept="image/*"
                  currentFileUrl={submission?.프로필사진URL}
                  onUpload={(file) => handleFileUpload("프로필사진URL", file)}
                  required
                  helpText="1000px 이하"
                  allowCamera
                  validateImage
                  maxImageDimension={1000}
                />
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">로고 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <MobileFileUpload
                  label="로고 파일 (있는 경우)"
                  accept="image/*"
                  currentFileUrl={submission?.로고URL}
                  onUpload={(file) => handleFileUpload("로고URL", file)}
                  helpText="로고가 있다면 업로드해주세요"
                  allowCamera
                />

                <div className="space-y-2">
                  <Label htmlFor="로고선호스타일" className="text-gray-900">
                    로고 선호 스타일
                  </Label>
                  <Input
                    id="로고선호스타일"
                    value={formData.로고선호스타일 || ""}
                    onChange={(e) => handleInputChange("로고선호스타일", e.target.value)}
                    placeholder="예: 심플하고 모던한 느낌"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="로고선호색상" className="text-gray-900">
                    로고 선호 색상
                  </Label>
                  <Input
                    id="로고선호색상"
                    value={formData.로고선호색상 || ""}
                    onChange={(e) => handleInputChange("로고선호색상", e.target.value)}
                    placeholder="예: 블루, 그린 계열"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="로고선호폰트" className="text-gray-900">
                    로고 선호 폰트
                  </Label>
                  <Input
                    id="로고선호폰트"
                    value={formData.로고선호폰트 || ""}
                    onChange={(e) => handleInputChange("로고선호폰트", e.target.value)}
                    placeholder="예: 깔끔한 고딕체"
                    className="h-12 text-base"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">
                  SMS 발신 등록 서류
                </CardTitle>
                <CardDescription>
                  SMS 발신번호 등록에 필요한 서류를 업로드해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MobileFileUpload
                  label="대표자 신분증"
                  accept="image/*,application/pdf"
                  currentFileUrl={submission?.대표자신분증URL}
                  onUpload={(file) => handleFileUpload("대표자신분증URL", file)}
                  allowCamera
                />

                <MobileFileUpload
                  label="통신서비스 이용증명원"
                  accept="image/*,application/pdf"
                  currentFileUrl={submission?.통신서비스이용증명원URL}
                  onUpload={(file) => handleFileUpload("통신서비스이용증명원URL", file)}
                  allowCamera
                />

                <MobileFileUpload
                  label="신용카드 앞면"
                  accept="image/*"
                  currentFileUrl={submission?.신용카드앞면URL}
                  onUpload={(file) => handleFileUpload("신용카드앞면URL", file)}
                  allowCamera
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 마케팅 */}
        {activeSection === "marketing" && (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">마케팅 정보</CardTitle>
              <CardDescription>
                메타광고, 네이버 광고, 인스타그램 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="메타광고관리자값" className="text-gray-900">
                  메타광고 관리자 값
                </Label>
                <Input
                  id="메타광고관리자값"
                  value={formData.메타광고관리자값 || ""}
                  onChange={(e) => handleInputChange("메타광고관리자값", e.target.value)}
                  placeholder="초대 링크 또는 계정 정보"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="네이버검색광고ID" className="text-gray-900">
                  네이버 검색광고 ID
                </Label>
                <Input
                  id="네이버검색광고ID"
                  value={formData.네이버검색광고ID || ""}
                  onChange={(e) => handleInputChange("네이버검색광고ID", e.target.value)}
                  placeholder="네이버 광고 ID"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="InstagramID" className="text-gray-900">
                  Instagram ID
                </Label>
                <Input
                  id="InstagramID"
                  value={formData.InstagramID || ""}
                  onChange={(e) => handleInputChange("InstagramID", e.target.value)}
                  placeholder="인스타그램 아이디"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="InstagramPW" className="text-gray-900">
                  Instagram 비밀번호
                </Label>
                <Input
                  id="InstagramPW"
                  type="password"
                  value={formData.InstagramPW || ""}
                  onChange={(e) => handleInputChange("InstagramPW", e.target.value)}
                  placeholder="비밀번호"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 홈페이지 */}
        {activeSection === "website" && (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">
                홈페이지 제작 정보
              </CardTitle>
              <CardDescription>
                홈페이지 컬러 컨셉을 선택해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="홈페이지컬러컨셉" className="text-gray-900">
                  컬러 컨셉 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="홈페이지컬러컨셉"
                  value={formData.홈페이지컬러컨셉 || ""}
                  onChange={(e) => handleInputChange("홈페이지컬러컨셉", e.target.value)}
                  placeholder="예: 블루 계열, 심플하고 깔끔한 느낌"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 수동 저장 버튼 */}
        <Button
          onClick={handleManualSave}
          className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 active:scale-98"
          size="lg"
        >
          <Save className="w-5 h-5 mr-2" />
          지금 저장하기
        </Button>
      </div>

      {/* 업로드 중 오버레이 */}
      {uploading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm mx-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-lg font-bold text-gray-900">파일 업로드 중...</p>
            <p className="text-sm text-gray-500 text-center">
              잠시만 기다려주세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
