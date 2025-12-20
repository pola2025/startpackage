"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// RadioGroup 대신 커스텀 구현 사용
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  ExternalLink,
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

interface HomepageData {
  홈페이지스타일: string | null;
  홈페이지컬러컨셉: string | null;
  도메인관리사이트: string | null;
  도메인관리ID: string | null;
  도메인관리PW: string | null;
  해외결제카드앞면URL: string | null;
  해외결제카드뒷면URL: string | null;
  해외결제카드유효기간: string | null;
}

const DOMAIN_SITES = [
  { value: "가비아", label: "가비아", url: "https://www.gabia.com" },
  { value: "후이즈", label: "후이즈", url: "https://www.whois.co.kr" },
  { value: "카페24", label: "카페24", url: "https://www.cafe24.com" },
  { value: "닷홈", label: "닷홈", url: "https://www.dothome.co.kr" },
  { value: "기타", label: "기타", url: null },
];

export default function HomepageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HomepageData | null>(null);

  // 외부 서비스 폼
  const [domainSite, setDomainSite] = useState("");
  const [domainId, setDomainId] = useState("");
  const [domainPw, setDomainPw] = useState("");
  const [cardFrontUrl, setCardFrontUrl] = useState("");
  const [cardBackUrl, setCardBackUrl] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");

  // 이미지 업로드 상태
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // 홈페이지 스타일 상태
  const [selectedWebsiteStyle, setSelectedWebsiteStyle] = useState("");
  const [websiteColor, setWebsiteColor] = useState("#3B82F6");
  const [dialogOpen, setDialogOpen] = useState(false);
  const colorSectionRef = useRef<HTMLDivElement>(null);

  // 홈페이지 스타일 스크롤 상태
  const [styleScrolls, setStyleScrolls] = useState<Record<string, number>>({});
  const handleStyleScroll = (url: string, deltaY: number) => {
    setStyleScrolls(prev => ({
      ...prev,
      [url]: Math.max(0, Math.min((prev[url] || 0) + deltaY * 0.5, 1500))
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
        if (result.도메인관리사이트) setDomainSite(result.도메인관리사이트);
        if (result.도메인관리ID) setDomainId(result.도메인관리ID);
        if (result.도메인관리PW) setDomainPw(result.도메인관리PW);
        if (result.해외결제카드앞면URL) setCardFrontUrl(result.해외결제카드앞면URL);
        if (result.해외결제카드뒷면URL) setCardBackUrl(result.해외결제카드뒷면URL);
        if (result.해외결제카드유효기간) setCardExpiry(result.해외결제카드유효기간);
        if (result.홈페이지스타일) setSelectedWebsiteStyle(result.홈페이지스타일);
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
    domainSite.trim() &&
    domainId.trim() &&
    domainPw.trim() &&
    cardFrontUrl.trim() &&
    cardBackUrl.trim() &&
    /^\d{2}\/\d{2}$/.test(cardExpiry);

  // 저장 가능 여부
  const canSave = isFormValid;

  // 이미지 업로드 핸들러
  const handleImageUpload = async (
    file: File,
    type: "front" | "back"
  ) => {
    if (type === "front") setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        if (type === "front") setCardFrontUrl(url);
        else setCardBackUrl(url);
        // 업로드 성공
      } else {
        alert("이미지 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      if (type === "front") setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        도메인관리사이트: domainSite,
        도메인관리ID: domainId,
        도메인관리PW: domainPw,
        해외결제카드앞면URL: cardFrontUrl,
        해외결제카드뒷면URL: cardBackUrl,
        해외결제카드유효기간: cardExpiry,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-6 h-6 md:w-7 md:h-7" />
          홈페이지 설정
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          홈페이지 제작에 필요한 정보를 입력해주세요.
        </p>
      </div>

      {/* 홈페이지 제작 정보 입력 */}
      <div className="space-y-6">
          {/* 트래픽 기반 요금 안내 */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-orange-900">
                    📢 외부 서비스 요금 안내
                  </h4>
                  <div className="mt-2 space-y-2 text-sm text-orange-800">
                    <p>
                      외부 서비스 제작 시 <strong>사용량(트래픽)에 따라 비용이 과금</strong>됩니다.
                    </p>
                    <p className="mt-2 p-2 bg-orange-100 rounded">
                      💡 일반적인 소규모 비즈니스 홈페이지는 <strong>월 1~2만원 수준</strong>입니다.<br />
                      사용한 만큼만 과금되며, 하루 방문자 1,000명~수만명 수준이 아닌 경우 급상승 구간이 없습니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 도메인 정보 */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50 rounded-t-lg">
              <CardTitle className="text-purple-700 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                도메인 정보
              </CardTitle>
              <CardDescription>
                도메인을 먼저 구매한 후 관리 정보를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* 도메인 구매 안내 */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">도메인을 먼저 구매해주세요</p>
                    <p className="text-sm text-purple-700 mt-1">
                      아래 사이트에서 원하시는 도메인을 구매하실 수 있습니다.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DOMAIN_SITES.filter((s) => s.url).map((site) => (
                        <a
                          key={site.value}
                          href={site.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {site.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 입력 폼 */}
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-1 text-sm">
                    도메인 관리 사이트 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={domainSite} onValueChange={setDomainSite}>
                    <SelectTrigger className="mt-1 h-11 md:h-10">
                      <SelectValue placeholder="도메인 구매 사이트 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAIN_SITES.map((site) => (
                        <SelectItem key={site.value} value={site.value}>
                          {site.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="domainId" className="flex items-center gap-1 text-sm">
                    도메인 관리 ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="domainId"
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    placeholder="도메인 관리 사이트 로그인 ID"
                    className="mt-1 h-11 md:h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="domainPw" className="flex items-center gap-1 text-sm">
                    도메인 관리 비밀번호 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="domainPw"
                    type="password"
                    value={domainPw}
                    onChange={(e) => setDomainPw(e.target.value)}
                    placeholder="도메인 관리 사이트 비밀번호"
                    className="mt-1 h-11 md:h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 카드 정보 */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50 rounded-t-lg">
              <CardTitle className="text-purple-700 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                해외결제 카드 정보
              </CardTitle>
              <CardDescription>
                서비스 요금 결제를 위해 해외결제가 가능한 카드 정보를 등록해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* 보안 안내 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    카드 정보는 서비스 결제 연동에만 사용되며 암호화되어 안전하게 저장됩니다.
                  </span>
                </div>
              </div>

              {/* 카드 이미지 업로드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 앞면 */}
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    카드 앞면 사진 <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    카드번호가 전체 보이도록 촬영해주세요
                  </p>
                  {cardFrontUrl ? (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-2">
                      <img
                        src={cardFrontUrl}
                        alt="카드 앞면"
                        className="w-full h-32 object-contain rounded"
                      />
                      <button
                        onClick={() => setCardFrontUrl("")}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      {uploadingFront ? (
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-500 mt-2">클릭하여 업로드</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "front");
                        }}
                        disabled={uploadingFront}
                      />
                    </label>
                  )}
                </div>

                {/* 뒷면 */}
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    카드 뒷면 사진 <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    CVC 번호가 보이도록 촬영해주세요
                  </p>
                  {cardBackUrl ? (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-2">
                      <img
                        src={cardBackUrl}
                        alt="카드 뒷면"
                        className="w-full h-32 object-contain rounded"
                      />
                      <button
                        onClick={() => setCardBackUrl("")}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      {uploadingBack ? (
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-500 mt-2">클릭하여 업로드</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "back");
                        }}
                        disabled={uploadingBack}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 유효기간 */}
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

              {/* 필수 입력 안내 */}
              {!isFormValid && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    모든 정보를 입력해야 저장할 수 있습니다.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* 홈페이지 스타일 선택 */}
      <Card className="border-green-200">
          <CardHeader className="bg-green-50 rounded-t-lg">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              홈페이지 스타일 선택
            </CardTitle>
            <CardDescription>
              원하시는 홈페이지 스타일을 선택해주세요. (썸네일 클릭 시 크게 보기)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6">
            {/* 스타일 선택 그리드 - 모바일 2열, 태블릿 2열, 데스크탑 3열 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {[
                { url: "https://financialhealing.imweb.me/", name: "스타일 1" },
                { url: "https://bizen.co.kr/", name: "스타일 2" },
                { url: "https://jmbiz.imweb.me/", name: "스타일 3" },
                { url: "https://ksupport-center.imweb.me/", name: "스타일 4" },
                { url: "https://dkcenter.imweb.me/", name: "스타일 5" },
                { url: "https://www.k-eai.kr/index.html", name: "스타일 6" },
              ].map((style) => (
                <Dialog key={style.url} open={dialogOpen && selectedWebsiteStyle === style.url} onOpenChange={(open) => {
                  setDialogOpen(open);
                }}>
                  <div
                    className={`rounded-lg border-2 transition-all overflow-hidden cursor-pointer ${
                      selectedWebsiteStyle === style.url
                        ? "border-green-600 ring-2 ring-green-300"
                        : "border-gray-300 hover:border-green-400"
                    }`}
                  >
                    {/* 썸네일 */}
                    <DialogTrigger asChild>
                      <div
                        className="relative group"
                        onClick={() => {
                          setSelectedWebsiteStyle(style.url);
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
                              width: '300%',
                              height: '300%',
                              transform: `scale(0.33) translateY(-${styleScrolls[style.url] || 0}px)`
                            }}
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
                      {selectedWebsiteStyle === style.url && (
                        <span className="text-xs text-green-600 font-medium">✓ 선택됨</span>
                      )}
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
                    <p className="text-xs text-gray-500 text-center">미리보기 위에서 스크롤하여 페이지를 탐색할 수 있습니다</p>
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
                        className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-9 sm:h-10"
                      >
                        스타일 선택하기
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>

            {/* 컬러 컨셉 선택 */}
            <div ref={colorSectionRef} className="space-y-3 p-4 rounded-lg border-2 border-green-200 bg-green-50/50">
              <Label className="text-sm sm:text-base font-semibold">
                선택한 스타일과 컬러 컨셉
              </Label>

              {/* 선택된 스타일 표시 */}
              {selectedWebsiteStyle && (
                <div className="p-3 rounded-lg bg-white border border-green-300">
                  <p className="text-sm font-medium text-gray-700 mb-1">선택한 스타일:</p>
                  <a
                    href={selectedWebsiteStyle}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline text-sm"
                  >
                    {(() => {
                      const styles = [
                        { url: "https://financialhealing.imweb.me/", name: "스타일 1" },
                        { url: "https://bizen.co.kr/", name: "스타일 2" },
                        { url: "https://jmbiz.imweb.me/", name: "스타일 3" },
                        { url: "https://ksupport-center.imweb.me/", name: "스타일 4" },
                        { url: "https://dkcenter.imweb.me/", name: "스타일 5" },
                        { url: "https://www.k-eai.kr/index.html", name: "스타일 6" },
                      ];
                      return styles.find(s => s.url === selectedWebsiteStyle)?.name || "선택됨";
                    })()}
                  </a>
                </div>
              )}

              {/* 컬러 선택 */}
              <div>
                <Label htmlFor="websiteColor" className="text-sm font-medium mb-2 block">
                  홈페이지 컬러 컨셉
                </Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={websiteColor}
                    onChange={(e) => setWebsiteColor(e.target.value)}
                    className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
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
                      컬러피커에서 선택하거나 직접 16진수 색상값을 입력하세요 (예: #3B82F6)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full md:w-auto px-8 h-12 md:h-10"
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
