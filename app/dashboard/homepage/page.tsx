"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Info,
  CreditCard,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// toast 대신 alert 사용
import Image from "next/image";
import { useRef } from "react";
import imageCompression from "browser-image-compression";
import {
  HOMEPAGE_STYLE_OPTIONS,
  getHomepageStyleName,
  isPaidHomepageStyle,
} from "@/lib/homepage-styles";
import {
  ONLINE_MARKETING_MONTHLY_PRICE,
  formatManwon,
} from "@/lib/marketing-pricing";

interface HomepageData {
  홈페이지스타일: string | null;
  홈페이지컬러컨셉: string | null;
  해외결제카드앞면URL: string | null;
  해외결제카드유효기간: string | null;
  해외결제카드CVC: string | null;
  GmailID: string | null;
  GmailPW: string | null;
}

export default function HomepageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HomepageData | null>(null);

  // 외부 서비스 폼
  const [cardFrontUrl, setCardFrontUrl] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Gmail 상태
  const [gmailId, setGmailId] = useState("");
  const [gmailPw, setGmailPw] = useState("");

  // 이미지 업로드 상태
  const [uploadingFront, setUploadingFront] = useState(false);

  // 홈페이지 스타일 상태
  const [selectedWebsiteStyle, setSelectedWebsiteStyle] = useState("");
  const [websiteColor, setWebsiteColor] = useState("#3B82F6");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewStyleUrl, setPreviewStyleUrl] = useState<string | null>(null);
  const colorSectionRef = useRef<HTMLDivElement>(null);

  // 홈페이지 스타일 스크롤 상태
  const [styleScrolls, setStyleScrolls] = useState<Record<string, number>>({});
  const handleStyleScroll = (url: string, deltaY: number) => {
    setStyleScrolls((prev) => ({
      ...prev,
      [url]: Math.max(0, Math.min((prev[url] || 0) + deltaY * 0.5, 1500)),
    }));
  };

  // 로고 확정 상태
  const [isLogoConfirmed, setIsLogoConfirmed] = useState(false);

  useEffect(() => {
    fetchData();
    fetchLogoStatus();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/homepage");
      if (response.ok) {
        const result = await response.json();
        setData(result);

        // 폼 초기화
        if (result.해외결제카드앞면URL)
          setCardFrontUrl(result.해외결제카드앞면URL);
        if (result.해외결제카드유효기간)
          setCardExpiry(result.해외결제카드유효기간);
        if (result.해외결제카드CVC) setCardCvc(result.해외결제카드CVC);
        if (result.GmailID) setGmailId(result.GmailID);
        if (result.GmailPW) setGmailPw(result.GmailPW);
        if (result.홈페이지스타일) {
          setSelectedWebsiteStyle(
            isPaidHomepageStyle(result.홈페이지스타일)
              ? ""
              : result.홈페이지스타일,
          );
        }
        if (result.홈페이지컬러컨셉) setWebsiteColor(result.홈페이지컬러컨셉);
      }
    } catch (error) {
      console.error("Failed to fetch homepage data:", error);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 로고 확정 상태 조회
  const fetchLogoStatus = async () => {
    try {
      const response = await fetch("/api/submission");
      if (response.ok) {
        const result = await response.json();
        setIsLogoConfirmed(result.로고시안확정 === true);
      }
    } catch (error) {
      console.error("Failed to fetch logo status:", error);
    }
  };

  // 필수 입력 확인
  const isFormValid =
    gmailId.trim() &&
    gmailPw.trim() &&
    cardFrontUrl.trim() &&
    /^\d{2}\/\d{2}$/.test(cardExpiry) &&
    /^\d{3}$/.test(cardCvc);

  // 저장 가능 여부
  const canSave = isFormValid;

  // 이미지 업로드 핸들러
  const handleImageUpload = async (file: File) => {
    setUploadingFront(true);

    try {
      // 이미지 자동 압축 (GIF 제외)
      let processedFile = file;
      if (file.type.startsWith("image/") && file.type !== "image/gif") {
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type as string,
          };
          const compressedFile = await imageCompression(file, options);
          processedFile = new File([compressedFile], file.name, {
            type: compressedFile.type,
            lastModified: Date.now(),
          });
        } catch (compressionError) {
          console.error("[압축] 이미지 압축 실패:", compressionError);
        }
      }

      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("field", "해외결제카드앞면URL");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCardFrontUrl(data.url);
        if (data.sensitive) {
          alert(
            "카드 이미지가 안전하게 전송되었습니다.\n(보안을 위해 서버에는 저장되지 않습니다)",
          );
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "이미지 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingFront(false);
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!canSave) return;
    if (isPaidHomepageStyle(selectedWebsiteStyle)) {
      alert(
        "유료옵션은 개별문의가 필요하여 신청 화면에서 바로 선택할 수 없습니다.",
      );
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        홈페이지제작방식: "외부서비스",
        해외결제카드앞면URL: cardFrontUrl,
        해외결제카드유효기간: cardExpiry,
        해외결제카드CVC: cardCvc,
        GmailID: gmailId || "",
        GmailPW: gmailPw || "",
      };

      // 스타일 정보 추가
      if (selectedWebsiteStyle) {
        payload.홈페이지스타일 = selectedWebsiteStyle;
      }
      if (websiteColor) {
        payload.홈페이지컬러컨셉 = websiteColor;
      }

      const response = await fetch("/api/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("홈페이지 정보가 저장되었습니다.");
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 유효기간 입력 포맷팅
  const handleExpiryChange = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) {
      setCardExpiry(numbers);
    } else {
      setCardExpiry(`${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`);
    }
  };

  // Step 완료 여부 계산
  const step1Done = gmailId.trim() && gmailPw.trim();
  const step2Done =
    cardFrontUrl.trim() &&
    /^\d{2}\/\d{2}$/.test(cardExpiry) &&
    /^\d{3}$/.test(cardCvc);
  const step3Done =
    !!selectedWebsiteStyle && !isPaidHomepageStyle(selectedWebsiteStyle);
  const completedSteps = [step1Done, step2Done, step3Done].filter(
    Boolean,
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gold-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 md:w-7 md:h-7" />
            홈페이지 설정
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            홈페이지 제작에 필요한 정보를 입력해주세요.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              completedSteps === 3
                ? "bg-green-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {completedSteps === 3 ? "✓" : completedSteps}
          </span>
          {completedSteps}/3 Step 완료
        </div>
      </div>

      {/* Step 1: Gmail 계정 */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
            <CardTitle className="text-gray-900 text-base flex items-center gap-2">
              Gmail (서비스 인프라 연결용)
            </CardTitle>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              필수
            </span>
            {step1Done ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                입력됨
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-600">
            메일 발신용이 아니라 홈페이지·서비스 인프라 연결에 사용됩니다.
            사용하시는 Gmail 계정 ID/PW를 입력해주세요.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="gmailId"
                className="text-sm flex items-center gap-1"
              >
                Gmail ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gmailId"
                value={gmailId}
                onChange={(e) => setGmailId(e.target.value)}
                placeholder="example@gmail.com"
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="gmailPw"
                className="text-sm flex items-center gap-1"
              >
                비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gmailPw"
                type="password"
                value={gmailPw}
                onChange={(e) => setGmailPw(e.target.value)}
                placeholder="비밀번호"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: 해외결제 카드 정보 */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </span>
            <CardTitle className="text-gray-900 text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-600" />
              해외결제 카드 정보
            </CardTitle>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              필수
            </span>
            {step2Done ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                완료
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layer 1: 입력 필드 */}
          <div className="space-y-4">
            {/* 카드 이미지 업로드 */}
            <div>
              <Label className="flex items-center gap-1 mb-2">
                신용카드 사진 <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                카드번호가 보이도록 촬영해주세요
              </p>
              {cardFrontUrl ? (
                <div className="relative border border-dashed border-green-400 rounded-lg p-2 bg-green-50">
                  {cardFrontUrl === "SLACK_ONLY" ? (
                    <div className="flex flex-col items-center justify-center h-32">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                      <span className="text-sm text-green-700 font-medium">
                        슬랙으로 전송 완료
                      </span>
                      <span className="text-xs text-gray-500">
                        보안을 위해 서버 저장 안 함
                      </span>
                    </div>
                  ) : (
                    <img
                      src={cardFrontUrl}
                      alt="신용카드"
                      className="w-full h-32 object-contain rounded"
                    />
                  )}
                  <button
                    onClick={() => setCardFrontUrl("")}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  {uploadingFront ? (
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500 mt-2">
                        클릭하여 업로드
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploadingFront}
                  />
                </label>
              )}
            </div>

            {/* 유효기간 + CVC */}
            <div className="flex gap-6">
              <div>
                <Label htmlFor="cardExpiry" className="flex items-center gap-1">
                  카드 유효기간 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cardExpiry"
                  value={cardExpiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  placeholder="MM/YY (예: 12/25)"
                  maxLength={5}
                  className="mt-1 w-32"
                />
              </div>
              <div>
                <Label htmlFor="cardCvc" className="flex items-center gap-1">
                  CVC 번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cardCvc"
                  value={cardCvc}
                  onChange={(e) =>
                    setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  placeholder="예: 123"
                  maxLength={3}
                  className="mt-1 w-24"
                />
              </div>
            </div>
          </div>

          {/* Layer 2: 보안 안내 (인라인 축소) */}
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            카드 정보는 서비스 결제 연동에만 사용되며 암호화되어 안전하게
            저장됩니다.
          </p>

          {/* 필수 입력 안내 */}
          {!isFormValid &&
          (gmailId || gmailPw || cardFrontUrl || cardExpiry || cardCvc) ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-sm text-yellow-700">
                모든 정보를 입력해야 저장할 수 있습니다.
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Step 3: 홈페이지 스타일 */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              3
            </span>
            <CardTitle className="text-gray-900 text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-600" />
              홈페이지 스타일 선택
            </CardTitle>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
              선택
            </span>
            {step3Done ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                완료
              </span>
            ) : null}
          </div>
          <CardDescription className="mt-1 pl-9">
            원하시는 홈페이지 스타일을 선택해주세요. (썸네일 클릭 시 크게 보기)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Layer 1: 스타일 선택 그리드 + 컬러피커 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {HOMEPAGE_STYLE_OPTIONS.map((style, idx) => {
              const firstPaidIdx = HOMEPAGE_STYLE_OPTIONS.findIndex(
                (s) => s.paid,
              );
              return (
                <Fragment key={style.url}>
                  {idx === firstPaidIdx && firstPaidIdx > 0 ? (
                    <div className="col-span-2 lg:col-span-3 flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-amber-200" />
                      <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 whitespace-nowrap">
                        유료옵션 · 개별문의
                      </div>
                      <div className="flex-1 h-px bg-amber-200" />
                    </div>
                  ) : null}
                  <Dialog
                    open={dialogOpen && previewStyleUrl === style.url}
                    onOpenChange={(open) => {
                      setDialogOpen(open);
                      setPreviewStyleUrl(open ? style.url : null);
                    }}
                  >
                    <div
                      className={`rounded-lg border transition-all overflow-hidden cursor-pointer ${
                        selectedWebsiteStyle === style.url
                          ? "border-green-600 ring-2 ring-green-300"
                          : style.paid
                            ? "border-amber-300 hover:border-amber-400"
                            : "border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {/* 썸네일 */}
                      <DialogTrigger asChild>
                        <div
                          className="relative group"
                          onClick={() => {
                            if (!style.paid) {
                              setSelectedWebsiteStyle(style.url);
                            }
                            setPreviewStyleUrl(style.url);
                            setDialogOpen(true);
                          }}
                        >
                          <div
                            className="aspect-[4/3] overflow-hidden bg-gray-100 cursor-ns-resize"
                            onWheel={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStyleScroll(style.url, e.deltaY);
                            }}
                          >
                            <iframe
                              src={style.url}
                              className="w-full h-full origin-top-left pointer-events-none"
                              style={{
                                width: "300%",
                                height: "300%",
                                transform: `scale(0.33) translateY(-${styleScrolls[style.url] || 0}px)`,
                              }}
                              title={`${style.name} 미리보기`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
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
                        <div className="font-semibold text-sm">
                          {style.name}
                        </div>
                        {style.paid ? (
                          <span className="text-xs text-amber-700 font-medium">
                            선택 불가 · 개별문의
                          </span>
                        ) : selectedWebsiteStyle === style.url ? (
                          <span className="text-xs text-green-600 font-medium">
                            ✓ 선택됨
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* 큰 미리보기 Dialog */}
                    <DialogContent className="w-[96vw] sm:w-[90vw] max-w-5xl max-h-[92vh] overflow-y-auto bg-white border border-gray-200 p-2 sm:p-4 md:p-6">
                      <DialogHeader className="pb-2 space-y-1">
                        <DialogTitle className="text-gray-900 text-base sm:text-lg md:text-xl">
                          {style.name} 미리보기
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 text-xs sm:text-sm">
                          웹사이트 미리보기
                        </DialogDescription>
                      </DialogHeader>
                      <div className="w-full aspect-[16/9] overflow-hidden rounded-md border border-gray-200 my-2 sm:my-3 md:my-4 bg-gray-100">
                        <iframe
                          src={style.url}
                          className="w-[200%] h-[200%] origin-top-left"
                          style={{ transform: "scale(0.5)" }}
                          title={`${style.name} 전체보기`}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        미리보기 위에서 스크롤하여 페이지를 탐색할 수 있습니다
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => window.open(style.url, "_blank")}
                          className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                        >
                          새 탭에서 열기
                        </Button>
                        {style.paid ? (
                          <div className="flex-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-amber-800">
                            선택 불가 · 개별문의
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedWebsiteStyle(style.url);
                              setPreviewStyleUrl(null);
                              setDialogOpen(false);
                              // 컬러 선택 섹션으로 스크롤
                              setTimeout(() => {
                                colorSectionRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                              }, 100);
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-9 sm:h-10"
                          >
                            스타일 선택하기
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </Fragment>
              );
            })}
          </div>

          {/* 유료옵션 안내 */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <div>
              <span className="font-semibold">유료옵션</span> 온라인마케팅
              대행상품 이용 시 선택 가능 (월{" "}
              {formatManwon(ONLINE_MARKETING_MONTHLY_PRICE)}, VAT 포함)
            </div>
          </div>

          {/* 컬러 컨셉 선택 */}
          <div
            ref={colorSectionRef}
            className="space-y-3 p-4 rounded-lg border border-gray-200 bg-white"
          >
            <Label className="text-sm sm:text-base font-semibold">
              선택한 스타일과 컬러 컨셉
            </Label>

            {/* 선택된 스타일 표시 */}
            {selectedWebsiteStyle && (
              <div className="p-3 rounded-lg bg-white border border-green-300">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  선택한 스타일:
                </p>
                <a
                  href={selectedWebsiteStyle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline text-sm"
                >
                  {getHomepageStyleName(selectedWebsiteStyle) || "선택됨"}
                </a>
              </div>
            )}

            {/* 컬러 선택 */}
            <div>
              <Label
                htmlFor="websiteColor"
                className="text-sm font-medium mb-2 block"
              >
                홈페이지 컬러 컨셉
              </Label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={websiteColor}
                  onChange={(e) => setWebsiteColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    id="websiteColor"
                    value={websiteColor}
                    onChange={(e) => setWebsiteColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="font-mono bg-white"
                  />
                  <p className="text-xs text-gray-600">
                    컬러피커에서 선택하거나 직접 16진수 색상값을 입력하세요 (예:
                    #3B82F6)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Layer 2: 트래픽 요금 안내 (하단 이동) */}
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <span className="font-semibold">외부 서비스 요금 안내: </span>
              사용량(트래픽)에 따라 비용이 과금됩니다. 월{" "}
              <strong>100GB 기본 트래픽 제공</strong> / 100GB 초과 시에만 유료
              구간이 적용됩니다.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full md:w-auto px-8 h-10"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            "저장"
          )}
        </Button>
      </div>
    </div>
  );
}
