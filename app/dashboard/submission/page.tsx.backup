"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Square } from "lucide-react";
import imageCompression from "browser-image-compression";

export default function SubmissionPage() {
  const { data: session } = useSession();
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
  const [isEditingDesign, setIsEditingDesign] = useState(false);

  // 로고 선택 상태
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedFont, setSelectedFont] = useState<string>("");

  // 홈페이지 선택 상태
  const [selectedWebsiteStyle, setSelectedWebsiteStyle] = useState<string>("");
  const [websiteColor, setWebsiteColor] = useState<string>("#3B82F6");
  const [dialogOpen, setDialogOpen] = useState(false);
  const colorSectionRef = useRef<HTMLDivElement>(null);

  // 명함 상태
  const [businessCardColor, setBusinessCardColor] = useState<string>("#3B82F6");
  const [selectedNamecard, setSelectedNamecard] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 제출 데이터 및 워크플로우 로드
  useEffect(() => {
    fetchSubmission();
    fetchWorkflows();
    fetchDeadline();
  }, []);

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
    return logoWorkflow.status === "최종확정" || logoWorkflow.status === "발주완료";
  };

  // submission 데이터가 변경되면 선택 상태 업데이트
  useEffect(() => {
    if (submission) {
      setSelectedStyle(submission.로고선호스타일 || "");
      setSelectedFont(submission.로고선호폰트 || "");
      setBusinessCardColor(submission.명함색상 || "#3B82F6");
      setSelectedNamecard(submission.명함시안 || "");
      setSelectedWebsiteStyle(submission.홈페이지스타일 || "");
      setWebsiteColor(submission.홈페이지컬러컨셉 || "#3B82F6");
    }
  }, [submission]);

  const fetchSubmission = async () => {
    try {
      const res = await fetch("/api/submission");
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
        calculateCompletionRate(data);

        // 각 섹션별로 데이터 유무를 확인하여 편집 모드 설정
        // 데이터가 없으면 편집 모드(true), 있으면 읽기 모드(false)
        if (data) {
          const hasBasic = data.브랜드명 || data.업종 || data.주소;
          const hasLogo = data.로고선호스타일 || data.로고선호폰트 || data.명함색상;
          const hasNamecard = data.명함시안;
          const hasMarketing = data.네이버검색광고ID || data.네이버검색광고PW || data.네이버클라우드ID || data.네이버클라우드PW || data.InstagramID;
          const hasWebsite = data.홈페이지스타일 || data.홈페이지컬러컨셉 || data.아임웹ID || data.아임웹PW || data.아임웹관리자PW;

          setIsEditingBasicInfo(!hasBasic);
          setIsEditingBusiness(true); // 사업자 정보는 항상 편집 가능
          setIsEditingFiles(true); // 파일은 항상 편집 가능
          setIsEditingLogo(!hasLogo);
          setIsEditingNamecard(!hasNamecard);
          setIsEditingMarketing(!hasMarketing);
          setIsEditingDesign(!hasWebsite);
        } else {
          // 데이터가 없으면 모두 편집 모드로 (true = 편집 모드)
          setIsEditingBasicInfo(true);
          setIsEditingBusiness(true);
          setIsEditingFiles(true);
          setIsEditingLogo(true);
          setIsEditingNamecard(true);
          setIsEditingMarketing(true);
          setIsEditingDesign(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    }
  };

  // 각 섹션별로 데이터가 있는지 확인
  const hasBasicInfo = () => {
    return submission && (submission.브랜드명 || submission.업종 || submission.주소);
  };

  const hasLogoInfo = () => {
    return submission && (submission.로고선호스타일 || submission.로고선호폰트 || submission.명함색상);
  };

  const hasNamecardInfo = () => {
    return submission && submission.명함시안;
  };

  const hasMarketingInfo = () => {
    return submission && (
      submission.네이버검색광고ID ||
      submission.네이버검색광고PW ||
      submission.네이버클라우드ID ||
      submission.네이버클라우드PW ||
      submission.InstagramID
    );
  };

  const hasWebsiteInfo = () => {
    return submission && (
      submission.홈페이지스타일 ||
      submission.홈페이지컬러컨셉 ||
      submission.아임웹ID ||
      submission.아임웹PW ||
      submission.아임웹관리자PW
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

    const completedFields = requiredFields.filter(field => data[field]).length;
    const rate = Math.round((completedFields / requiredFields.length) * 100);
    setCompletionRate(rate);
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (isDeadlinePassed) {
      alert("자료 제출 마감일이 지났습니다. JJK 비즈액터스쿨에 문의해주세요.");
      return;
    }

    setUploading(true);

    // 사업자등록증URL 또는 프로필사진URL 필드이고 이미지인 경우 자동 압축
    if ((field === "사업자등록증URL" || field === "프로필사진URL") && file.type.startsWith("image/") && file.type !== "image/gif") {
      try {
        console.log(`[압축] 원본 파일 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

        const options = {
          maxSizeMB: 2, // 최대 2MB로 압축
          maxWidthOrHeight: 1920, // 최대 해상도
          useWebWorker: true,
          fileType: file.type,
        };

        const compressedFile = await imageCompression(file, options);
        console.log(`[압축] 압축 후 파일 크기: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

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
      console.log("[클라이언트] 파일 업로드 시작:", field, file.name, "크기:", file.size, "타입:", file.type);
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
      alert("파일 업로드 중 네트워크 오류가 발생했습니다.\n인터넷 연결을 확인해주세요.");
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

    if (isDeadlinePassed) {
      alert("자료 제출 마감일이 지났습니다. JJK 비즈액터스쿨에 문의해주세요.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchSubmission();

        // 섹션별로 수정 모드 종료
        switch(section) {
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
          case "website":
            setIsEditingDesign(false);
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
    if (isDeadlinePassed) {
      alert("자료 제출 마감일이 지났습니다. JJK 비즈액터스쿨에 문의해주세요.");
      return;
    }

    if (completionRate !== 100) {
      alert("필수 자료를 모두 제출해주세요.");
      return;
    }

    if (!confirm("디자인 시안 제작을 요청하시겠습니까?\n\n요청 후에는 제출 자료를 수정할 수 없습니다.")) {
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
        alert("디자인 시안 제작요청이 완료되었습니다!\n\n오전 11시 이전: 영업일 2일차\n오전 11시 이후: 영업일 3일차\n\n시안 전달 예정일을 확인해주세요.");
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
    <div className="space-y-8 overflow-x-hidden w-full max-w-full">
      {/* 마감일 경고 메시지 */}
      {isDeadlinePassed && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-bold text-base sm:text-lg">
              자료 제출 마감일이 지났습니다
            </p>
            <p className="text-red-700 text-sm mt-1">
              자료 제출 기능이 비활성화되었습니다. JJK 비즈액터스쿨에 문의해주세요.
            </p>
            {deadlineDate && (
              <p className="text-red-600 text-xs mt-2">
                마감일: {deadlineDate.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 헤더 - 깔끔하고 명확한 */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            자료 제출
          </h1>
          {!submission?.isComplete && submission && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-500">
                완성도: <span className="font-bold text-blue-600">{completionRate}%</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                각 섹션별로 수정이 가능합니다
              </div>
            </div>
          )}
        </div>
        {submission?.isComplete ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <p className="text-green-700 font-medium text-sm sm:text-base">
                이미 제작요청이 접수되었습니다.
              </p>
            </div>
            {/* 시안 전달 정보 */}
            <div className="space-y-2">
              {/* 시안 전달 완료된 워크플로우 표시 */}
              {workflows
                .filter((w: any) => w.시안업로드일)
                .map((w: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-green-700 font-medium">
                        {w.type} 시안 전달 완료: {new Date(w.시안업로드일).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </p>
                      {w.발주승인일 && (
                        <p className="text-green-600 text-sm mt-1">
                          발주 완료: {new Date(w.발주승인일).toLocaleDateString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

              {/* 시안 전달 예정 - 아직 시안업로드일이 없는 워크플로우가 있고 시안예정일이 있을 때만 표시 */}
              {workflows.some((w: any) => !w.시안업로드일 && w.type !== "로고") && submission.시안예정일 && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <p className="text-blue-700 font-medium">
                    {new Date(submission.시안예정일).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })} 시안 전달 예정
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <p className="text-blue-700">
                각 카테고리별 필요한 자료를 제출해주세요. 디자인 제작요청 전까지 언제든 수정 가능합니다.
              </p>
            </div>
            {completionRate === 100 && !hasWorkflows && !isDeadlinePassed && (
              <Button
                onClick={handlePrintRequest}
                disabled={requestingPrint || hasWorkflows || isDeadlinePassed}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 sm:py-4 text-sm sm:text-lg"
              >
                {requestingPrint ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    제작요청 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    디자인 시안 제작요청
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="basic" className="space-y-6 w-full">
        {/* 깔끔하고 직관적인 탭 네비게이션 - 모바일 2단 구조 */}
        <TabsList className="bg-white border-2 border-gray-200 p-1.5 rounded-xl shadow-sm grid grid-cols-3 md:grid-cols-5 gap-1 h-auto">
          <TabsTrigger
            value="basic"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold text-xs sm:text-sm py-2"
          >
            📄 기본 정보
          </TabsTrigger>
          <TabsTrigger
            value="logo"
            disabled={!isBasicInfoComplete()}
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm py-2"
            title={!isBasicInfoComplete() ? "기본 정보를 먼저 완성해주세요" : ""}
          >
            🎨 로고
          </TabsTrigger>
          <TabsTrigger
            value="print"
            disabled={!isBasicInfoComplete()}
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm py-2"
            title={!isBasicInfoComplete() ? "기본 정보를 먼저 완성해주세요" : ""}
          >
            🖨️ 인쇄물
          </TabsTrigger>
          <TabsTrigger
            value="marketing"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold text-xs sm:text-sm py-2"
          >
            📱 마케팅
          </TabsTrigger>
          <TabsTrigger
            value="website"
            disabled={!isLogoConfirmed()}
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm py-2"
            title={!isLogoConfirmed() ? "로고 시안 확정 후 이용 가능합니다" : ""}
          >
            🌐 홈페이지
          </TabsTrigger>
        </TabsList>

        {/* 기본 정보 */}
        <TabsContent value="basic">
          <Card className="glass border-white/10">
            <CardHeader>
              <div>
                <CardTitle className="text-gray-900 text-lg sm:text-xl">기본 정보</CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                  인쇄물에 들어갈 기본 정보를 입력해주세요
                </CardDescription>
              </div>
              {!submission?.isComplete && !isBasicInfoComplete() && (
                <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg mt-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-700 font-semibold text-sm">기본 정보를 완성해야 다음 단계로 진행할 수 있습니다</p>
                    <p className="text-amber-600 text-xs mt-1">
                      필수 항목: 브랜드명, 업종, 사업장 주소
                    </p>
                  </div>
                </div>
              )}
              {!submission?.isComplete && isBasicInfoComplete() && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mt-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-green-700 font-medium text-sm">
                    기본 정보가 완성되었습니다! 이제 로고 및 인쇄물 탭에서 계속 진행하세요.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form
                key={`basic-${submission?.브랜드명}-${isEditingBasicInfo}`}
                onSubmit={(e) => handleSubmit(e, "basic")}
                className="space-y-4"
              >
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="브랜드명" className="text-sm sm:text-base">브랜드명 *</Label>
                    <Input
                      id="브랜드명"
                      name="브랜드명"
                      defaultValue={submission?.브랜드명}
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="업종" className="text-sm sm:text-base">업종 *</Label>
                    <Input
                      id="업종"
                      name="업종"
                      defaultValue={submission?.업종}
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="대표번호" className="text-sm sm:text-base">대표번호</Label>
                    <Input
                      id="대표번호"
                      name="대표번호"
                      defaultValue={submission?.대표번호}
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="이메일" className="text-sm sm:text-base">이메일</Label>
                    <Input
                      id="이메일"
                      name="이메일"
                      type="email"
                      defaultValue={submission?.이메일}
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="주소" className="text-sm sm:text-base">사업장 주소 *</Label>
                    <Input
                      id="주소"
                      name="주소"
                      defaultValue={submission?.주소}
                      required
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="은행명" className="text-sm sm:text-base break-words">은행명 (고객이 입금할 계좌번호입니다.)</Label>
                    <Input
                      id="은행명"
                      name="은행명"
                      defaultValue={submission?.은행명}
                      placeholder="예: 국민은행"
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="계좌번호" className="text-sm sm:text-base">계좌번호</Label>
                    <Input
                      id="계좌번호"
                      name="계좌번호"
                      defaultValue={submission?.계좌번호}
                      placeholder="예: 123-45-678910"
                      disabled={submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label
                        htmlFor="sameAddress"
                        className="text-sm sm:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        사업장 주소와 동일
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="인쇄물받을주소" className="text-sm sm:text-base break-words">인쇄물 받을 주소</Label>
                      <Input
                        id="인쇄물받을주소"
                        name="인쇄물받을주소"
                        defaultValue={submission?.인쇄물받을주소}
                        placeholder="사업장 주소와 다른 경우만 입력"
                        className="bg-white border-gray-200"
                        disabled={sameAddress || submission?.isComplete || !isEditingBasicInfo || isDeadlinePassed}
                      />
                    </div>
                  </div>
                </div>
                {!submission?.isComplete && !isDeadlinePassed && (
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
                        disabled={loading || isDeadlinePassed}
                        className="bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
                      >
                        {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
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
        <TabsContent value="logo">
          <Card className="glass border-white/10">
            <CardHeader>
              <div>
                <CardTitle className="text-gray-900 text-lg sm:text-xl">로고 디자인 정보</CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                  로고 파일이 있으면 업로드하거나, 선호하는 스타일과 색상을 선택해주세요
                </CardDescription>
              </div>
              {!isBasicInfoComplete() && (
                <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg mt-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-700 font-semibold text-sm">기본 정보를 먼저 완성해주세요</p>
                    <p className="text-amber-600 text-xs mt-1">
                      기본 정보 탭에서 브랜드명, 업종, 사업장 주소를 입력하면 로고 탭이 활성화됩니다.
                    </p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form
                key={`logo-${submission?.로고선호스타일}-${isEditingLogo}`}
                onSubmit={(e) => handleSubmit(e, "logo")}
                className="space-y-6"
              >
                {/* 로고 파일 업로드 */}
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">로고 파일 (있는 경우)</Label>
                  {submission?.로고URL ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                          <span className="text-green-700 text-sm sm:text-base">업로드 완료</span>
                        </div>
                        <a
                          href={submission.로고URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
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
                              handleFileUpload("로고URL", e.target.files[0]);
                            }
                          }}
                          disabled={uploading}
                        />
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">파일 변경</span>
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
                            handleFileUpload("로고URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">로고 파일 업로드</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* 로고 선호 스타일 */}
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base">로고 선호 스타일</Label>
                  <input type="hidden" name="로고선호스타일" value={selectedStyle} />
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
                        images: ["/logo-examples/wordmark1.png", "/logo-examples/wordmark2.png"],
                      },
                    ].map((style) => (
                      <button
                        key={style.name}
                        type="button"
                        onClick={() => setSelectedStyle(style.name)}
                        disabled={submission?.isComplete || !isEditingLogo}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedStyle === style.name
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                        } ${(submission?.isComplete || !isEditingLogo) ? "opacity-60 cursor-not-allowed" : ""}`}
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
                            <div className="font-semibold text-sm">{style.name}</div>
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
                    <Label className="text-sm sm:text-base">로고 선호 폰트</Label>
                    <a
                      href="https://noonnu.cc/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1"
                    >
                      <span>폰트 찾기 (눈누)</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* 폰트 안내 */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs text-blue-700 space-y-1">
                        <p className="font-semibold">📌 폰트 선택 안내</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li><span className="font-semibold">무료 폰트만 사용 가능</span>합니다 (눈누 사이트에서 무료 폰트 검색)</li>
                          <li><span className="font-semibold">유료 폰트는 직접 구매 후 파일 전달</span>이 필요합니다</li>
                          <li>원하는 폰트명을 아래 요청사항에 작성해주세요</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <input type="hidden" name="로고선호폰트" value={selectedFont} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedFont === fontOption.name
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                        } ${(submission?.isComplete || !isEditingLogo) ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className={`font-semibold ${fontOption.style}`}>
                          {fontOption.name}
                        </div>
                        <div className={`text-2xl mt-2 ${fontOption.style}`}>Aa</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 로고 색상 선택 */}
                <div className="space-y-3 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
                  <Label htmlFor="명함색상" className="text-sm sm:text-base font-semibold">로고/명함 색상 선택</Label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={businessCardColor}
                      onChange={(e) => setBusinessCardColor(e.target.value)}
                      disabled={submission?.isComplete || !isEditingLogo}
                      className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        id="명함색상"
                        name="명함색상"
                        value={businessCardColor}
                        onChange={(e) => setBusinessCardColor(e.target.value)}
                        placeholder="#3B82F6"
                        disabled={submission?.isComplete || !isEditingLogo}
                        className="font-mono bg-white"
                      />
                      <p className="text-xs text-gray-600">
                        컬러피커에서 선택하거나 직접 16진수 색상값을 입력하세요 (예: #3B82F6)
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-blue-700 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        색상 선택 후 아래 &quot;저장하기&quot; 버튼을 꼭 눌러주세요!
                      </p>
                    </div>
                  </div>
                </div>

                {/* 상세 제작 요청사항 (필수) */}
                <div className="space-y-3 p-4 rounded-lg border-2 border-orange-200 bg-orange-50/50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="로고제작요청사항" className="text-sm sm:text-base font-semibold text-orange-900">
                        상세 제작 요청사항 *
                      </Label>
                      <p className="text-xs text-orange-700 mt-1">
                        이 항목을 작성해야 로고 제작이 시작됩니다. 임시저장은 가능하지만, 최종 제출하려면 반드시 작성해주세요.
                      </p>
                    </div>
                  </div>

                  {/* 최우선 강조사항 */}
                  <div className="p-4 bg-red-50 rounded-lg border-2 border-red-400 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-lg">
                        !
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-red-900 mb-2">⚠️ 필수 확인 사항</h3>
                        <div className="bg-white p-3 rounded-lg border border-red-300">
                          <p className="text-sm font-bold text-red-800 mb-2">
                            로고 제작은 <span className="underline decoration-2 decoration-red-500">심볼형 OR 워드마크형 중 한 가지만</span> 선택 가능합니다.
                          </p>
                          <ul className="text-xs text-gray-800 space-y-1.5 ml-4">
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold">✓</span>
                              <span><span className="font-semibold">심볼형:</span> 아이콘/도형 + 브랜드명 조합 (예: 나이키, 애플)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold">✓</span>
                              <span><span className="font-semibold">워드마크형:</span> 브랜드명만 디자인 (예: Google, Coca-Cola)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 font-bold">✗</span>
                              <span className="line-through">심볼 + 워드마크 동시 제작 불가</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 작성 가이드 - 항상 보이도록 상단에 배치 */}
                  <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 좋은 예시 */}
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-green-700 flex items-center gap-1">
                          ✅ 좋은 예시 (구체적이고 명확한 표현)
                        </p>
                        <ul className="text-xs text-gray-800 space-y-1.5 bg-green-50 p-3 rounded-lg border border-green-200 max-h-[400px] overflow-y-auto">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">1.</span>
                            <span><span className="font-bold text-red-700">로고 형태:</span> 심볼형(아이콘+브랜드명) 선택 - 원형 프레임 안에 클라우드 아이콘 배치</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">2.</span>
                            <span>메인 컬러는 파란색 계열(#2563EB), 흰색 배경에서 명확히 보이게</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">3.</span>
                            <span>폰트는 산세리프체(고딕체) 사용, 가독성 우선</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">4.</span>
                            <span>심볼은 업종과 연관된 아이콘 (예: IT 기업 - 클라우드/데이터 모티브)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">5.</span>
                            <span>장식 요소 최소화, 선의 굵기는 균일하게 2-3px 유지</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">6.</span>
                            <span>명함/간판에 사용 시 최소 2cm 크기에서도 식별 가능하도록</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">7.</span>
                            <span>그라데이션 지양, 단색으로 인쇄 가능한 디자인</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">8.</span>
                            <span>참고 브랜드: 삼성 (블루 계열), 네이버 (심볼+텍스트 조합)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">9.</span>
                            <span>제외 요소: 빨강/노랑 색상, 세리프체, 손글씨체, 3D 효과</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">10.</span>
                            <span>타겟: 30-40대 전문직, B2B 고객 대상, 신뢰감 중시</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">11.</span>
                            <span>로고 변형: 가로형/세로형/아이콘형 3가지 버전 필요</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">12.</span>
                            <span>사용처: 웹사이트 헤더(150x50px), 명함(3x3cm), SNS 프로필(500x500px)</span>
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
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;예쁘게 해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;멋진 로고 부탁드립니다&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;고급스럽게 해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;깔끔하게 만들어주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;심플하게 해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;디자인 요소 추가해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;디자인해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;세련되게 만들어주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;트렌디하게 해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;감각적으로 부탁드립니다&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;센스있게 해주세요&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;잘 부탁드립니다&apos;</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span className="line-through">&apos;아무거나 괜찮아요&apos;</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-900 font-semibold mb-2">💡 작성 Tip</p>
                      <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                        <li><span className="font-semibold">브랜드 컨셉:</span> 어떤 이미지를 주고 싶으신가요? (예: 신뢰감, 역동성, 전문성)</li>
                        <li><span className="font-semibold">원하는 느낌:</span> 어떤 분위기를 원하시나요? (예: 모던한, 클래식한, 친근한)</li>
                        <li><span className="font-semibold">포함 요소:</span> 로고에 꼭 들어가야 할 것은? (예: 브랜드명, 특정 심볼)</li>
                        <li><span className="font-semibold">피하고 싶은 것:</span> 구체적으로 어떤 스타일을 피하고 싶으신가요?</li>
                      </ul>
                    </div>
                  </div>

                  <textarea
                    id="로고제작요청사항"
                    name="로고제작요청사항"
                    rows={8}
                    defaultValue={submission?.로고제작요청사항}
                    disabled={submission?.isComplete || !isEditingLogo}
                    placeholder="여기에 구체적인 요청사항을 작성해주세요..."
                    className="w-full p-4 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm placeholder:text-gray-500"
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
                        className="bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
                      >
                        {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
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
          <div className="space-y-6">
            {!isBasicInfoComplete() && (
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-700 font-semibold text-sm">기본 정보를 먼저 완성해주세요</p>
                  <p className="text-amber-600 text-xs mt-1">
                    기본 정보 탭에서 브랜드명, 업종, 사업장 주소를 입력하면 인쇄물 탭이 활성화됩니다.
                  </p>
                </div>
              </div>
            )}
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-gray-900 text-lg sm:text-xl">필수 서류</CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                  사업자등록증과 프로필 사진을 업로드해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 사업자등록증 */}
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">사업자등록증 *</Label>
                  {submission?.사업자등록증URL ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                          <span className="text-green-700 text-sm sm:text-base">업로드 완료</span>
                        </div>
                        <a
                          href={submission.사업자등록증URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
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
                              handleFileUpload("사업자등록증URL", e.target.files[0]);
                            }
                          }}
                          disabled={uploading}
                        />
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">파일 변경</span>
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
                            handleFileUpload("사업자등록증URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">클릭하여 파일 업로드</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* 프로필사진 */}
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base break-words">프로필사진 * (1000px 이하)</Label>
                  {submission?.프로필사진URL ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                          <span className="text-green-700 text-sm sm:text-base">업로드 완료</span>
                        </div>
                        <a
                          href={submission.프로필사진URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm sm:text-base"
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
                              handleFileUpload("프로필사진URL", e.target.files[0]);
                            }
                          }}
                          disabled={uploading}
                        />
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">파일 변경</span>
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
                            handleFileUpload("프로필사진URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">클릭하여 파일 업로드</span>
                      </div>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 명함 정보 */}
            <Card className="glass border-white/10">
              <CardHeader>
                <div>
                  <CardTitle className="text-gray-900 text-lg sm:text-xl">명함 스타일</CardTitle>
                  <CardDescription className="text-gray-400 text-xs sm:text-sm">
                    명함 스타일을 선택해주세요
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  key={`namecard-${submission?.명함시안}-${isEditingNamecard}`}
                  onSubmit={(e) => handleSubmit(e, "namecard")}
                  className="space-y-6"
                >
                  {/* 명함 스타일 선택 */}
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base break-words">명함 스타일 선택 (4종 중 1개 선택)</Label>
                    <input type="hidden" name="명함시안" value={selectedNamecard} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((num) => (
                        <div
                          key={num}
                          onClick={() => {
                            if (!submission?.isComplete && isEditingNamecard) {
                              setSelectedNamecard(`스타일 ${num}`);
                            }
                          }}
                          className={`relative p-3 rounded-lg border-2 transition-all ${
                            selectedNamecard === `스타일 ${num}`
                              ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50"
                              : "border-gray-300 hover:border-blue-400"
                          } ${(submission?.isComplete || !isEditingNamecard) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
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
                          className="bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
                        >
                          {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
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
        <TabsContent value="marketing">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg sm:text-xl">마케팅 정보</CardTitle>
              <CardDescription className="text-gray-600 text-xs sm:text-sm">
                메타광고, 네이버 광고, 인스타그램 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                key={`marketing-${submission?.InstagramID}-${isEditingMarketing}`}
                onSubmit={(e) => handleSubmit(e, "marketing")}
                className="space-y-4"
              >
                {/* 네이버 검색광고 */}
                <div className="space-y-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
                  <Label className="text-sm sm:text-base font-semibold">네이버 검색광고</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="네이버검색광고ID" className="text-sm sm:text-base">ID</Label>
                      <Input
                        id="네이버검색광고ID"
                        name="네이버검색광고ID"
                        defaultValue={submission?.네이버검색광고ID}
                        disabled={!isEditingMarketing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="네이버검색광고PW" className="text-sm sm:text-base">비밀번호</Label>
                      <Input
                        id="네이버검색광고PW"
                        name="네이버검색광고PW"
                        type="password"
                        defaultValue={submission?.네이버검색광고PW}
                        disabled={!isEditingMarketing}
                      />
                    </div>
                  </div>
                </div>

                {/* 네이버 클라우드 */}
                <div className="space-y-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
                  <Label className="text-sm sm:text-base font-semibold">네이버 클라우드</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="네이버클라우드ID" className="text-sm sm:text-base">ID</Label>
                      <Input
                        id="네이버클라우드ID"
                        name="네이버클라우드ID"
                        defaultValue={submission?.네이버클라우드ID}
                        disabled={!isEditingMarketing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="네이버클라우드PW" className="text-sm sm:text-base">비밀번호</Label>
                      <Input
                        id="네이버클라우드PW"
                        name="네이버클라우드PW"
                        type="password"
                        defaultValue={submission?.네이버클라우드PW}
                        disabled={!isEditingMarketing}
                      />
                    </div>
                  </div>
                </div>

                {/* 인스타그램 */}
                <div className="space-y-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
                  <Label className="text-sm sm:text-base font-semibold">Instagram</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="InstagramID" className="text-sm sm:text-base">ID</Label>
                      <Input
                        id="InstagramID"
                        name="InstagramID"
                        defaultValue={submission?.InstagramID}
                        placeholder="인스타그램 아이디"
                        disabled={!isEditingMarketing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="InstagramPW" className="text-sm sm:text-base">비밀번호</Label>
                      <Input
                        id="InstagramPW"
                        name="InstagramPW"
                        type="password"
                        defaultValue={submission?.InstagramPW}
                        placeholder="비밀번호"
                        disabled={!isEditingMarketing}
                      />
                    </div>
                  </div>
                </div>
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
                      className="bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
                    >
                      {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
                      저장하기
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-gray-200 mt-6">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg sm:text-xl">SMS 발신 등록 서류</CardTitle>
              <CardDescription className="text-gray-600 text-xs sm:text-sm">
                SMS 발신번호 등록에 필요한 서류를 업로드해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 대표자신분증 */}
              <div className="space-y-2">
                <Label className="text-sm sm:text-base break-words">대표자 신분증 - 마스킹 없어야 됩니다. (번호안가리고)</Label>
                {submission?.대표자신분증URL ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                        <span className="text-green-700 text-sm sm:text-base">업로드 완료</span>
                      </div>
                      <a
                        href={submission.대표자신분증URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm sm:text-base"
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
                            handleFileUpload("대표자신분증URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">파일 변경</span>
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
                          handleFileUpload("대표자신분증URL", e.target.files[0]);
                        }
                      }}
                      disabled={uploading}
                    />
                    <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">클릭하여 파일 업로드</span>
                    </div>
                  </label>
                )}
              </div>

              {/* 통신서비스이용증명원 */}
              <div className="space-y-2">
                <Label className="text-sm sm:text-base break-words">통신서비스 이용증명원 (통신사 모바일앱 또는 고객센터에서 발급가능)</Label>
                {submission?.통신서비스이용증명원URL ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                        <span className="text-green-700 text-sm sm:text-base">업로드 완료</span>
                      </div>
                      <a
                        href={submission.통신서비스이용증명원URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm sm:text-base"
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
                            handleFileUpload("통신서비스이용증명원URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">파일 변경</span>
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
                          handleFileUpload("통신서비스이용증명원URL", e.target.files[0]);
                        }
                      }}
                      disabled={uploading}
                    />
                    <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">클릭하여 파일 업로드</span>
                    </div>
                  </label>
                )}
              </div>

              {/* 신용카드앞면 */}
              <div className="space-y-2">
                <Label className="text-sm sm:text-base break-words">신용카드 번호 보이는면 CVC 번호 필수</Label>
                {submission?.신용카드앞면URL ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                        <span className="text-green-700 text-sm sm:text-base">업로드 완료</span>
                      </div>
                      <a
                        href={submission.신용카드앞면URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm sm:text-base"
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
                            handleFileUpload("신용카드앞면URL", e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">파일 변경</span>
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
                          handleFileUpload("신용카드앞면URL", e.target.files[0]);
                        }
                      }}
                      disabled={uploading}
                    />
                    <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">클릭하여 파일 업로드</span>
                    </div>
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 홈페이지 */}
        <TabsContent value="website">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <div className="space-y-3">
                <div>
                  <CardTitle className="text-gray-900 text-lg sm:text-xl">홈페이지 제작 정보</CardTitle>
                  <CardDescription className="text-gray-600 text-xs sm:text-sm">
                    아임웹 계정 정보와 홈페이지 스타일을 선택해주세요
                  </CardDescription>
                </div>

                {/* 카카오톡 로그인 안내 */}
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 font-medium text-sm sm:text-base">
                    <strong>중요:</strong> 카카오톡 로그인 생성 ✕ / 이메일주소 또는 네이버 로그인으로 가입하세요
                  </p>
                </div>

                {/* 아임웹 과정 안내 */}
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <h3 className="font-bold text-blue-900 text-sm sm:text-base">아임웹 진행 과정</h3>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-blue-800 text-xs sm:text-sm ml-1">
                    <li>아임웹 가입 후 ID/PW 제출</li>
                    <li>홈페이지 제작 및 구성</li>
                    <li>소유권 이전</li>
                    <li>홈페이지 결제</li>
                  </ol>
                  <p className="text-red-700 font-bold text-xs sm:text-sm mt-3 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>절대 가입 후 홈페이지를 자체 생성하거나 결제하지 마세요!</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-amber-700 font-medium">
                    로고 시안 확정 후 제작 진행이 가능합니다
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                key={`website-${submission?.홈페이지스타일}-${isEditingDesign}`}
                onSubmit={(e) => handleSubmit(e, "website")}
                className="space-y-6"
              >
                {/* 아임웹 계정 정보 */}
                <div className="space-y-4 p-4 rounded-lg border-2 border-purple-200 bg-purple-50/50">
                  <Label className="text-sm sm:text-base font-semibold">아임웹 계정 정보</Label>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="아임웹ID" className="text-sm sm:text-base">아임웹 ID (이메일 또는 네이버 로그인)</Label>
                      <Input
                        id="아임웹ID"
                        name="아임웹ID"
                        defaultValue={submission?.아임웹ID}
                        placeholder="이메일주소 또는 네이버 계정"
                        disabled={!isEditingDesign}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="아임웹PW" className="text-sm sm:text-base">아임웹 비밀번호</Label>
                      <Input
                        id="아임웹PW"
                        name="아임웹PW"
                        type="password"
                        defaultValue={submission?.아임웹PW}
                        placeholder="비밀번호"
                        disabled={!isEditingDesign}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="아임웹관리자PW" className="text-sm sm:text-base">아임웹 관리자 비밀번호 (대문자 포함 필수)</Label>
                      <Input
                        id="아임웹관리자PW"
                        name="아임웹관리자PW"
                        type="password"
                        defaultValue={submission?.아임웹관리자PW}
                        placeholder="대문자 포함 비밀번호"
                        disabled={!isEditingDesign}
                      />
                      <p className="text-xs text-gray-600">
                        관리자 비밀번호는 반드시 대문자를 포함해야 합니다
                      </p>
                    </div>
                  </div>
                </div>

                {/* 홈페이지 스타일 선택 */}
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base break-words">홈페이지 스타일 선택 (썸네일 클릭 시 크게 보기)</Label>
                  <input type="hidden" name="홈페이지스타일" value={selectedWebsiteStyle} />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { url: "https://financialhealing.imweb.me/", name: "스타일 1" },
                      { url: "https://mjgood.imweb.me/", name: "스타일 2" },
                      { url: "https://jmbiz.imweb.me/", name: "스타일 3" },
                      { url: "https://ksupport-center.imweb.me/", name: "스타일 4" },
                      { url: "https://polarad.imweb.me/publicstyle", name: "스타일 5" },
                      { url: "https://polarad.imweb.me/financialstyle", name: "스타일 6" },
                    ].map((style) => (
                      <Dialog key={style.url} open={dialogOpen && selectedWebsiteStyle === style.url} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          // Dialog가 닫힐 때는 아무것도 안함
                        }
                      }}>
                        <div
                          className={`rounded-lg border-2 transition-all overflow-hidden ${
                            selectedWebsiteStyle === style.url
                              ? "border-blue-600 ring-2 ring-blue-300"
                              : "border-gray-300 hover:border-blue-400"
                          } ${!isEditingDesign ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {/* 썸네일 */}
                          <DialogTrigger asChild>
                            <div
                              className="relative group"
                              onClick={() => {
                                if (isEditingDesign) {
                                  setSelectedWebsiteStyle(style.url);
                                  setDialogOpen(true);
                                }
                              }}
                            >
                              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                                <iframe
                                  src={style.url}
                                  className="w-full h-full scale-[0.33] origin-top-left pointer-events-none"
                                  style={{ width: '300%', height: '300%' }}
                                  title={style.name}
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                  클릭하여 크게 보기
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          {/* 스타일 이름 */}
                          <div className="p-2 text-center">
                            <div className="font-semibold text-sm">{style.name}</div>
                          </div>
                        </div>

                        {/* 큰 미리보기 Dialog */}
                        <DialogContent className="w-[96vw] sm:w-[90vw] max-w-5xl max-h-[92vh] overflow-y-auto bg-white border-2 border-gray-200 p-2 sm:p-4 md:p-6">
                          <DialogHeader className="pb-2 space-y-1">
                            <DialogTitle className="text-gray-900 text-base sm:text-lg md:text-xl">{style.name} 미리보기</DialogTitle>
                            <DialogDescription className="text-gray-600 text-xs sm:text-sm">
                              웹사이트 미리보기
                            </DialogDescription>
                          </DialogHeader>
                          <div className="w-full aspect-[16/9] overflow-hidden rounded-md border-2 border-gray-200 my-2 sm:my-3 md:my-4 bg-gray-100">
                            <iframe
                              src={style.url}
                              className="w-[200%] h-[200%] origin-top-left"
                              style={{ transform: 'scale(0.5)' }}
                              title={`${style.name} 전체보기`}
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => window.open(style.url, "_blank")}
                              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                            >
                              새 탭에서 열기
                            </Button>
                            <Button
                              onClick={() => {
                                if (!isEditingDesign) return;

                                setSelectedWebsiteStyle(style.url);
                                setDialogOpen(false);

                                // 컬러 선택 섹션으로 스크롤
                                setTimeout(() => {
                                  colorSectionRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                  });
                                }, 100);
                              }}
                              disabled={!isEditingDesign}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm h-9 sm:h-10"
                            >
                              스타일 선택하기
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </div>

                {/* 컬러 컨셉 선택 */}
                <div ref={colorSectionRef} className="space-y-3 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
                  <Label className="text-sm sm:text-base font-semibold break-words">
                    선택한 스타일과 컬러 컨셉
                    {!isLogoConfirmed() && (
                      <span className="ml-2 text-xs text-amber-600">
                        (로고 시안 확정 후 선택 가능)
                      </span>
                    )}
                  </Label>

                  {/* 선택된 스타일 표시 */}
                  {selectedWebsiteStyle && (
                    <div className="p-3 rounded-lg bg-white border border-blue-300">
                      <p className="text-sm font-medium text-gray-700 mb-1">선택한 스타일:</p>
                      <a
                        href={selectedWebsiteStyle}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {(() => {
                          const styles = [
                            { url: "https://financialhealing.imweb.me/", name: "스타일 1" },
                            { url: "https://mjgood.imweb.me/", name: "스타일 2" },
                            { url: "https://jmbiz.imweb.me/", name: "스타일 3" },
                            { url: "https://ksupport-center.imweb.me/", name: "스타일 4" },
                            { url: "https://polarad.imweb.me/publicstyle", name: "스타일 5" },
                            { url: "https://polarad.imweb.me/financialstyle", name: "스타일 6" },
                          ];
                          return styles.find(s => s.url === selectedWebsiteStyle)?.name || "선택됨";
                        })()}
                      </a>
                    </div>
                  )}

                  {/* 컬러 선택 */}
                  <div>
                    <Label htmlFor="홈페이지컬러컨셉" className="text-sm font-medium mb-2 block">
                      홈페이지 컬러 컨셉
                    </Label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={websiteColor}
                        onChange={(e) => setWebsiteColor(e.target.value)}
                        disabled={!isEditingDesign || !isLogoConfirmed()}
                        className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex-1 space-y-2">
                        <Input
                          id="홈페이지컬러컨셉"
                          name="홈페이지컬러컨셉"
                          value={websiteColor}
                          onChange={(e) => setWebsiteColor(e.target.value)}
                          placeholder="#3B82F6"
                          disabled={!isEditingDesign || !isLogoConfirmed()}
                          className="font-mono bg-white"
                        />
                        <p className="text-xs text-gray-600">
                          컬러피커에서 선택하거나 직접 16진수 색상값을 입력하세요 (예: #3B82F6)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 통합 저장 버튼 */}
                  {isEditingDesign && selectedWebsiteStyle && (
                    <Button
                      onClick={async (e) => {
                        e.preventDefault();
                        setLoading(true);
                        try {
                          const res = await fetch("/api/submission", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              홈페이지스타일: selectedWebsiteStyle,
                              홈페이지컬러컨셉: websiteColor
                            }),
                          });
                          if (res.ok) {
                            await fetchSubmission();
                            setIsEditingDesign(false);
                            alert("스타일과 컬러가 저장되었습니다!");
                          } else {
                            alert("저장에 실패했습니다.");
                          }
                        } catch (error) {
                          console.error("Submit failed:", error);
                          alert("저장 중 오류가 발생했습니다.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !isLogoConfirmed()}
                      className="w-full bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base py-3"
                    >
                      {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
                      스타일 & 컬러 저장하기
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {hasWebsiteInfo() && !isEditingDesign ? (
                    <Button
                      type="button"
                      onClick={() => setIsEditingDesign(true)}
                      className="bg-amber-600 text-white hover:bg-amber-700 text-sm sm:text-base"
                    >
                      수정하기
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
                    >
                      {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
                      저장하기
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl border-2 border-gray-200">
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" />
            <span className="text-gray-900 font-medium">파일 업로드 중...</span>
          </div>
        </div>
      )}
    </div>
  );
}
