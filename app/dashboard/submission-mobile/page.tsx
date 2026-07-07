"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
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
import { MobileFileUpload } from "@/components/ui/mobile-file-upload";
import { SubmissionProgress } from "@/components/ui/submission-progress";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ArrowRight,
  Wand2,
} from "lucide-react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import {
  uploadProfilePhoto,
  toUploadMessage,
} from "@/lib/submission/uploadProfile";
import {
  OnboardingDialog,
  shouldShowOnboarding,
} from "@/components/submission/onboarding-dialog";
import { SubmissionSummary } from "@/components/submission/submission-summary";
import {
  calculateProgress,
  type ProgressResult,
} from "@/lib/submission-progress";
import { SecurityNotice } from "@/components/submission/security-notice";
import {
  useAutoFocus,
  useKeyboardNavigation,
} from "@/lib/submission/use-auto-focus";
import { LogoColorSelector } from "@/components/submission/logo-style-selector";
import {
  WizardContainer,
  WizardModeSelector,
} from "@/components/submission/wizard";

export default function MobileSubmissionPage() {
  const { data: session } = useSession();
  const [submission, setSubmission] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [activeSection, setActiveSection] = useState<
    "basic" | "print" | "marketing" | "website"
  >("basic");
  const [uploading, setUploading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [progress, setProgress] = useState<ProgressResult | null>(null);
  // Sprint 3: Wizard 모드 상태
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Sprint 2: 자동 포커스 및 키보드 네비게이션 (Tab 모드에서만)
  useAutoFocus({
    activeTab: activeSection,
    submission,
    enabled: !showOnboarding && !showSummary && !isWizardMode,
  });
  useKeyboardNavigation();

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

        // 진행률 계산
        if (session?.user) {
          const progressData = calculateProgress(data, {
            이름: (session.user as any).이름 || session.user.name || "",
            연락처: (session.user as any).연락처 || "",
          });
          setProgress(progressData);
        }

        // 온보딩 다이얼로그 표시 여부 확인 (첫 방문 사용자)
        if (shouldShowOnboarding(data)) {
          setShowOnboarding(true);
        }
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

    // 프로필 사진: presigned 직접 업로드 (원본→슬랙, webp 200KB→R2, 최대 20MB)
    if (field === "프로필사진URL") {
      try {
        const url = await uploadProfilePhoto(file);
        await updateSubmission(field, url);
      } catch (err) {
        alert(toUploadMessage(err));
      } finally {
        setUploading(false);
      }
      return;
    }

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
  const progressPercentage = Math.round(
    (completedCount / requiredFields.length) * 100,
  );

  // 섹션 네비게이션
  const sections = [
    { id: "basic", label: "기본 정보", icon: "📄" },
    { id: "print", label: "인쇄물", icon: "🖨️" },
    { id: "marketing", label: "마케팅", icon: "📱" },
    { id: "website", label: "홈페이지", icon: "🌐" },
  ] as const;

  // Sprint 3: 파일 업로드 핸들러 (Wizard 모드용)
  const handleWizardFileUpload = useCallback(
    async (field: string, file: File) => {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("field", field);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (res.ok) {
          const data = await res.json();
          setFormData((prev: any) => ({ ...prev, [field]: data.url }));
          await updateSubmission(field, data.url);
        } else {
          throw new Error("Upload failed");
        }
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  // Sprint 3: 모드 선택 핸들러
  const handleModeSelect = (mode: "wizard" | "tab") => {
    setIsWizardMode(mode === "wizard");
    setShowModeSelector(false);
  };

  // Sprint 3: Wizard 모드 렌더링
  if (isWizardMode) {
    return (
      <>
        <WizardContainer
          submission={submission}
          formData={formData}
          onInputChange={handleInputChange}
          onFileUpload={handleWizardFileUpload}
          onSubmit={handleManualSave}
          lastSaved={
            autoSaveState.lastSaved ? new Date(autoSaveState.lastSaved) : null
          }
          isSaving={autoSaveState.isSaving}
          onModeChange={(wizardMode) => setIsWizardMode(wizardMode)}
        />

        {/* 업로드 중 오버레이 */}
        {uploading && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm mx-4">
              <Loader2 className="w-12 h-12 animate-spin text-gold-600" />
              <p className="text-lg font-bold text-gray-900">
                파일 업로드 중...
              </p>
              <p className="text-sm text-gray-500 text-center">
                잠시만 기다려주세요
              </p>
            </div>
          </div>
        )}

        {/* 모드 선택 다이얼로그 */}
        <WizardModeSelector
          open={showModeSelector}
          onSelect={handleModeSelect}
          hasExistingData={!!submission?.브랜드명}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 mobile-compact-form">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 헤더 - 모바일 컴팩트 */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              자료 제출
            </h1>
            {/* Sprint 3: Wizard 모드 전환 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWizardMode(true)}
              className="flex items-center gap-1 h-7 text-xs px-2"
            >
              <Wand2 className="w-3 h-3" />
              <span className="hidden sm:inline">단계별 안내</span>
            </Button>
          </div>
          {/* 자동 저장 상태 - 인라인 */}
          <div className="flex items-center gap-1.5">
            {autoSaveState.isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-gold-600" />
                <span className="text-xs text-gray-500">저장 중...</span>
              </>
            ) : autoSaveState.lastSaved ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-xs text-gray-500">
                  저장됨:{" "}
                  {new Date(autoSaveState.lastSaved).toLocaleTimeString(
                    "ko-KR",
                  )}
                </span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">자동 저장 대기</span>
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

        {/* 다음 단계 힌트 및 현황 확인 버튼 */}
        {progress && progress.nextAction && progressPercentage < 100 && (
          <div
            onClick={() => {
              if (progress.nextAction?.href) {
                const [tab] = progress.nextAction.href.split("#");
                const sectionMap: Record<
                  string,
                  "basic" | "print" | "marketing" | "website"
                > = {
                  basic: "basic",
                  logo: "print",
                  print: "print",
                  website: "website",
                  marketing: "marketing",
                };
                setActiveSection(sectionMap[tab] || "basic");
              }
            }}
            className="p-2 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer active:bg-amber-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-medium text-xs">
                  다음 단계:
                </span>
                <span className="text-amber-800 text-xs">
                  {progress.nextAction.message}
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-amber-600" />
            </div>
          </div>
        )}

        {/* 현황 확인 - 인라인 링크 */}
        {progress && progressPercentage > 0 && (
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            <CheckCircle2 className="w-3 h-3" />
            제출 현황 확인
          </button>
        )}

        {/* 섹션 네비게이션 - 모바일 컴팩트 */}
        <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm">
          <div className="grid grid-cols-4 gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5",
                  "py-1.5 px-1 rounded-md font-medium text-xs transition-all",
                  "active:scale-95",
                  activeSection === section.id
                    ? "bg-navy-900 text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                )}
              >
                <span className="text-sm">{section.icon}</span>
                <span className="text-[10px] leading-tight">
                  {section.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 기본 정보 */}
        {activeSection === "basic" && (
          <Card className="border border-gray-200">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base text-gray-900">
                기본 정보
              </CardTitle>
              <CardDescription>
                인쇄물에 들어갈 기본 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="space-y-1">
                <Label htmlFor="브랜드명">
                  브랜드명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="브랜드명"
                  value={formData.브랜드명 || ""}
                  onChange={(e) =>
                    handleInputChange("브랜드명", e.target.value)
                  }
                  placeholder="브랜드명을 입력하세요"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="업종">
                  업종 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="업종"
                  value={formData.업종 || ""}
                  onChange={(e) => handleInputChange("업종", e.target.value)}
                  placeholder="업종을 입력하세요"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="주소">
                  주소 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="주소"
                  value={formData.주소 || ""}
                  onChange={(e) => handleInputChange("주소", e.target.value)}
                  placeholder="주소를 입력하세요"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="대표번호">대표번호</Label>
                  <Input
                    id="대표번호"
                    value={formData.대표번호 || ""}
                    onChange={(e) =>
                      handleInputChange("대표번호", e.target.value)
                    }
                    placeholder="010-1234-5678"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="이메일">이메일</Label>
                  <Input
                    id="이메일"
                    type="email"
                    value={formData.이메일 || ""}
                    onChange={(e) =>
                      handleInputChange("이메일", e.target.value)
                    }
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="은행명">은행명</Label>
                  <Input
                    id="은행명"
                    value={formData.은행명 || ""}
                    onChange={(e) =>
                      handleInputChange("은행명", e.target.value)
                    }
                    placeholder="예: 국민은행"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="계좌번호">계좌번호</Label>
                  <Input
                    id="계좌번호"
                    value={formData.계좌번호 || ""}
                    onChange={(e) =>
                      handleInputChange("계좌번호", e.target.value)
                    }
                    placeholder="123-45-678910"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="인쇄물받을주소">인쇄물 받을 주소</Label>
                <Input
                  id="인쇄물받을주소"
                  value={formData.인쇄물받을주소 || ""}
                  onChange={(e) =>
                    handleInputChange("인쇄물받을주소", e.target.value)
                  }
                  placeholder="인쇄물 배송받을 주소"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 인쇄물 */}
        {activeSection === "print" && (
          <div className="space-y-3">
            <Card className="border border-gray-200">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base text-gray-900">
                  필수 서류
                </CardTitle>
                <CardDescription>
                  사업자등록증과 프로필 사진을 업로드해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
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
                  helpText="정면 사진 권장 (최대 20MB)"
                  allowCamera
                  maxSize={20}
                />
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base text-gray-900">
                  로고 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                {/* 로고 제작 핵심 정책 (A안 컴팩트) */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-3">
                  <div className="flex items-start gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-900 leading-tight">
                        로고 제작 핵심 정책
                      </h4>
                      <p className="text-[10px] text-red-700 mt-0.5">
                        시안 요청 전 반드시 확인
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="bg-white rounded-md p-2 border-l-4 border-red-500 text-[11px] leading-snug">
                      <span className="text-red-500 font-bold mr-1">1</span>
                      <span className="text-gray-900">
                        시안 수정은 총{" "}
                        <span className="font-bold text-red-600">2회</span>
                        까지만 제공 · 2차 수정안 수신 후{" "}
                        <span className="font-bold">자동 확정</span>
                      </span>
                    </div>
                    <div className="bg-white rounded-md p-2 border-l-4 border-red-500 text-[11px] leading-snug">
                      <span className="text-red-500 font-bold mr-1">2</span>
                      <span className="text-gray-900">
                        2회 초과 추가 수정 시{" "}
                        <span className="font-bold text-red-600">
                          건당 22,000원
                        </span>{" "}
                        (VAT 포함)
                      </span>
                    </div>
                    <div className="bg-white rounded-md p-2 border-l-4 border-red-500 text-[11px] leading-snug">
                      <span className="text-red-500 font-bold mr-1">3</span>
                      <span className="text-gray-900">
                        <span className="font-bold">3~4개 시안 요구 불가</span>{" "}
                        · 구체적 요청사항 필수 · 2회 후 미만족 시{" "}
                        <span className="font-bold">외부 제작 파일 전달</span>
                      </span>
                    </div>
                  </div>
                </div>

                <MobileFileUpload
                  label="로고 파일 (있는 경우)"
                  accept="image/*"
                  currentFileUrl={submission?.로고URL}
                  onUpload={(file) => handleFileUpload("로고URL", file)}
                  helpText="로고가 있다면 업로드해주세요"
                  allowCamera
                />

                <div className="space-y-1">
                  <Label htmlFor="로고선호스타일">로고 선호 스타일</Label>
                  <Input
                    id="로고선호스타일"
                    value={formData.로고선호스타일 || ""}
                    onChange={(e) =>
                      handleInputChange("로고선호스타일", e.target.value)
                    }
                    placeholder="예: 심플하고 모던한 느낌"
                  />
                </div>

                {/* 로고 선호 색상 - PRD D-3 비주얼 선택 UI */}
                <div className="space-y-1">
                  <LogoColorSelector
                    value={formData.로고선호색상 || ""}
                    onChange={(value) =>
                      handleInputChange("로고선호색상", value)
                    }
                    disabled={submission?.isComplete}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="로고선호폰트">로고 선호 폰트</Label>
                  <Input
                    id="로고선호폰트"
                    value={formData.로고선호폰트 || ""}
                    onChange={(e) =>
                      handleInputChange("로고선호폰트", e.target.value)
                    }
                    placeholder="예: 깔끔한 고딕체"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base text-gray-900">
                  SMS 발신 등록 서류
                </CardTitle>
                <CardDescription>
                  SMS 발신번호 등록에 필요한 서류를 업로드해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
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
                  onUpload={(file) =>
                    handleFileUpload("통신서비스이용증명원URL", file)
                  }
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
          <Card className="border border-gray-200">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base text-gray-900">
                마케팅 정보
              </CardTitle>
              <CardDescription>
                메타광고, 네이버 광고, 인스타그램 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {/* Sprint 2: 민감정보 안심 UI (모바일 컴팩트) */}
              <SecurityNotice type="marketing" compact />

              <div className="space-y-1">
                <Label htmlFor="메타광고관리자값">메타광고 관리자 값</Label>
                <Input
                  id="메타광고관리자값"
                  value={formData.메타광고관리자값 || ""}
                  onChange={(e) =>
                    handleInputChange("메타광고관리자값", e.target.value)
                  }
                  placeholder="초대 링크 또는 계정 정보"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="네이버검색광고ID">네이버 검색광고 ID</Label>
                <Input
                  id="네이버검색광고ID"
                  value={formData.네이버검색광고ID || ""}
                  onChange={(e) =>
                    handleInputChange("네이버검색광고ID", e.target.value)
                  }
                  placeholder="네이버 광고 ID"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="InstagramID">Instagram ID</Label>
                <Input
                  id="InstagramID"
                  value={formData.InstagramID || ""}
                  onChange={(e) =>
                    handleInputChange("InstagramID", e.target.value)
                  }
                  placeholder="인스타그램 아이디"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="InstagramPW">Instagram 비밀번호</Label>
                <Input
                  id="InstagramPW"
                  type="password"
                  value={formData.InstagramPW || ""}
                  onChange={(e) =>
                    handleInputChange("InstagramPW", e.target.value)
                  }
                  placeholder="비밀번호"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 홈페이지 */}
        {activeSection === "website" && (
          <Card className="border border-gray-200">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base text-gray-900">
                홈페이지 제작 정보
              </CardTitle>
              <CardDescription>
                홈페이지 컬러 컨셉을 선택해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="space-y-1">
                <Label htmlFor="홈페이지컬러컨셉">
                  컬러 컨셉 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="홈페이지컬러컨셉"
                  value={formData.홈페이지컬러컨셉 || ""}
                  onChange={(e) =>
                    handleInputChange("홈페이지컬러컨셉", e.target.value)
                  }
                  placeholder="예: 블루 계열, 심플하고 깔끔한 느낌"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 수동 저장 버튼 */}
        <Button
          onClick={handleManualSave}
          className="w-full h-10 text-sm font-semibold bg-navy-900 hover:bg-navy-800 active:scale-98"
        >
          <Save className="w-4 h-4 mr-1.5" />
          저장하기
        </Button>
      </div>

      {/* 업로드 중 오버레이 */}
      {uploading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm mx-4">
            <Loader2 className="w-12 h-12 animate-spin text-gold-600" />
            <p className="text-lg font-bold text-gray-900">파일 업로드 중...</p>
            <p className="text-sm text-gray-500 text-center">
              잠시만 기다려주세요
            </p>
          </div>
        </div>
      )}

      {/* 온보딩 다이얼로그 */}
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
      />

      {/* 제출 요약 다이얼로그 */}
      {progress && (
        <SubmissionSummary
          open={showSummary}
          onOpenChange={setShowSummary}
          sections={progress.sections}
          overallPercentage={progress.overallPercentage}
          onNavigateToSection={(href) => {
            const [tab] = href.split("#");
            // 모바일에서는 탭이 아닌 섹션 이름으로 매핑
            const sectionMap: Record<
              string,
              "basic" | "print" | "marketing" | "website"
            > = {
              basic: "basic",
              logo: "print",
              print: "print",
              website: "website",
              marketing: "marketing",
            };
            setActiveSection(sectionMap[tab] || "basic");
          }}
        />
      )}
    </div>
  );
}
