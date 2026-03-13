"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Square,
  CreditCard,
  ExternalLink,
  Shield,
} from "lucide-react";
import { SLACK_ONLY_MARKER } from "@/lib/constants/sensitiveFields";
import imageCompression from "browser-image-compression";
// ProgressBar removed - progress integrated into tab triggers
import {
  calculateProgress,
  type ProgressResult,
} from "@/lib/submission-progress";
import {
  MobileStepBar,
  MobileStepNavigation,
} from "@/components/ui/mobile-step-bar";
import {
  OnboardingDialog,
  shouldShowOnboarding,
} from "@/components/submission/onboarding-dialog";
import { SubmissionSummary } from "@/components/submission/submission-summary";
import {
  SecurityNotice,
  DataUsageNotice,
} from "@/components/submission/security-notice";
import { Celebration, useCelebration } from "@/components/ui/celebration";
import {
  useAutoFocus,
  useKeyboardNavigation,
} from "@/lib/submission/use-auto-focus";
import { LogoColorSelector } from "@/components/submission/logo-style-selector";
import { MySubmissionStatus } from "@/components/submission/my-submission-status";
import { ChevronDown, ChevronUp } from "lucide-react";
// ColorPaletteSelector는 홈페이지 탭 추가 시 사용 예정

export default function SubmissionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [hasWorkflows, setHasWorkflows] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [requestingPrint, setRequestingPrint] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

  // 섹션별 수정 상태
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [isEditingFiles, setIsEditingFiles] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isEditingNamecard, setIsEditingNamecard] = useState(false);
  const [isEditingMarketing, setIsEditingMarketing] = useState(false);

  // 로고 선택 상태
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedFont, setSelectedFont] = useState<string>("");
  const [logoPreferenceColor, setLogoPreferenceColor] = useState<string>("");

  // 명함 상태
  const [businessCardColor, setBusinessCardColor] = useState<string>("#3B82F6");
  const [selectedNamecard, setSelectedNamecard] = useState<string>("");
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 진행률 상태
  const [progress, setProgress] = useState<ProgressResult | null>(null);

  // 연락처 상태 (사용자 로그인 아이디)
  const [userPhone, setUserPhone] = useState<string>("");

  // 다이얼로그 상태
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // 내 접수 현황 표시 상태
  const [showMyStatus, setShowMyStatus] = useState(false);

  // 탭 상태 - URL 쿼리 파라미터에서 가져오기
  const activeTab = searchParams.get("tab") || "basic";

  // Sprint 2: 자동 포커스 및 키보드 네비게이션
  useAutoFocus({
    activeTab,
    submission,
    enabled: !showOnboarding && !showSummary,
  });
  useKeyboardNavigation();

  // Sprint 2: 축하 애니메이션
  const {
    showCelebration,
    celebrationMessage,
    checkSectionCompletion,
    closeCelebration,
  } = useCelebration();

  // 탭 변경 함수 - URL 쿼리 파라미터 업데이트
  const handleTabChange = (tab: string) => {
    router.push(`/dashboard/submission?tab=${tab}`);
  };

  // URL이 변경되면 해당 섹션으로 스크롤
  useEffect(() => {
    const hash = window.location.hash.substring(1); // # 제거
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // 추가 여백을 위해 약간 위로 스크롤
          setTimeout(() => {
            window.scrollBy({ top: -100, behavior: "smooth" });
          }, 300);
        }
      }, 300);
    }
  }, [activeTab]); // activeTab이 변경될 때마다 실행

  // 세션에서 연락처 초기화
  useEffect(() => {
    if (session?.user) {
      const phone = (session.user as any).연락처 || "";
      setUserPhone(phone);
    }
  }, [session]);

  // 제출 데이터 및 워크플로우 로드
  useEffect(() => {
    fetchSubmission();
    fetchWorkflows();
    fetchDeadline();
  }, []);

  // Sprint 2: 섹션 완료 시 축하 애니메이션 트리거
  // 무한 루프 방지: sections 배열의 isComplete 값만 직렬화하여 비교
  const sectionsKey = useMemo(() => {
    if (!progress?.sections) return "";
    return progress.sections.map((s) => `${s.name}:${s.isComplete}`).join(",");
  }, [progress?.sections]);

  useEffect(() => {
    if (progress?.sections && sectionsKey) {
      checkSectionCompletion(progress.sections);
    }
  }, [sectionsKey, checkSectionCompletion, progress?.sections]);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data || []);
        setHasWorkflows(data && data.length > 0);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    }
  };

  const fetchDeadline = async () => {
    try {
      const res = await fetch("/api/cohort/deadline");
      if (res.ok) {
        const data = await res.json();
        if (data.deadline) {
          const deadline = new Date(data.deadline);
          setDeadlineDate(deadline);

          // 현재 날짜와 비교
          const now = new Date();
          now.setHours(0, 0, 0, 0); // 시간 제거
          deadline.setHours(0, 0, 0, 0); // 시간 제거

          setIsDeadlinePassed(now > deadline);
        }
      }
    } catch (error) {
      console.error("Failed to fetch deadline:", error);
    }
  };

  // 기본 정보 완료 여부 확인 (슬랙 채널 생성 조건)
  const isBasicInfoComplete = () => {
    if (!submission) return false;
    // 필수 필드: 브랜드명, 업종, 주소
    return !!(submission.브랜드명 && submission.업종 && submission.주소);
  };

  // 로고 시안이 확정되었는지 확인
  const isLogoConfirmed = () => {
    const logoWorkflow = workflows.find((w: any) => w.type === "로고");
    if (!logoWorkflow) return false;
    // 최종확정 또는 발주완료(기존 상태) = 로고 시안 최종 확정 상태
    return (
      logoWorkflow.status === "최종확정" || logoWorkflow.status === "발주완료"
    );
  };

  // submission 데이터가 변경되면 선택 상태 업데이트
  useEffect(() => {
    if (submission) {
      setSelectedStyle(submission.로고선호스타일 || "");
      setSelectedFont(submission.로고선호폰트 || "");
      setLogoPreferenceColor(submission.로고선호색상 || "");
      setBusinessCardColor(submission.명함색상 || "#3B82F6");
      setSelectedNamecard(submission.명함시안 || "");
      setSelectedContract(submission.계약서시안 || "");
    }
  }, [submission]);

  const fetchSubmission = async () => {
    try {
      const res = await fetch("/api/submission");
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
        calculateCompletionRate(data);

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

        // 각 섹션별로 데이터 유무를 확인하여 편집 모드 설정
        // 데이터가 없으면 편집 모드(true), 있으면 읽기 모드(false)
        if (data) {
          const hasBasic = data.브랜드명 || data.업종 || data.주소;
          const hasLogo =
            data.로고선호스타일 || data.로고선호폰트 || data.명함색상;
          const hasNamecard = data.명함시안;
          const hasMarketing =
            data.네이버검색광고ID ||
            data.네이버검색광고PW ||
            data.네이버클라우드ID ||
            data.네이버클라우드PW ||
            data.InstagramID ||
            data.GmailID;

          setIsEditingBasicInfo(!hasBasic);
          setIsEditingBusiness(true); // 사업자 정보는 항상 편집 가능
          setIsEditingFiles(true); // 파일은 항상 편집 가능
          setIsEditingLogo(!hasLogo);
          setIsEditingNamecard(!hasNamecard);
          setIsEditingMarketing(!hasMarketing);
        } else {
          // 데이터가 없으면 모두 편집 모드로 (true = 편집 모드)
          setIsEditingBasicInfo(true);
          setIsEditingBusiness(true);
          setIsEditingFiles(true);
          setIsEditingLogo(true);
          setIsEditingNamecard(true);
          setIsEditingMarketing(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    }
  };

  // 각 섹션별로 데이터가 있는지 확인
  const hasBasicInfo = () => {
    return (
      submission && (submission.브랜드명 || submission.업종 || submission.주소)
    );
  };

  const hasLogoInfo = () => {
    return (
      submission &&
      (submission.로고선호스타일 ||
        submission.로고선호폰트 ||
        submission.명함색상)
    );
  };

  const hasNamecardInfo = () => {
    return submission && submission.명함시안;
  };

  const hasMarketingInfo = () => {
    return (
      submission &&
      (submission.네이버검색광고ID ||
        submission.네이버검색광고PW ||
        submission.네이버클라우드ID ||
        submission.네이버클라우드PW ||
        submission.InstagramID ||
        submission.GmailID)
    );
  };

  const calculateCompletionRate = (data: any) => {
    const requiredFields = [
      "브랜드명",
      "업종",
      "주소",
      "사업자등록증URL",
      "프로필사진URL",
      "명함시안",
    ];

    const completedFields = requiredFields.filter(
      (field) => data[field],
    ).length;
    const rate = Math.round((completedFields / requiredFields.length) * 100);
    setCompletionRate(rate);
  };

  const handleFileUpload = async (field: string, file: File) => {
    setUploading(true);

    // 사업자등록증URL 또는 프로필사진URL 필드이고 이미지인 경우 자동 압축
    if (
      (field === "사업자등록증URL" || field === "프로필사진URL") &&
      file.type.startsWith("image/") &&
      file.type !== "image/gif"
    ) {
      try {
        console.log(
          `[압축] 원본 파일 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        );

        const options = {
          maxSizeMB: 2, // 최대 2MB로 압축
          maxWidthOrHeight: 1920, // 최대 해상도
          useWebWorker: true,
          fileType: file.type,
        };

        const compressedFile = await imageCompression(file, options);
        console.log(
          `[압축] 압축 후 파일 크기: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
        );

        // 압축된 파일로 교체
        file = new File([compressedFile], file.name, {
          type: compressedFile.type,
          lastModified: Date.now(),
        });
      } catch (compressionError) {
        console.error("[압축] 이미지 압축 실패:", compressionError);
        // 압축 실패 시 원본 파일 사용
      }
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);

    try {
      console.log(
        "[클라이언트] 파일 업로드 시작:",
        field,
        file.name,
        "크기:",
        file.size,
        "타입:",
        file.type,
      );
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("[클라이언트] 응답 상태:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("[클라이언트] 업로드 성공, URL:", data.url);

        const success = await updateSubmission(field, data.url);
        if (success) {
          console.log("[클라이언트] DB 저장 성공");
          alert("파일이 성공적으로 업로드되었습니다!");
        } else {
          console.error("[클라이언트] DB 저장 실패");
          alert("파일 업로드는 성공했지만 저장에 실패했습니다.");
        }
      } else {
        const errorData = await res.json();
        console.error("[클라이언트] 업로드 실패:", errorData);

        let errorMessage = "파일 업로드에 실패했습니다.";
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.details) {
          errorMessage += "\n상세: " + errorData.details;
        }

        alert(errorMessage);
      }
    } catch (error) {
      console.error("[클라이언트] 네트워크 오류:", error);
      alert(
        "파일 업로드 중 네트워크 오류가 발생했습니다.\n인터넷 연결을 확인해주세요.",
      );
    } finally {
      setUploading(false);
    }
  };

  const updateSubmission = async (field: string, value: any) => {
    try {
      console.log("Updating submission:", { [field]: value });
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        await fetchSubmission();
        return true;
      } else {
        const errorData = await res.json();
        console.error("API error response:", errorData);
        console.error("Status:", res.status);
      }
      return false;
    } catch (error) {
      console.error("Update failed:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent, section: string) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    console.log(`📤 [제출정보 저장] 섹션: ${section}`);
    console.log("📋 FormData 수집 결과:", data);

    // 로고 섹션 저장 시 색상 필수 검증
    if (section === "logo") {
      const logoColor = data.명함색상 as string;
      if (!logoColor || logoColor.trim() === "" || logoColor === "#3B82F6") {
        alert(
          "로고/명함 색상을 선택해주세요!\n\n컬러피커에서 원하는 색상을 선택한 후 저장해주세요.",
        );
        return;
      }
    }

    // 기본정보 섹션 저장 시 연락처 검증
    if (section === "basic") {
      const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
      if (!phoneRegex.test(userPhone)) {
        alert(
          "올바른 전화번호 형식이 아닙니다.\n예: 010-1234-5678 또는 01012345678",
        );
        return;
      }
    }

    setLoading(true);

    try {
      // 기본정보 섹션 저장 시 연락처도 함께 업데이트
      if (section === "basic" && userPhone) {
        const phoneUpdateRes = await fetch("/api/admin/users/update-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session?.user?.id,
            연락처: userPhone,
          }),
        });

        if (!phoneUpdateRes.ok) {
          const errorData = await phoneUpdateRes.json();
          alert(errorData.error || "전화번호 수정에 실패했습니다.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchSubmission();

        // 섹션별로 수정 모드 종료
        switch (section) {
          case "basic":
            setIsEditingBasicInfo(false);
            break;
          case "business":
            setIsEditingBusiness(false);
            break;
          case "files":
            setIsEditingFiles(false);
            break;
          case "logo":
            setIsEditingLogo(false);
            break;
          case "namecard":
            setIsEditingNamecard(false);
            break;
          case "marketing":
            setIsEditingMarketing(false);
            break;
        }

        alert("저장되었습니다!");
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Submit failed:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintRequest = async () => {
    if (completionRate !== 100) {
      alert("필수 자료를 모두 제출해주세요.");
      return;
    }

    if (
      !confirm(
        "디자인 시안 제작을 요청하시겠습니까?\n\n요청 후에는 제출 자료를 수정할 수 없습니다.",
      )
    ) {
      return;
    }

    setRequestingPrint(true);
    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: true }),
      });

      if (res.ok) {
        await fetchSubmission();
        await fetchWorkflows();
        alert(
          "디자인 시안 제작요청이 완료되었습니다!\n\n오전 11시 이전: 영업일 2일차\n오전 11시 이후: 영업일 3일차\n\n시안 전달 예정일을 확인해주세요.",
        );
      } else {
        alert("제작요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Print request failed:", error);
      alert("제작요청 중 오류가 발생했습니다.");
    } finally {
      setRequestingPrint(false);
    }
  };

  return (
    <div className="space-y-4 overflow-x-hidden w-full max-w-full">
      {/* 헤더 + 진행률 한 줄 */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          자료 제출
        </h1>
        {isDeadlinePassed && deadlineDate && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded-full text-xs text-yellow-800 font-medium">
            <AlertCircle className="w-3 h-3" />
            마감일 경과 (
            {deadlineDate.toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
            })}
            )
          </span>
        )}
        {!submission?.isComplete && submission && (
          <span className="text-xs text-gray-500 ml-auto">
            완성도{" "}
            <span className="font-bold text-gold-600">{completionRate}%</span>
          </span>
        )}
        {progress && progress.overallPercentage > 0 && (
          <button
            onClick={() => setShowSummary(true)}
            className="text-xs text-gold-600 hover:underline flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            현황 확인
          </button>
        )}
        {submission && (
          <button
            onClick={() => setShowMyStatus(!showMyStatus)}
            className="text-xs text-gray-500 hover:text-gold-600 flex items-center gap-1"
          >
            📋 내 접수 현황
            {showMyStatus ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* 진행률: 헤더 완성도%에 통합, 탭 트리거에 미니 바 표시 */}

      {/* 상태 배너 */}
      {submission?.isComplete ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-green-700 font-medium text-sm flex-1">
              이미 제작요청이 접수되었습니다.
            </p>
          </div>
          {workflows
            .filter((w: any) => w.시안업로드일)
            .map((w: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-green-700 text-sm">
                  {w.type} 시안 전달 완료:{" "}
                  {new Date(w.시안업로드일).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                  {w.발주승인일 && (
                    <span className="ml-2 text-green-600">
                      · 발주 완료:{" "}
                      {new Date(w.발주승인일).toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </span>
                  )}
                </p>
              </div>
            ))}
          {workflows.some((w: any) => !w.시안업로드일 && w.type !== "로고") &&
            submission.시안예정일 && (
              <div className="flex items-center gap-2 p-2.5 bg-gold-50 border border-gold-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-gold-600 flex-shrink-0" />
                <p className="text-navy-700 text-sm font-medium">
                  {new Date(submission.시안예정일).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  시안 전달 예정
                </p>
              </div>
            )}
        </div>
      ) : submission ? (
        <div className="flex items-center gap-3 p-2.5 bg-gold-50 border border-gold-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-gold-600 flex-shrink-0" />
          <p className="text-navy-700 text-sm flex-1">
            각 카테고리별 필요한 자료를 제출해주세요. 디자인 제작요청 전까지
            언제든 수정 가능합니다.
          </p>
          {completionRate === 100 && !hasWorkflows && (
            <Button
              onClick={handlePrintRequest}
              disabled={requestingPrint || hasWorkflows}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex-shrink-0"
            >
              {requestingPrint ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              )}
              제작요청
            </Button>
          )}
        </div>
      ) : null}

      {/* 내 접수 현황 토글 */}
      {submission && (
        <div className="mb-2">
          {showMyStatus && (
            <div className="mt-2 animate-in slide-in-from-top-2 duration-300">
              <MySubmissionStatus
                submission={submission}
                workflows={workflows}
                user={{
                  이름:
                    (session?.user as any)?.이름 || session?.user?.name || "",
                  연락처: userPhone,
                }}
                onNavigateToSection={(tab, hash) => {
                  setShowMyStatus(false);
                  if (hash) {
                    router.push(`/dashboard/submission?tab=${tab}#${hash}`);
                  } else {
                    handleTabChange(tab);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6 w-full"
      >
        {/* 모바일 스텝 진행 바 */}
        <MobileStepBar
          steps={[
            { id: "basic", label: "기본 정보", shortLabel: "기본" },
            { id: "logo", label: "로고", shortLabel: "로고" },
            { id: "print", label: "인쇄물", shortLabel: "인쇄물" },
            { id: "marketing", label: "마케팅", shortLabel: "마케팅" },
          ]}
          currentStep={activeTab}
          completedSteps={[
            ...(isBasicInfoComplete() ? ["basic"] : []),
            ...(submission?.로고선호스타일 ? ["logo"] : []),
            ...(submission?.명함시안 ? ["print"] : []),
          ]}
          onStepClick={handleTabChange}
          disabledSteps={!isBasicInfoComplete() ? ["logo", "print"] : []}
        />

        {/* 탭 네비게이션 + 섹션별 미니 진행률 - 데스크탑 */}
        <TabsList className="hidden md:grid bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm grid-cols-4 gap-1 h-auto">
          {[
            {
              value: "basic",
              icon: "📄",
              label: "기본 정보",
              disabled: false,
              sections: progress?.sections.filter(
                (s) => s.name === "브랜드정보",
              ),
            },
            {
              value: "logo",
              icon: "🎨",
              label: "로고",
              disabled: !isBasicInfoComplete(),
              sections: progress?.sections.filter((s) => s.name === "로고"),
            },
            {
              value: "print",
              icon: "🖨️",
              label: "인쇄물",
              disabled: !isBasicInfoComplete(),
              sections: progress?.sections.filter((s) =>
                ["사업자등록증", "프로필사진", "명함스타일"].includes(s.name),
              ),
            },
            {
              value: "marketing",
              icon: "📱",
              label: "마케팅",
              disabled: false,
              sections: progress?.sections.filter((s) => s.name === "마케팅"),
            },
          ].map((tab) => {
            const completed =
              tab.sections?.reduce((sum, s) => sum + s.completed, 0) || 0;
            const total =
              tab.sections?.reduce((sum, s) => sum + s.total, 0) || 1;
            const pct = Math.round((completed / total) * 100);
            const allDone = tab.sections?.every((s) => s.isComplete) ?? false;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className="data-[state=active]:bg-navy-900 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm py-1.5 flex flex-col gap-1"
                title={tab.disabled ? "기본 정보를 먼저 완성해주세요" : ""}
              >
                <span>
                  {tab.icon} {tab.label}
                </span>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${allDone ? "bg-green-500" : pct > 0 ? "bg-amber-400" : "bg-gray-200"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* 기본 정보 */}
        <TabsContent value="basic" id="basic">
          <Card className="glass border-white/10">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-gray-900 text-base">
                  기본 정보
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">
                  인쇄물에 들어갈 기본 정보를 입력해주세요
                </CardDescription>
                {!submission?.isComplete && !isBasicInfoComplete() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-xs text-amber-800">
                    <AlertCircle className="w-3 h-3" />
                    필수 항목 미완성 (브랜드명, 업종, 주소)
                  </span>
                )}
                {!submission?.isComplete && isBasicInfoComplete() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 border border-green-300 rounded-full text-xs text-green-800">
                    <CheckCircle2 className="w-3 h-3" />
                    완성
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form
                key={`basic-${submission?.브랜드명}-${isEditingBasicInfo}`}
                onSubmit={(e) => handleSubmit(e, "basic")}
                className="space-y-4"
              >
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div id="brand-section" className="space-y-2">
                    <Label htmlFor="브랜드명" className="text-sm sm:text-base">
                      브랜드명 *
                    </Label>
                    <Input
                      id="브랜드명"
                      name="브랜드명"
                      defaultValue={submission?.브랜드명}
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="업종" className="text-sm sm:text-base">
                      업종 *
                    </Label>
                    <Input
                      id="업종"
                      name="업종"
                      defaultValue={submission?.업종}
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="연락처" className="text-sm sm:text-base">
                      연락처 (로그인 아이디) *
                    </Label>
                    <Input
                      id="연락처"
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                    <p className="text-xs text-gray-500">
                      로그인 시 사용하는 전화번호입니다
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="대표번호" className="text-sm sm:text-base">
                      대표번호
                    </Label>
                    <Input
                      id="대표번호"
                      name="대표번호"
                      defaultValue={submission?.대표번호}
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="이메일" className="text-sm sm:text-base">
                      이메일
                    </Label>
                    <Input
                      id="이메일"
                      name="이메일"
                      type="email"
                      defaultValue={submission?.이메일}
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="주소" className="text-sm sm:text-base">
                      사업장 주소 *
                    </Label>
                    <Input
                      id="주소"
                      name="주소"
                      defaultValue={submission?.주소}
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="은행명"
                      className="text-sm sm:text-base break-words"
                    >
                      은행명 (고객이 입금할 계좌번호입니다.)
                    </Label>
                    <Input
                      id="은행명"
                      name="은행명"
                      defaultValue={submission?.은행명}
                      placeholder="예: 국민은행"
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="계좌번호" className="text-sm sm:text-base">
                      계좌번호
                    </Label>
                    <Input
                      id="계좌번호"
                      name="계좌번호"
                      defaultValue={submission?.계좌번호}
                      placeholder="예: 123-45-678910"
                      disabled={submission?.isComplete || !isEditingBasicInfo}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sameAddress"
                        checked={sameAddress}
                        onChange={(e) => setSameAddress(e.target.checked)}
                        className="w-4 h-4 text-gold-600 border-gray-300 rounded focus:ring-gold-500"
                      />
                      <Label
                        htmlFor="sameAddress"
                        className="text-sm sm:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        사업장 주소와 동일
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="인쇄물받을주소"
                        className="text-sm sm:text-base break-words"
                      >
                        인쇄물 받을 주소
                      </Label>
                      <Input
                        id="인쇄물받을주소"
                        name="인쇄물받을주소"
                        defaultValue={submission?.인쇄물받을주소}
                        placeholder="사업장 주소와 다른 경우만 입력"
                        className="bg-white border-gray-200"
                        disabled={
                          sameAddress ||
                          submission?.isComplete ||
                          !isEditingBasicInfo
                        }
                      />
                    </div>
                  </div>
                </div>
                {!submission?.isComplete && (
                  <div className="flex gap-2">
                    {hasBasicInfo() && !isEditingBasicInfo ? (
                      <Button
                        type="button"
                        onClick={() => setIsEditingBasicInfo(true)}
                        className="bg-amber-600 text-white hover:bg-amber-700 text-sm sm:text-base"
                      >
                        수정하기
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-navy-900 text-white hover:bg-navy-800 text-sm sm:text-base"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        )}
                        저장하기
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 로고 */}
        <TabsContent value="logo" id="logo">
          <Card className="glass border-white/10">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-gray-900 text-base">
                  로고 디자인 정보
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">
                  로고 파일이 있으면 업로드하거나, 선호하는 스타일과 색상을
                  선택해주세요
                </CardDescription>
                {!isBasicInfoComplete() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-xs text-amber-800">
                    <AlertCircle className="w-3 h-3" />
                    기본 정보 먼저 완성해주세요
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form
                key={`logo-${submission?.로고선호스타일}-${isEditingLogo}`}
                onSubmit={(e) => handleSubmit(e, "logo")}
                className="space-y-4"
              >
                {/* 로고 파일 업로드 */}
                <div id="logo-section" className="space-y-2">
                  <Label className="text-sm sm:text-base">
                    로고 파일 (있는 경우)
                  </Label>
                  <p className="text-xs text-gray-500">
                    이미지 파일(JPG, PNG 등) 또는 ZIP 파일을 업로드할 수
                    있습니다
                  </p>
                  {submission?.로고URL ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                          <span className="text-green-700 text-sm sm:text-base">
                            업로드 완료
                          </span>
                        </div>
                        <a
                          href={submission.로고URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 hover:underline"
                        >
                          파일 보기
                        </a>
                      </div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*,.zip"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload("로고URL", e.target.files[0]);
                            }
                          }}
                          disabled={uploading}
                        />
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-gold-500 hover:bg-gold-50 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">
                            파일 변경
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*,.zip"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload("로고URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-gray-300 hover:border-gold-500 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          로고 파일 업로드
                        </span>
                      </div>
                    </label>
                  )}
                </div>

                {/* 로고 선호 스타일 */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Label className="text-sm sm:text-base">
                      로고 선호 스타일
                    </Label>
                    <p className="text-xs text-red-600 font-medium mt-0.5">
                      ※ 로고 선택 후 시안은 심볼형, 워드마크형 중 선택한
                      사항으로만 구성 가능합니다.
                      <br />
                      (심볼형 시안 요청 시 워드마크형 시안 요청 불가)
                    </p>
                  </div>
                  <input
                    type="hidden"
                    name="로고선호스타일"
                    value={selectedStyle}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        name: "심볼형 (도형기반)",
                        description: "도형과 심볼을 활용한 로고",
                        image: "/logo-examples/symbol.png",
                      },
                      {
                        name: "워드마크형 (텍스트)",
                        description: "브랜드명 텍스트 중심 로고",
                        images: [
                          "/logo-examples/wordmark1.png",
                          "/logo-examples/wordmark2.png",
                        ],
                      },
                    ].map((style) => (
                      <button
                        key={style.name}
                        type="button"
                        onClick={() => setSelectedStyle(style.name)}
                        disabled={submission?.isComplete || !isEditingLogo}
                        className={`p-4 rounded-lg border transition-all ${
                          selectedStyle === style.name
                            ? "border-gold-600 bg-gold-50"
                            : "border-gray-300 hover:border-gold-400 hover:bg-white"
                        } ${submission?.isComplete || !isEditingLogo ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex gap-2 items-center justify-center h-24">
                            {style.image ? (
                              <img
                                src={style.image}
                                alt={style.name}
                                className="h-20 w-auto object-contain"
                              />
                            ) : (
                              style.images?.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`${style.name} ${idx + 1}`}
                                  className="h-16 w-auto object-contain"
                                />
                              ))
                            )}
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-sm">
                              {style.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {style.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 로고 선호 폰트 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm sm:text-base">
                      로고 선호 폰트
                    </Label>
                    <a
                      href="https://noonnu.cc/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-gold-600 hover:text-navy-700 hover:underline font-medium flex items-center gap-1"
                    >
                      <span>폰트 찾기 (눈누)</span>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>

                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-amber-700">
                      무료 폰트만 사용 가능
                    </span>
                    합니다. 유료 폰트는 직접 구매 후 파일 전달 필요.
                  </p>

                  <input
                    type="hidden"
                    name="로고선호폰트"
                    value={selectedFont}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: "고딕체 (깔끔한)", style: "font-sans" },
                      { name: "명조체 (전통적인)", style: "font-serif" },
                      { name: "손글씨 (감성적인)", style: "font-cursive" },
                      { name: "모던 (기하학적)", style: "font-mono" },
                    ].map((fontOption) => (
                      <button
                        key={fontOption.name}
                        type="button"
                        onClick={() => setSelectedFont(fontOption.name)}
                        disabled={submission?.isComplete || !isEditingLogo}
                        className={`p-2 rounded-lg border transition-all text-center ${
                          selectedFont === fontOption.name
                            ? "border-gold-600 bg-gold-50"
                            : "border-gray-300 hover:border-gold-400 hover:bg-white"
                        } ${submission?.isComplete || !isEditingLogo ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className={`font-semibold text-xs ${fontOption.style}`}
                        >
                          {fontOption.name}
                        </div>
                        <div className={`text-xl mt-1 ${fontOption.style}`}>
                          Aa
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 로고 선호 색상 선택 - PRD D-3 비주얼 선택 UI */}
                <div className="space-y-3">
                  <input
                    type="hidden"
                    name="로고선호색상"
                    value={logoPreferenceColor}
                  />
                  <LogoColorSelector
                    value={logoPreferenceColor}
                    onChange={setLogoPreferenceColor}
                    disabled={submission?.isComplete || !isEditingLogo}
                  />
                </div>

                {/* 명함 색상 선택 (16진수) */}
                <div className="space-y-3 p-4 rounded-lg border border-orange-300 bg-orange-50/50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <Label
                      htmlFor="명함색상"
                      className="text-sm sm:text-base font-semibold text-orange-900"
                    >
                      명함에 사용할 정확한 색상 코드 *
                    </Label>
                  </div>
                  <p className="text-xs text-orange-700">
                    위에서 선택한 색상 계열을 기반으로, 명함에 사용할 정확한
                    색상을 선택해주세요.
                  </p>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={businessCardColor}
                      onChange={(e) => setBusinessCardColor(e.target.value)}
                      disabled={submission?.isComplete || !isEditingLogo}
                      className="w-20 h-20 rounded-lg border border-orange-400 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        id="명함색상"
                        name="명함색상"
                        value={businessCardColor}
                        onChange={(e) => setBusinessCardColor(e.target.value)}
                        placeholder="#3B82F6"
                        disabled={submission?.isComplete || !isEditingLogo}
                        className="font-mono bg-white border-orange-300"
                        required
                      />
                      <p className="text-xs text-orange-700 font-medium">
                        컬러피커에서 선택하거나 직접 16진수 색상값을 입력하세요
                        (예: #FF5733)
                      </p>
                      <div className="bg-orange-100 border border-orange-300 rounded-md p-2">
                        <p className="text-xs sm:text-sm font-bold text-orange-900 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          필수! 색상을 반드시 선택한 후 &quot;저장하기&quot;
                          버튼을 눌러주세요!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 상세 제작 요청사항 (필수) */}
                <div className="space-y-3 p-4 rounded-lg border border-orange-200 bg-orange-50/50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <Label
                        htmlFor="로고제작요청사항"
                        className="text-sm sm:text-base font-semibold text-orange-900"
                      >
                        상세 제작 요청사항 *
                      </Label>
                      <p className="text-xs text-orange-700 mt-1">
                        이 항목을 작성해야 로고 제작이 시작됩니다. 임시저장은
                        가능하지만, 최종 제출하려면 반드시 작성해주세요.
                      </p>
                    </div>
                  </div>

                  {/* 최우선 강조사항 - 한 줄 압축 */}
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-400">
                    <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                      !
                    </span>
                    <p className="text-xs font-bold text-red-900">
                      ⚠️ 필수: 로고 제작은{" "}
                      <span className="underline decoration-red-500">
                        심볼형 OR 워드마크형 중 한 가지만
                      </span>{" "}
                      선택 가능합니다. (심볼형 선택 시 워드마크형 불가)
                    </p>
                  </div>

                  {/* 작성 가이드 - details 접기 */}
                  <details className="rounded-lg border border-gray-200">
                    <summary className="cursor-pointer px-4 py-2.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 select-none list-none flex items-center gap-2">
                      <span>📝</span>
                      <span>작성 가이드 &amp; 예시 보기</span>
                    </summary>
                    <div className="space-y-3 p-4 bg-white rounded-lg border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 좋은 예시 */}
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-green-700 flex items-center gap-1">
                            ✅ 좋은 예시 (구체적이고 명확한 표현)
                          </p>
                          <ul className="text-xs text-gray-800 space-y-1.5 bg-green-50 p-3 rounded-lg border border-green-200 max-h-[400px] overflow-y-auto">
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                1.
                              </span>
                              <span>
                                <span className="font-bold text-red-700">
                                  로고 형태:
                                </span>{" "}
                                심볼형 선택 - 원형 프레임 안에 클라우드 아이콘
                                배치
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                2.
                              </span>
                              <span>
                                메인 컬러는 파란색 계열(#2563EB), 흰색 배경에서
                                명확히 보이게
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                3.
                              </span>
                              <span>
                                폰트는 산세리프체(고딕체) 사용, 가독성 우선
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                4.
                              </span>
                              <span>
                                심볼은 업종과 연관된 아이콘 (예: IT 기업 -
                                클라우드/데이터 모티브)
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                5.
                              </span>
                              <span>
                                장식 요소 최소화, 선의 굵기는 균일하게 2-3px
                                유지
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                6.
                              </span>
                              <span>
                                그라데이션 지양, 단색으로 인쇄 가능한 디자인
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                7.
                              </span>
                              <span>
                                참고 브랜드: 삼성 (블루 계열), 네이버
                                (심볼+텍스트 조합)
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                8.
                              </span>
                              <span>
                                제외 요소: 빨강/노랑 색상, 세리프체, 손글씨체,
                                3D 효과
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                9.
                              </span>
                              <span>
                                타겟: 30-40대 전문직, B2B 고객 대상, 신뢰감 중시
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                10.
                              </span>
                              <span>
                                로고 변형: 가로형/세로형/아이콘형 3가지 버전
                                필요
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">
                                11.
                              </span>
                              <span>
                                사용처: 웹사이트 헤더(150x50px), 명함(3x3cm),
                                SNS 프로필(500x500px)
                              </span>
                            </li>
                          </ul>
                        </div>

                        {/* 나쁜 예시 */}
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-red-700 flex items-center gap-1">
                            ❌ 나쁜 예시 (모호한 표현)
                          </p>
                          <ul className="text-xs text-gray-800 space-y-1.5 bg-red-50 p-3 rounded-lg border border-red-200">
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;예쁘게 해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;멋진 로고 부탁드립니다&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;고급스럽게 해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;깔끔하게 만들어주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;심플하게 해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;디자인 요소 추가해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;디자인해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;세련되게 만들어주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;트렌디하게 해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;감각적으로 부탁드립니다&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;센스있게 해주세요&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;잘 부탁드립니다&apos;
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold mt-0.5">
                                ✗
                              </span>
                              <span className="line-through">
                                &apos;아무거나 괜찮아요&apos;
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-gold-50 p-3 rounded-lg border border-gold-200">
                        <p className="text-xs text-navy-900 font-semibold mb-2">
                          💡 작성 Tip
                        </p>
                        <ul className="text-xs text-navy-800 space-y-1 ml-4 list-disc">
                          <li>
                            <span className="font-semibold">브랜드 컨셉:</span>{" "}
                            어떤 이미지를 주고 싶으신가요? (예: 신뢰감, 역동성,
                            전문성)
                          </li>
                          <li>
                            <span className="font-semibold">원하는 느낌:</span>{" "}
                            어떤 분위기를 원하시나요? (예: 모던한, 클래식한,
                            친근한)
                          </li>
                          <li>
                            <span className="font-semibold">포함 요소:</span>{" "}
                            로고에 꼭 들어가야 할 것은? (예: 브랜드명, 특정
                            심볼)
                          </li>
                          <li>
                            <span className="font-semibold">
                              피하고 싶은 것:
                            </span>{" "}
                            구체적으로 어떤 스타일을 피하고 싶으신가요?
                          </li>
                        </ul>
                      </div>
                    </div>
                  </details>

                  <textarea
                    id="로고제작요청사항"
                    name="로고제작요청사항"
                    rows={8}
                    defaultValue={submission?.로고제작요청사항}
                    disabled={submission?.isComplete || !isEditingLogo}
                    placeholder="여기에 구체적인 요청사항을 작성해주세요..."
                    className="w-full p-4 rounded-lg border border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm placeholder:text-gray-500"
                  />
                </div>

                {!submission?.isComplete && (
                  <div className="flex gap-2">
                    {hasLogoInfo() && !isEditingLogo ? (
                      <Button
                        type="button"
                        onClick={() => setIsEditingLogo(true)}
                        className="bg-amber-600 text-white hover:bg-amber-700 text-sm sm:text-base"
                      >
                        수정하기
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-navy-900 text-white hover:bg-navy-800 text-sm sm:text-base"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        )}
                        저장하기
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 인쇄물 */}
        <TabsContent value="print">
          <div className="space-y-4">
            {/* 인쇄물 디자인 제한 안내 - 한 줄 압축 */}
            <div className="flex items-center gap-2 p-2.5 bg-gold-50 border border-gray-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-gold-600 flex-shrink-0" />
              <p className="text-navy-800 text-xs">
                <span className="font-semibold">📋 인쇄물 디자인 안내:</span>{" "}
                기본 디자인에서 일부 변경만 가능합니다. 신규 디자인 제작 및
                레이아웃 변형 불가.
              </p>
            </div>

            {!isBasicInfoComplete() && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-amber-700 text-xs">
                  <span className="font-semibold">
                    기본 정보를 먼저 완성해주세요
                  </span>{" "}
                  — 브랜드명, 업종, 사업장 주소 입력 후 이 탭이 활성화됩니다.
                </p>
              </div>
            )}
            <Card className="glass border-white/10">
              <CardHeader className="p-4">
                <CardTitle className="text-gray-900 text-base">
                  필수 서류
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">
                  사업자등록증과 프로필 사진을 업로드해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 사업자등록증 */}
                <div id="business-license-section" className="space-y-2">
                  <Label className="text-sm sm:text-base">사업자등록증 *</Label>
                  {submission?.사업자등록증URL ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                          <span className="text-green-700 text-sm sm:text-base">
                            업로드 완료
                          </span>
                        </div>
                        <a
                          href={submission.사업자등록증URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 hover:underline"
                        >
                          파일 보기
                        </a>
                      </div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(
                                "사업자등록증URL",
                                e.target.files[0],
                              );
                            }
                          }}
                          disabled={uploading}
                        />
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-gold-500 hover:bg-gold-50 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">
                            파일 변경
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "사업자등록증URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-gray-300 hover:border-gold-500 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          클릭하여 파일 업로드
                        </span>
                      </div>
                    </label>
                  )}
                </div>

                {/* 프로필사진 */}
                <div id="profile-photo-section" className="space-y-2">
                  <Label className="text-sm sm:text-base break-words">
                    프로필사진 * (1000px 이하)
                  </Label>
                  {submission?.프로필사진URL ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                          <span className="text-green-700 text-sm sm:text-base">
                            업로드 완료
                          </span>
                        </div>
                        <a
                          href={submission.프로필사진URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 hover:underline text-sm sm:text-base"
                        >
                          파일 보기
                        </a>
                      </div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(
                                "프로필사진URL",
                                e.target.files[0],
                              );
                            }
                          }}
                          disabled={uploading}
                        />
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-gold-500 hover:bg-gold-50 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">
                            파일 변경
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "프로필사진URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-gray-300 hover:border-gold-500 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">
                          클릭하여 파일 업로드
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 명함 정보 */}
            <Card id="namecard-section" className="glass border-white/10">
              <CardHeader className="p-4">
                <CardTitle className="text-gray-900 text-base">
                  명함 스타일
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">
                  명함 스타일을 선택해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  key={`namecard-${submission?.명함시안}-${isEditingNamecard}`}
                  onSubmit={(e) => handleSubmit(e, "namecard")}
                  className="space-y-4"
                >
                  {/* 명함 스타일 선택 */}
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base break-words">
                      명함 스타일 선택 (6종 중 1개 선택)
                    </Label>
                    <input
                      type="hidden"
                      name="명함시안"
                      value={selectedNamecard}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <div
                          key={num}
                          onClick={() => {
                            if (!submission?.isComplete && isEditingNamecard) {
                              setSelectedNamecard(`스타일 ${num}`);
                            }
                          }}
                          className={`relative p-3 rounded-lg border transition-all ${
                            selectedNamecard === `스타일 ${num}`
                              ? "border-gold-600 ring-2 ring-gold-200 bg-gold-50"
                              : "border-gray-300 hover:border-gold-400"
                          } ${submission?.isComplete || !isEditingNamecard ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <img
                              src={`/namecard/namecard_${num}.jpg`}
                              alt={`명함 스타일 ${num}`}
                              className="w-full h-auto object-contain rounded"
                            />
                            <div className="text-center font-semibold text-sm">
                              스타일 {num}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(`/namecard/namecard_${num}.jpg`);
                            }}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white px-2 py-1 rounded text-xs font-medium shadow-md transition-all"
                          >
                            자세히 보기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 계약서 스타일 선택 */}
                  <div className="space-y-3 pt-6 border-t border-gray-200">
                    <Label className="text-sm sm:text-base break-words">
                      자문계약서 스타일 선택 (2종 중 1개 선택)
                    </Label>
                    <input
                      type="hidden"
                      name="계약서시안"
                      value={selectedContract}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: "스타일 1",
                          label: "스타일 1",
                          cover: "/guides/print/contract_cover.jpg",
                          inner: "/guides/print/contract_inner.jpg",
                        },
                        {
                          id: "스타일 2",
                          label: "스타일 2",
                          cover: "/guides/print/contract_cover_2.jpg",
                          inner: "/guides/print/contract_inner_2.jpg",
                        },
                      ].map((style) => (
                        <div
                          key={style.id}
                          onClick={() => {
                            if (!submission?.isComplete && isEditingNamecard) {
                              setSelectedContract(style.id);
                            }
                          }}
                          className={`relative p-3 rounded-lg border transition-all ${
                            selectedContract === style.id
                              ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50"
                              : "border-gray-300 hover:border-indigo-400"
                          } ${submission?.isComplete || !isEditingNamecard ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="grid grid-cols-2 gap-1 w-full">
                              <div>
                                <p className="text-[10px] text-gray-500 mb-0.5">
                                  표지
                                </p>
                                <img
                                  src={style.cover}
                                  alt={`계약서 ${style.label} 표지`}
                                  className="w-full h-auto object-contain rounded"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 mb-0.5">
                                  내지
                                </p>
                                <img
                                  src={style.inner}
                                  alt={`계약서 ${style.label} 내지`}
                                  className="w-full h-auto object-contain rounded"
                                />
                              </div>
                            </div>
                            <div className="text-center font-semibold text-sm">
                              {style.label}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(style.cover);
                            }}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white px-2 py-1 rounded text-xs font-medium shadow-md transition-all"
                          >
                            자세히 보기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!submission?.isComplete && (
                    <div className="flex gap-2">
                      {hasNamecardInfo() && !isEditingNamecard ? (
                        <Button
                          type="button"
                          onClick={() => setIsEditingNamecard(true)}
                          className="bg-amber-600 text-white hover:bg-amber-700 text-sm sm:text-base"
                        >
                          수정하기
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={loading}
                          className="bg-navy-900 text-white hover:bg-navy-800 text-sm sm:text-base"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          )}
                          저장하기
                        </Button>
                      )}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* 이미지 미리보기 모달 */}
            {previewImage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setPreviewImage(null)}
              >
                <div className="relative max-w-4xl w-full">
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 text-xl font-bold"
                  >
                    ✕ 닫기
                  </button>
                  <img
                    src={previewImage}
                    alt="명함 스타일 미리보기"
                    className="w-full h-auto rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 마케팅 */}
        <TabsContent value="marketing" id="marketing">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-gray-900 text-base">
                  마케팅 계정 정보
                </CardTitle>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 border border-green-300 rounded-full text-xs text-green-800">
                  <Shield className="w-3 h-3" />
                  암호화 저장
                </span>
              </div>
              <CardDescription className="text-gray-600 text-xs mt-1">
                메타광고, 네이버 광고, 인스타그램 정보를 입력해주세요 · 보안을
                위해 암호화 저장됩니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                key={`marketing-${submission?.InstagramID}-${isEditingMarketing}`}
                onSubmit={(e) => handleSubmit(e, "marketing")}
                className="space-y-2"
              >
                {/* 네이버 검색광고 */}
                <details
                  id="account-section"
                  className="rounded-lg border border-gray-200"
                  open={
                    !!(
                      submission?.네이버검색광고ID ||
                      submission?.네이버검색광고PW
                    )
                  }
                >
                  <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between select-none list-none hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        네이버 검색광고
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${submission?.네이버검색광고ID ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {submission?.네이버검색광고ID ? "입력됨" : "미입력"}
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
                    <p className="text-xs text-gold-700">
                      <a
                        href="https://ads.naver.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        네이버 검색광고 가입하기 →
                      </a>{" "}
                      사업자 정보 정확히 입력 및 본인인증 필수. 사업자 대표 명의
                      계정으로 진행.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="네이버검색광고ID" className="text-xs">
                          ID
                        </Label>
                        <Input
                          id="네이버검색광고ID"
                          name="네이버검색광고ID"
                          defaultValue={submission?.네이버검색광고ID}
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="네이버검색광고PW" className="text-xs">
                          비밀번호
                        </Label>
                        <Input
                          id="네이버검색광고PW"
                          name="네이버검색광고PW"
                          type="password"
                          defaultValue={submission?.네이버검색광고PW}
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CreditCard className="w-3 h-3 flex-shrink-0" />
                      <span>광고비 충전 필요: </span>
                      <a
                        href="https://manage.searchad.naver.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        네이버 검색광고 관리 페이지에서 충전하기 →
                      </a>
                    </div>
                  </div>
                </details>

                {/* 네이버 클라우드 */}
                <details
                  className="rounded-lg border border-gray-200"
                  open={
                    !!(
                      submission?.네이버클라우드ID ||
                      submission?.네이버클라우드PW
                    )
                  }
                >
                  <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between select-none list-none hover:bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-800">
                      네이버 클라우드
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${submission?.네이버클라우드ID ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {submission?.네이버클라우드ID ? "입력됨" : "미입력"}
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
                    <p className="text-xs text-gold-700">
                      <a
                        href="https://www.ncloud.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        네이버 클라우드 가입하기 →
                      </a>{" "}
                      가입 후 결제수단 등록 필요. 사업자 대표 명의 계정으로
                      진행.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="네이버클라우드ID" className="text-xs">
                          ID
                        </Label>
                        <Input
                          id="네이버클라우드ID"
                          name="네이버클라우드ID"
                          defaultValue={submission?.네이버클라우드ID}
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="네이버클라우드PW" className="text-xs">
                          비밀번호
                        </Label>
                        <Input
                          id="네이버클라우드PW"
                          name="네이버클라우드PW"
                          type="password"
                          defaultValue={submission?.네이버클라우드PW}
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </details>

                {/* 인스타그램 */}
                <details
                  className="rounded-lg border border-gray-200"
                  open={!!(submission?.InstagramID || submission?.InstagramPW)}
                >
                  <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between select-none list-none hover:bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-800">
                      Instagram
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${submission?.InstagramID ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {submission?.InstagramID ? "입력됨" : "미입력"}
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="InstagramID" className="text-xs">
                          ID
                        </Label>
                        <Input
                          id="InstagramID"
                          name="InstagramID"
                          defaultValue={submission?.InstagramID}
                          placeholder="인스타그램 아이디"
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="InstagramPW" className="text-xs">
                          비밀번호
                        </Label>
                        <Input
                          id="InstagramPW"
                          name="InstagramPW"
                          type="password"
                          defaultValue={submission?.InstagramPW}
                          placeholder="비밀번호"
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </details>

                {/* Gmail (메일발신용) */}
                <details
                  className="rounded-lg border border-purple-200"
                  open={!!(submission?.GmailID || submission?.GmailPW)}
                >
                  <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between select-none list-none hover:bg-purple-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-800">
                      Gmail (메일발신용)
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${submission?.GmailID ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {submission?.GmailID ? "입력됨" : "미입력"}
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-purple-100">
                    <p className="text-xs text-gray-600">
                      신규 개설한 Gmail 계정 ID/PW를 입력해주세요
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="GmailID" className="text-xs">
                          ID
                        </Label>
                        <Input
                          id="GmailID"
                          name="GmailID"
                          defaultValue={submission?.GmailID}
                          placeholder="example@gmail.com"
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="GmailPW" className="text-xs">
                          비밀번호
                        </Label>
                        <Input
                          id="GmailPW"
                          name="GmailPW"
                          type="password"
                          defaultValue={submission?.GmailPW}
                          placeholder="비밀번호"
                          disabled={!isEditingMarketing}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </details>
                <div className="flex gap-2">
                  {hasMarketingInfo() && !isEditingMarketing ? (
                    <Button
                      type="button"
                      onClick={() => setIsEditingMarketing(true)}
                      className="bg-amber-600 text-white hover:bg-amber-700 text-sm sm:text-base"
                    >
                      수정하기
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-navy-900 text-white hover:bg-navy-800 text-sm sm:text-base"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      )}
                      저장하기
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 mt-4">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-gray-900 text-base">
                  SMS 발신 등록 서류
                </CardTitle>
                <span className="text-xs text-gold-700">
                  DB 자동화 적용 시 고객 자동 안내 문자 발송
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  아래 파일들은 보안을 위해{" "}
                  <strong>서버에 저장되지 않습니다</strong>. 담당자에게 안전하게
                  전달됩니다.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {/* 대표자신분증 - compact row */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  대표자 신분증{" "}
                  <span className="text-gray-400 font-normal">
                    (마스킹 없이, 번호 안 가리고)
                  </span>
                </Label>
                {submission?.대표자신분증URL === SLACK_ONLY_MARKER ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-700 flex-1">
                      전송완료
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "대표자신분증URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-gold-600 hover:underline">
                        재전송
                      </span>
                    </label>
                  </div>
                ) : submission?.대표자신분증URL ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-green-700 flex-1">
                      전송완료
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "대표자신분증URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-gold-600 hover:underline">
                        재전송
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(
                            "대표자신분증URL",
                            e.target.files[0],
                          );
                        }
                      }}
                      disabled={uploading}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gold-500 transition-all">
                      <Upload className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">업로드</span>
                    </div>
                  </label>
                )}
              </div>

              {/* 통신서비스이용증명원 */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  통신서비스 이용증명원{" "}
                  <span className="text-gray-400 font-normal">
                    (통신사 모바일앱 또는 고객센터에서 발급)
                  </span>
                </Label>
                <details className="text-xs text-gray-500 border border-gray-100 rounded-lg">
                  <summary className="cursor-pointer px-2 py-1 hover:bg-gray-50 select-none list-none">
                    대표번호 vs 핸드폰 번호 차이 보기 ▾
                  </summary>
                  <div className="px-3 py-2 space-y-0.5 border-t border-gray-100">
                    <p>
                      <span className="font-medium text-amber-700">
                        대표번호 등록 시:
                      </span>{" "}
                      1차 안내 문자 발송 후 고객 문자 수신 불가
                    </p>
                    <p>
                      <span className="font-medium text-green-700">
                        핸드폰 번호 등록 시:
                      </span>{" "}
                      1차 안내 문자 발송 후 고객 문자 수신 가능
                    </p>
                  </div>
                </details>
                {submission?.통신서비스이용증명원URL === SLACK_ONLY_MARKER ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-700 flex-1">
                      전송완료
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "통신서비스이용증명원URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-gold-600 hover:underline">
                        재전송
                      </span>
                    </label>
                  </div>
                ) : submission?.통신서비스이용증명원URL ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-green-700 flex-1">
                      전송완료
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "통신서비스이용증명원URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-gold-600 hover:underline">
                        재전송
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(
                            "통신서비스이용증명원URL",
                            e.target.files[0],
                          );
                        }
                      }}
                      disabled={uploading}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gold-500 transition-all">
                      <Upload className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">업로드</span>
                    </div>
                  </label>
                )}
              </div>

              {/* 신용카드앞면 */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  신용카드 번호 보이는면{" "}
                  <span className="text-gray-400 font-normal">
                    (CVC 번호 필수)
                  </span>
                </Label>
                {submission?.신용카드앞면URL === SLACK_ONLY_MARKER ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-700 flex-1">
                      전송완료
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "신용카드앞면URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-gold-600 hover:underline">
                        재전송
                      </span>
                    </label>
                  </div>
                ) : submission?.신용카드앞면URL ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-green-700 flex-1">
                      전송완료
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(
                              "신용카드앞면URL",
                              e.target.files[0],
                            );
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-gold-600 hover:underline">
                        재전송
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(
                            "신용카드앞면URL",
                            e.target.files[0],
                          );
                        }
                      }}
                      disabled={uploading}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gold-500 transition-all">
                      <Upload className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">업로드</span>
                    </div>
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl border border-gray-200">
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-gold-600" />
            <span className="text-gray-900 font-medium">파일 업로드 중...</span>
          </div>
        </div>
      )}

      {/* 모바일 하단 네비게이션 */}
      <MobileStepNavigation
        onPrev={() => {
          const tabs = ["basic", "logo", "print", "marketing"];
          const currentIndex = tabs.indexOf(activeTab);
          if (currentIndex > 0) {
            handleTabChange(tabs[currentIndex - 1]);
          }
        }}
        onNext={() => {
          const tabs = ["basic", "logo", "print", "marketing"];
          const currentIndex = tabs.indexOf(activeTab);
          if (currentIndex < tabs.length - 1) {
            handleTabChange(tabs[currentIndex + 1]);
          }
        }}
        showPrev={activeTab !== "basic"}
        showNext={activeTab !== "marketing"}
        nextDisabled={activeTab === "basic" && !isBasicInfoComplete()}
        nextLabel={activeTab === "print" ? "마케팅으로" : "다음"}
        isLoading={loading || uploading}
      />

      {/* 모바일 하단 네비게이션 공간 확보 */}
      <div className="md:hidden h-20" />

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
            const [tab, elementId] = href.split("#");
            const url = elementId
              ? `/dashboard/submission?tab=${tab}#${elementId}`
              : `/dashboard/submission?tab=${tab}`;
            window.location.href = url;
          }}
        />
      )}

      {/* Sprint 2: 섹션 완료 축하 애니메이션 */}
      <Celebration
        show={showCelebration}
        message={celebrationMessage}
        onComplete={closeCelebration}
      />
    </div>
  );
}
