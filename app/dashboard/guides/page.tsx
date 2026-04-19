"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  MessageSquare,
  CreditCard,
  Globe,
  Mail,
  FileText,
  Instagram,
  UserPlus,
  Palette,
  Sparkles,
  ExternalLink,
  Video,
  Clock,
  Target,
  ShieldCheck,
  Clapperboard,
  Smartphone,
  AlertTriangle,
  Award,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Check,
  X,
  Lightbulb,
  Info,
  Timer,
  Crosshair,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 가이드 메뉴 데이터
const guideMenus = [
  {
    value: "telegram",
    label: "텔레그램",
    icon: MessageSquare,
    color: "bg-gold-500",
  },
  { value: "sms", label: "SMS 발신", icon: Mail, color: "bg-green-500" },
  {
    value: "meta",
    label: "메타 결제",
    icon: CreditCard,
    color: "bg-purple-500",
  },
  {
    value: "design",
    label: "인쇄물 발주",
    icon: FileText,
    color: "bg-orange-500",
  },
  { value: "video", label: "영상제작", icon: Video, color: "bg-red-500" },
  {
    value: "meta-admin",
    label: "Meta 관리자",
    icon: UserPlus,
    color: "bg-indigo-500",
  },
  {
    value: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-500",
  },
  { value: "logo", label: "로고 제작", icon: Palette, color: "bg-amber-500" },
  {
    value: "ai-tips",
    label: "AI 활용",
    icon: Sparkles,
    color: "bg-violet-500",
  },
];

export default function GuidesPage() {
  const [activeTab, setActiveTab] = useState("telegram");

  // URL 해시에서 탭 읽기
  useEffect(() => {
    const hash = window.location.hash.slice(1); // # 제거
    if (hash) {
      setActiveTab(hash);
    }
  }, []);

  // 탭 변경 시 URL 해시 업데이트
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.history.pushState(null, "", `#${value}`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1 md:mb-2">
          <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-navy-900" />
          가이드
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          스타트패키지 이용 가이드를 확인하세요
        </p>
      </div>

      {/* 개별결제 스키니배너 */}
      <a
        href="https://booking.naver.com/booking/5/bizes/1304508/items/6516411"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-3 transition-all shadow-md hover:shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm md:text-base">
                개별결제 및 주문 카드결제
              </p>
              <p className="text-xs text-green-100">
                네이버 예약으로 간편하게 결제하세요
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            <span className="hidden sm:inline">네이버예약 바로가기</span>
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </a>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        {/* 3x3 박스 그리드 메뉴 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {guideMenus.map((menu) => {
            const Icon = menu.icon;
            const isActive = activeTab === menu.value;
            return (
              <button
                key={menu.value}
                onClick={() => handleTabChange(menu.value)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border transition-all",
                  isActive
                    ? "bg-gold-50 border-gold-500 shadow-md"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2",
                    isActive ? menu.color : "bg-gray-100",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 md:w-6 md:h-6",
                      isActive ? "text-white" : "text-gray-500",
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs md:text-sm font-medium text-center",
                    isActive ? "text-navy-700" : "text-gray-700",
                  )}
                >
                  {menu.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 숨겨진 TabsList (Tabs 컴포넌트 동작을 위해 필요) */}
        <TabsList className="hidden">
          {guideMenus.map((menu) => (
            <TabsTrigger key={menu.value} value={menu.value}>
              {menu.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 텔레그램 가이드 */}
        <TabsContent value="telegram">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                텔레그램 설정 가이드
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                고객 상담 알림을 받기 위한 텔레그램 설정 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 text-gray-700 p-3 md:p-4 pt-0 md:pt-0">
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-1.5 md:mb-2">
                  1. 텔레그램 설치
                </h3>
                <p className="text-xs md:text-sm text-gray-600">
                  구글 플레이스토어에서 &apos;텔레그램&apos; 검색 후 설치
                </p>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-1.5 md:mb-2">
                  2. 개인정보 보호 설정
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
                  <li>좌측 햄버거메뉴 (삼선메뉴) 클릭</li>
                  <li>설정 클릭</li>
                  <li>개인 정보 및 보안 클릭</li>
                  <li>전화번호 클릭</li>
                  <li>
                    내 전화번호를 볼 수 있는 사람 -{" "}
                    <span className="text-orange-600">&apos;없음&apos;</span>{" "}
                    체크
                  </li>
                  <li>
                    내 번호로 나를 찾을 수 있는 사람 -{" "}
                    <span className="text-orange-600">
                      &apos;내 연락처&apos;
                    </span>{" "}
                    체크
                  </li>
                </ol>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 개인정보 보호 설정을 완료해야
                  홈페이지 상담 접수 시 텔레그램으로 알림을 받을 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS 발신 가이드 */}
        <TabsContent value="sms">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 md:w-5 md:h-5" />
                SMS 발신 등록 가이드
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                고객에게 문자 발송을 위한 필수 서류 안내
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📋 필요 서류
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      1. 사업자등록증
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      문자 발신 서비스 등록용
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      2. 대표자 신분증
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      본인 확인용 (법적 요구사항)
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      3. 통신서비스 이용증명원
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      발신번호로 사용할 번호의 통신사에서 발급
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      4. 신용카드 앞면
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      번호, 유효기간, CVV 번호 포함
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📱 발신번호 선택
                </h3>
                <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                  <div className="p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-green-700 mb-1.5 md:mb-2">
                      핸드폰 번호 발신
                    </h4>
                    <ul className="text-xs md:text-sm text-gray-700 space-y-0.5 md:space-y-1">
                      <li>✅ 고객 문자 수신 가능</li>
                      <li>✅ 핸드폰 통신사에서 발급</li>
                    </ul>
                  </div>
                  <div className="p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-orange-600 mb-1.5 md:mb-2">
                      대표번호 발신
                    </h4>
                    <ul className="text-xs md:text-sm text-gray-700 space-y-0.5 md:space-y-1">
                      <li>⚠️ 고객 문자 수신 불가</li>
                      <li>✅ 대표번호 통신사에서 발급</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  ⚠️ <strong>중요:</strong> 통신서비스 이용증명원은 통신사별로
                  문서 이름이 다릅니다. 네이버에서 &apos;통신서비스 이용증명원
                  발급&apos;을 검색하면 상세 가이드를 확인할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 메타 결제 가이드 */}
        <TabsContent value="meta">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                메타 광고 결제 안내
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                메타(페이스북/인스타그램) 광고 결제 방식 안내
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  💳 결제 패턴
                </h3>
                <div className="space-y-2 text-gray-700">
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium mb-0.5 md:mb-1">
                      초반 (1~2주)
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      $1, $2, $3 등 소액으로 자주 결제
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium mb-0.5 md:mb-1">
                      중반 (1개월)
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      $10, $20, $30 등으로 상향 결제
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium mb-0.5 md:mb-1">
                      안정기 (1~2개월 이후)
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      $100, $200 금액으로 정기 청구
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 카드 결제 시점에 따라 전월 결제액이
                  당월로 넘어와 청구될 수 있습니다. 결제 청구일에 따라 시점이
                  달라지는 것일 뿐 일 예산 및 월 예산은 지정된 예산 범위로
                  운영됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 아임웹 가이드 */}
        <TabsContent value="imweb">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 md:w-5 md:h-5" />
                아임웹 사용 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  ✍️ 게시글 등록 방법
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700">
                  <li>아임웹 로그인</li>
                  <li>사이트 선택</li>
                  <li>사이트관리자화면 / 대시보드 진입</li>
                  <li>사이트 바로가기 클릭</li>
                  <li>메인페이지 - 접수폼 위에 &apos;글쓰기&apos; 클릭</li>
                </ol>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700 mb-1.5 md:mb-2">
                  <strong>✅ SEO 최적화 Tip:</strong>
                </p>
                <ul className="text-xs md:text-sm text-gray-600 space-y-0.5 md:space-y-1">
                  <li>• 블로그 글 또는 인스타그램 게시글을 복사하여 작성</li>
                  <li>• 웹 검색에 평균 1~2개월 후 반영</li>
                  <li>• 반영 후 일주일에 한 번씩 업데이트</li>
                  <li>• 네이버 블로그 이미지는 개별 업로드 필요</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  💰 아임웹 요금 체계
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5 md:p-3 mb-2 md:mb-3">
                    <p className="text-xs md:text-sm text-indigo-900 font-medium">
                      💡 <strong>도메인 + 호스팅 비용이 포함된 금액</strong>
                      입니다
                    </p>
                  </div>
                  {/* 테이블 - 모바일 가로 스크롤 */}
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden min-w-[400px] md:min-w-0">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gold-100">
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-gray-900 whitespace-nowrap">
                              결제 기간
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-gray-900 whitespace-nowrap">
                              총 금액
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-gray-900 whitespace-nowrap">
                              월 환산
                            </th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-gray-900 whitespace-nowrap">
                              할인율
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          <tr className="border-t border-gold-100">
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900 whitespace-nowrap">
                              1개월
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-900 whitespace-nowrap">
                              22,000원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                              월 22,000원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-500">
                              -
                            </td>
                          </tr>
                          <tr className="border-t border-gold-100 bg-green-50">
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900 whitespace-nowrap">
                              3개월
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-900 whitespace-nowrap">
                              62,700원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-green-700 whitespace-nowrap">
                              월 20,900원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-green-600 font-medium whitespace-nowrap">
                              5% 할인
                            </td>
                          </tr>
                          <tr className="border-t border-gold-100 bg-orange-50">
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900 whitespace-nowrap">
                              6개월
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-900 whitespace-nowrap">
                              118,800원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-orange-700 whitespace-nowrap">
                              월 19,800원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-orange-600 font-medium whitespace-nowrap">
                              10% 할인
                            </td>
                          </tr>
                          <tr className="border-t border-gold-100 bg-purple-50">
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900 font-medium whitespace-nowrap">
                              12개월 (추천)
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-900 whitespace-nowrap">
                              211,200원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-purple-700 whitespace-nowrap">
                              월 17,600원
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-purple-600 font-bold whitespace-nowrap">
                              20% 할인
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-2.5 md:p-3 bg-white border border-gray-200 rounded-lg">
                    <p className="text-xs md:text-sm text-gray-700 font-medium mb-0.5 md:mb-1">
                      📌 결제 안내
                    </p>
                    <ul className="text-xs md:text-sm text-gray-600 space-y-0.5 md:space-y-1">
                      <li>
                        • 장기 결제 시{" "}
                        <strong>해당 기간 요금을 한번에 결제</strong>하면 할인
                        적용
                      </li>
                      <li>• 중도 해지 시 할인 금액 일부만 환불</li>
                      <li>• 11,000원 요금제는 기능 제한 (22,000원 권장)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  💳 아임웹 결제 방법
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <h4 className="text-sm md:text-base font-medium text-navy-900 mb-2 md:mb-3">
                      1단계: 결제수단 등록
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3">
                      먼저 카드 정보를 등록해주세요
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://imweb.me/payment_method"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors text-xs md:text-sm font-medium"
                      >
                        결제수단 등록하기 →
                      </a>
                      <a
                        href="https://imweb.me/faq?mode=view&category=28&category2=31&idx=71930"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs md:text-sm font-medium"
                      >
                        카드 등록 가이드 →
                      </a>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <h4 className="text-sm md:text-base font-medium text-green-900 mb-2 md:mb-3">
                      2단계: 요금제 결제
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700 mb-2 md:mb-3">
                      <li>
                        <a
                          href="https://imweb.me/mysite"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 hover:underline font-medium"
                        >
                          내 사이트 페이지
                        </a>{" "}
                        접속
                      </li>
                      <li>
                        <span className="text-gold-600 font-medium">
                          &apos;Starter 결제&apos;
                        </span>{" "}
                        파란 글자 클릭
                      </li>
                      <li>결제 기간 선택 (1개월/3개월/6개월/12개월)</li>
                      <li>결제 버튼 클릭하여 완료</li>
                    </ol>
                    <a
                      href="https://imweb.me/mysite"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm font-medium"
                    >
                      결제하러 가기 →
                    </a>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <p className="text-xs md:text-sm text-gray-700">
                      ⚠️ <strong>주의:</strong> 결제 전 요금제와 기간을 다시
                      한번 확인하세요. 중도 해지 시 할인 금액은 일부만
                      환불됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  🌐 도메인 설정
                </h3>
                <div className="space-y-1.5 md:space-y-2 text-gray-700">
                  <p className="text-sm md:text-base font-medium">
                    기본 도메인: 대표님도메인.imweb.me
                  </p>
                  <p className="text-xs md:text-sm text-gray-600">
                    ✅ HTTPS 보안 인증 완료 상태
                  </p>
                  <div className="p-2.5 md:p-3 bg-white border border-gray-200 rounded-lg mt-1.5 md:mt-2">
                    <p className="text-xs md:text-sm">
                      <strong>개인 도메인 (.co.kr, .com 등):</strong>
                      <br />
                      도메인 판매업체에서 구입 후 ID/PW 전달 필요
                      <br />
                      ⚠️ 별도 보안 인증 필요
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  🔑 관리자 비밀번호를 잊으셨나요?
                </h3>
                <div className="p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3">
                    아임웹 관리자 비밀번호가 생각나지 않을 때는 아래 가이드를
                    참고하여 비밀번호를 변경해주세요.
                  </p>
                  <a
                    href="https://imweb.me/faq?mode=view&category=30&category2=46&idx=72150"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs md:text-sm font-medium"
                  >
                    아임웹 비밀번호 변경 안내 →
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📝 계정 이관
                </h3>
                <p className="text-xs md:text-sm text-gray-700">
                  홈페이지 확인 후 계정 이관을 위해 imweb.me 가입 후 아이디를
                  전달해주세요.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meta 광고관리자 초대 가이드 */}
        <TabsContent value="meta-admin">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                Meta 광고관리자 초대 안내
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Meta 광고 계정에 관리자 권한 부여 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  👥 관리자 초대 절차
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700">
                  <li>Meta 비즈니스 관리자(business.facebook.com) 접속</li>
                  <li>비즈니스 설정 클릭</li>
                  <li>사용자 &gt; 사람 메뉴 선택</li>
                  <li>&apos;추가&apos; 버튼 클릭</li>
                  <li>
                    초대할 사람의 이메일 입력:{" "}
                    <strong className="text-gold-600">mkt@polarad.co.kr</strong>
                  </li>
                  <li>권한 수준: &apos;관리자 액세스&apos; 선택</li>
                  <li>&apos;다음&apos; 클릭 후 초대 완료</li>
                </ol>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  🔑 광고 계정 액세스 권한 부여
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700">
                  <li>비즈니스 설정 &gt; 계정 &gt; 광고 계정 선택</li>
                  <li>해당 광고 계정 클릭</li>
                  <li>&apos;사람 추가&apos; 클릭</li>
                  <li>초대한 사람 선택</li>
                  <li>역할: &apos;광고 계정 관리&apos; 선택</li>
                  <li>&apos;할당&apos; 클릭</li>
                </ol>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 초대받은 사람은 이메일로 받은 초대
                  링크를 통해 수락해야 권한이 활성화됩니다.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  ⚠️ <strong>주의:</strong> 관리자 권한은 광고 계정의 모든
                  설정을 변경할 수 있으므로, 신뢰할 수 있는 사람에게만
                  부여하세요.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instagram PC 로그인 가이드 */}
        <TabsContent value="instagram">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <Instagram className="w-4 h-4 md:w-5 md:h-5" />
                Instagram PC 로그인 오류 해결
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                PC에서 Instagram 접속 시 비밀번호 오류 해결 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                <p className="text-xs md:text-sm text-gray-700 font-semibold mb-1.5 md:mb-2">
                  ⚠️ 반드시 다음 과정으로 진행하세요!
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  PC에서 로그인이 안 되는 경우, 반드시 앱에서 비밀번호를
                  재설정해야 합니다.
                </p>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📱 비밀번호 재설정 절차
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700">
                  <li>인스타그램 앱 실행</li>
                  <li>오른쪽 삼선메뉴 (햄버거메뉴) 클릭</li>
                  <li>계정센터 클릭</li>
                  <li>비밀번호 및 보안 클릭</li>
                  <li>비밀번호 변경 선택</li>
                  <li>인스타 계정 선택</li>
                  <li>
                    <span className="text-gold-600 font-medium">
                      파란색 글자 &quot;비밀번호를 잊으셨나요?&quot;
                    </span>{" "}
                    클릭
                  </li>
                  <li>계정 비밀번호 재설정 후 로그인</li>
                  <li>
                    <span className="text-orange-600 font-medium">
                      재설정한 비밀번호를 다시 전달
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  ✅ <strong>완료 후:</strong> 새로운 비밀번호로 PC에서 로그인이
                  정상적으로 가능합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 로고 제작 가이드 */}
        <TabsContent value="logo">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <Palette className="w-4 h-4 md:w-5 md:h-5" />
                로고 제작 가이드
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                로고 제작 요청 방법 및 추천 사이트 안내
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              {/* 핵심 정책 (최상단 강조) */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 md:p-5">
                <div className="flex items-start gap-3 mb-3 md:mb-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-base md:text-lg font-bold">
                      !
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-red-900 mb-0.5">
                      로고 제작 핵심 정책
                    </h3>
                    <p className="text-xs md:text-sm text-red-700">
                      아래 정책은 모든 고객에게 동일하게 적용됩니다
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 md:gap-2.5">
                  <div className="bg-white rounded-lg p-3 border-l-4 border-red-500 flex items-start gap-3">
                    <span className="text-red-500 font-bold text-sm md:text-base mt-0.5">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="text-sm md:text-base font-semibold text-gray-900">
                        시안 수정은 총 <span className="text-red-600">2회</span>
                        까지만 제공됩니다
                      </p>
                      <p className="text-[11px] md:text-xs text-gray-600 mt-0.5">
                        2차 수정안 수신 후 확정 처리되며, 이후 변경은 불가합니다
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border-l-4 border-red-500 flex items-start gap-3">
                    <span className="text-red-500 font-bold text-sm md:text-base mt-0.5">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="text-sm md:text-base font-semibold text-gray-900">
                        2회 수정 이후 추가 수정 시{" "}
                        <span className="text-red-600">건당 22,000원</span> (VAT
                        포함)
                      </p>
                      <p className="text-[11px] md:text-xs text-gray-600 mt-0.5">
                        추가 수정 요청 시 별도 결제 후 진행됩니다
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border-l-4 border-red-500 flex items-start gap-3">
                    <span className="text-red-500 font-bold text-sm md:text-base mt-0.5">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="text-sm md:text-base font-semibold text-gray-900">
                        2회 수정 후에도 만족하지 못하시면{" "}
                        <span className="text-red-600">
                          외부 제작 후 파일 전달
                        </span>
                        로 안내드립니다
                      </p>
                      <p className="text-[11px] md:text-xs text-gray-600 mt-0.5">
                        추천 AI 로고 생성 사이트에서 직접 제작 후 파일로
                        전달해주세요
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 불가 / 가능 요청 대비 */}
              <div className="grid md:grid-cols-2 gap-2.5 md:gap-3">
                {/* 불가 */}
                <div className="bg-white border-2 border-red-200 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-red-100">
                    <span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs md:text-sm font-bold">
                      ✕
                    </span>
                    <h4 className="text-sm md:text-base font-bold text-red-700">
                      이런 요청은 불가합니다
                    </h4>
                  </div>
                  <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          여러 개의 시안 동시 요청
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          &quot;3~4개 시안 보여주세요&quot; 등
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          구체성 없는 추상적 요청
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          &quot;예쁘게, 고급스럽게, 깔끔하게&quot; 등
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          요청대로 제작했으나 재요청
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          요청사항과 다른 방향으로 변경 요구
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* 가능 */}
                <div className="bg-white border-2 border-green-200 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-green-100">
                    <span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs md:text-sm font-bold">
                      ✓
                    </span>
                    <h4 className="text-sm md:text-base font-bold text-green-700">
                      이렇게 요청해주세요
                    </h4>
                  </div>
                  <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          구체적 시안 전달
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          원하는 로고 이미지 직접 전달 → 디자인화
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          요청사항 + 참고자료
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          구체적 요청 + 레퍼런스 이미지 포함
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          세부 조건 명시
                        </p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          유형 / 색상 / 폰트 / 분위기 구체 작성
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 요청 방법 (요약) */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📋 로고 제작 요청 방법
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-green-700 mb-1.5 md:mb-2">
                      방법 1: 이미지로 전달
                    </h4>
                    <p className="text-xs md:text-sm text-gray-700">
                      로고 이미지를 전달하시면 바로 제작 진행됩니다
                    </p>
                  </div>
                  <div className="p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-navy-700 mb-1.5 md:mb-2">
                      방법 2: 텍스트 설명으로 요청
                    </h4>
                    <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3">
                      아래 내용을 포함하여 요청해주세요:
                    </p>
                    <div className="grid gap-1.5 md:gap-2 text-xs md:text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[80px] md:min-w-[100px]">
                          로고 유형:
                        </span>
                        <span className="text-gray-600">
                          워드마크 / 심볼마크 / 엠블럼 / 이니셜형
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[80px] md:min-w-[100px]">
                          선호 스타일:
                        </span>
                        <span className="text-gray-600">
                          심플 / 모던 / 클래식 / 빈티지 / 고급스러운
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[80px] md:min-w-[100px]">
                          선호 색상:
                        </span>
                        <span className="text-gray-600">
                          선호 색상 / 피하고 싶은 색상
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[80px] md:min-w-[100px]">
                          선호 폰트:
                        </span>
                        <span className="text-gray-600">
                          손글씨체 / 명조체 / 고딕체
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 로고 없이 진행 안내 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  ℹ️ 로고 없이도 인쇄물 및 홈페이지 제작은 정상 진행됩니다.
                </p>
              </div>

              {/* 추천 사이트 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  🌐 로고 생성 추천 사이트
                </h3>
                <div className="space-y-1.5 md:space-y-2">
                  <a
                    href="https://logo.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gold-50 hover:border-gold-300 transition-all"
                  >
                    <span className="text-xs md:text-sm text-gold-600 font-medium">
                      logo.com
                    </span>
                    <span className="text-gray-500 ml-2">→</span>
                  </a>
                  <a
                    href="https://www.design.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gold-50 hover:border-gold-300 transition-all"
                  >
                    <span className="text-xs md:text-sm text-gold-600 font-medium">
                      design.com
                    </span>
                    <span className="text-gray-500 ml-2">→</span>
                  </a>
                  <a
                    href="https://www.logoai.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gold-50 hover:border-gold-300 transition-all"
                  >
                    <span className="text-xs md:text-sm text-gold-600 font-medium">
                      logoai.com
                    </span>
                    <span className="text-gray-500 ml-2">→</span>
                  </a>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  💡 <strong>Tip:</strong> AI 로고 생성 사이트를 활용하면 빠르고
                  저렴하게 다양한 로고 옵션을 확인할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 활용 팁 */}
        <TabsContent value="ai-tips">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                AI 활용 무료 팁
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Google AI Studio로 무료로 강력한 AI 기능 사용하기
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-4">
                <h3 className="text-purple-700 font-bold text-base md:text-lg mb-2 md:mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                  Google AI Studio 무료 사용법
                </h3>
                <p className="text-xs md:text-sm text-gray-700 mb-3 md:mb-4">
                  AI 기능을 구독하지 않아도 Google AI Studio에서 강력한 AI를
                  무료로 사용할 수 있습니다!
                </p>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  ✨ 주요 특징
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-navy-900 rounded-full flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-xs md:text-sm">
                        1
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-navy-900 mb-0.5 md:mb-1">
                        무료 사용량
                      </h4>
                      <p className="text-xs md:text-sm text-gray-700">
                        백만 토큰까지 무료 사용 가능
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-green-600 rounded-full flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-xs md:text-sm">
                        2
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-green-900 mb-0.5 md:mb-1">
                        최신 모델
                      </h4>
                      <p className="text-xs md:text-sm text-gray-700">
                        Google Gemini 2.5 Pro 지원 (유료와 동일한 성능)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-orange-600 rounded-full flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-xs md:text-sm">
                        3
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-orange-900 mb-0.5 md:mb-1">
                        결제 없음
                      </h4>
                      <p className="text-xs md:text-sm text-gray-700">
                        카드 연동은 필요하지만 실제 결제는 되지 않습니다
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📚 상세 가이드
                </h3>
                <a
                  href="https://blog.naver.com/ryurime88/223859489656?trackingCode=rss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 md:p-4 bg-white border border-gray-200 rounded-xl hover:border-gold-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-navy-900 rounded-xl shadow-md">
                        <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-semibold text-gray-900 mb-0.5 md:mb-1">
                          Google AI Studio 사용법 가이드
                        </p>
                        <p className="text-xs md:text-sm text-gray-600">
                          네이버 블로그에서 자세한 설명 확인하기
                        </p>
                      </div>
                    </div>
                    <span className="text-gold-600 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </a>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 마케팅 콘텐츠 작성, 광고 문구 생성,
                  고객 응대 등 다양한 업무에 AI를 활용하여 효율을 높일 수
                  있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 인쇄물 발주 가이드 */}
        <TabsContent value="design">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 md:w-5 md:h-5" />
                인쇄물 발주 안내
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                인쇄물 시안 검토 및 발주 시 주의사항
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
              {/* 인쇄물 디자인 제한 안내 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <h3 className="text-sm md:text-base text-navy-900 font-bold mb-2 md:mb-3 flex items-center gap-2">
                  📋 인쇄물 디자인 안내
                </h3>
                <div className="space-y-1.5 md:space-y-2 text-gray-700 text-xs md:text-sm">
                  <p className="text-navy-800 font-medium">
                    인쇄물 디자인은{" "}
                    <strong>기본 디자인에서 일부 변경만 가능</strong>합니다.
                  </p>
                  <ul className="space-y-1 md:space-y-1.5 text-navy-700">
                    <li>• 신규 디자인 제작 불가</li>
                    <li>• 지정된 레이아웃 변형 불가</li>
                  </ul>
                  <p className="text-gold-600 text-[10px] md:text-xs pl-2 pt-0.5 md:pt-1">
                    예) 대봉투 디자인 다른 도안으로 변경, 자문계약서 표지 문양
                    교체 또는 이미지 삽입 등
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                <h3 className="text-sm md:text-base text-red-600 font-bold mb-2 md:mb-3 flex items-center gap-2">
                  ⚠️ 필독! 발주 전 주의사항
                </h3>
                <ul className="space-y-1.5 md:space-y-2 text-gray-700 text-xs md:text-sm">
                  <li>
                    • 시안 검토 후{" "}
                    <strong className="text-orange-600">
                      반드시 본인이 직접 발주 요청
                    </strong>
                  </li>
                  <li>
                    •{" "}
                    <strong className="text-orange-600">
                      발주 후 정보 변경 불가
                    </strong>
                  </li>
                  <li>
                    •{" "}
                    <strong className="text-orange-600">
                      오탈자 발견 시 재발주 비용 본인 부담
                    </strong>
                  </li>
                  <li>• 개인 정보 반드시 확인!</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  ⏱️ 제작 기간 (발주 확정 후)
                </h3>
                <div className="grid gap-2 md:gap-3 grid-cols-2">
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium text-gray-900">
                      명찰
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">3~4일</p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium text-gray-900">
                      명함
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">2~3일</p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium text-gray-900">
                      대봉투
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">4~5일</p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm md:text-base font-medium text-gray-900">
                      자문계약서
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">7일</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  📦 제작 사양
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      명함
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      아르미 울트라화이트 310g / 기본 200매 포함
                    </p>
                    <p className="text-[10px] md:text-xs text-orange-600 mt-0.5 md:mt-1">
                      추가 제작: 22,000원 (VAT 포함)
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      대봉투
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      모조지 150g / 500매 포함
                    </p>
                    <p className="text-[10px] md:text-xs text-orange-600 mt-0.5 md:mt-1">
                      추가 제작: 220,000원 (VAT 포함)
                    </p>
                  </div>
                  <div className="p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-0.5 md:mb-1">
                      자문계약서
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600">
                      A3 모조지 180g / 500매 포함
                    </p>
                    <p className="text-[10px] md:text-xs text-orange-600 mt-0.5 md:mt-1">
                      추가 제작: 330,000원 (VAT 포함)
                    </p>
                  </div>
                </div>
              </div>

              {/* 인쇄물 예시 이미지 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-2 md:mb-3">
                  🖼️ 인쇄물 예시
                </h3>

                {/* 명함 */}
                <div className="mb-4 md:mb-6">
                  <h4 className="text-sm md:text-base font-medium text-gray-900 mb-2 md:mb-3">
                    명함
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-2 md:mb-3">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <div
                        key={num}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <Image
                          src={`/guides/print/namecard_${num}.jpg`}
                          alt={`명함 예시 ${num}`}
                          width={300}
                          height={200}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-w-md">
                    <p className="text-[10px] md:text-xs text-gray-500 mb-1.5 md:mb-2 px-2 md:px-3 pt-2 md:pt-3">
                      실제 제작 사례
                    </p>
                    <Image
                      src="/guides/print/namecard_sample.jpg"
                      alt="명함 실제 제작 사례"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                {/* 자문계약서 */}
                <div className="mb-4 md:mb-6">
                  <h4 className="text-sm md:text-base font-medium text-gray-900 mb-2 md:mb-3">
                    자문계약서
                  </h4>
                  <div className="space-y-3">
                    {/* 스타일 1 */}
                    <div>
                      <p className="text-[10px] md:text-xs font-medium text-gray-700 mb-1">
                        스타일 1
                      </p>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1 px-2 md:px-3 pt-2 md:pt-3">
                            표지
                          </p>
                          <Image
                            src="/guides/print/contract_cover.jpg"
                            alt="자문계약서 스타일1 표지"
                            width={400}
                            height={600}
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1 px-2 md:px-3 pt-2 md:pt-3">
                            내지
                          </p>
                          <Image
                            src="/guides/print/contract_inner.jpg"
                            alt="자문계약서 스타일1 내지"
                            width={400}
                            height={600}
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    </div>
                    {/* 스타일 2 */}
                    <div>
                      <p className="text-[10px] md:text-xs font-medium text-gray-700 mb-1">
                        스타일 2
                      </p>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1 px-2 md:px-3 pt-2 md:pt-3">
                            표지
                          </p>
                          <Image
                            src="/guides/print/contract_cover_2.jpg"
                            alt="자문계약서 스타일2 표지"
                            width={400}
                            height={600}
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1 px-2 md:px-3 pt-2 md:pt-3">
                            내지
                          </p>
                          <Image
                            src="/guides/print/contract_inner_2.jpg"
                            alt="자문계약서 스타일2 내지"
                            width={400}
                            height={600}
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 대봉투 & 명찰 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-2 md:mb-3">
                      대봉투
                    </h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Image
                        src="/guides/print/envelope.jpg"
                        alt="대봉투"
                        width={600}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm md:text-base font-medium text-gray-900 mb-2 md:mb-3">
                      명찰
                    </h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Image
                        src="/guides/print/badge.jpg"
                        alt="명찰"
                        width={600}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 영상제작 가이드 */}
        <TabsContent value="video">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-lg md:text-xl text-gray-900 flex items-center gap-2">
                <Video className="w-4 h-4 md:w-5 md:h-5" />
                정책자금 광고 영상 제작 가이드
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                승인율 높이고, 전환 극대화하는 영상 제작 전략
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-3 md:p-4 pt-0 md:pt-0">
              {/* 핵심 요약 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  핵심 요약
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-gold-200 rounded-lg">
                        <Clock className="w-4 h-4 text-navy-700" />
                      </div>
                      <span className="text-xs font-semibold text-gold-600">
                        필수
                      </span>
                    </div>
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                      영상 길이
                    </h4>
                    <p className="text-lg md:text-xl font-bold text-navy-800">
                      35초~2분
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      최적: 45초 ~ 90초
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-orange-200 rounded-lg">
                        <Target className="w-4 h-4 text-orange-700" />
                      </div>
                      <span className="text-xs font-semibold text-orange-600">
                        핵심
                      </span>
                    </div>
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                      후킹 구간
                    </h4>
                    <p className="text-lg md:text-xl font-bold text-orange-800">
                      첫 6~10초
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      80%가 이 구간에서 이탈 결정
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-200 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-green-700" />
                      </div>
                      <span className="text-xs font-semibold text-green-600">
                        승인
                      </span>
                    </div>
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                      승인 핵심
                    </h4>
                    <p className="text-lg md:text-xl font-bold text-green-800">
                      팩트 기반
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      허위·과장 표현 절대 금지
                    </p>
                  </div>
                </div>
              </div>

              {/* 콘텐츠 전략 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  콘텐츠 전략 (승인율)
                </h3>

                {/* 승인 OK */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    <h4 className="text-sm md:text-base font-semibold text-green-800">
                      승인 OK (팩트 기반)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/80 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">
                        금액 안내
                      </h5>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;26년 정책자금 예산 <strong>60조 원</strong>{" "}
                            편성&quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;운전자금·시설자금 <strong>최소 1억 원</strong>{" "}
                            지원&quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;자영업자 대상 정책자금{" "}
                            <strong>최대 1억 원</strong>&quot;
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">
                        상담 유도
                      </h5>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;내 사업에 맞는 정책자금{" "}
                            <strong>무료 상담</strong>&quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;26년도 바뀐 정책, <strong>지금 확인</strong>
                            하세요&quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;자격요건 <strong>1분 진단</strong>{" "}
                            받아보세요&quot;
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 승인 NO */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                    <h4 className="text-sm md:text-base font-semibold text-red-800">
                      승인 NO (허위·과장)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/80 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-red-700 mb-2">
                        절대 사용 금지
                      </h5>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;정책자금 <strong>바로 받아야 한다</strong>
                            &quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;<strong>무조건</strong> 1억 지원&quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;신청만 하면 <strong>100% 승인</strong>&quot;
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>
                            &quot;<strong>누구나</strong> 받을 수 있다&quot;
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-red-700 mb-2">
                        피해야 할 패턴
                      </h5>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>확정적 수령 보장 표현</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>근거 없는 금액 명시</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>자격요건 무시한 일반화</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-red-700">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>허위 마감/긴급성 조장</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 승인 공식 */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-gold-600" />
                    <h4 className="text-sm md:text-base font-semibold text-navy-800">
                      승인 통과 공식
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-4">
                    <span className="px-3 py-1.5 bg-navy-900 text-white text-xs md:text-sm font-medium rounded-full">
                      정부 정책 팩트
                    </span>
                    <span className="text-gray-400">+</span>
                    <span className="px-3 py-1.5 bg-gold-500 text-white text-xs md:text-sm font-medium rounded-full">
                      금액 범위 안내
                    </span>
                    <span className="text-gray-400">+</span>
                    <span className="px-3 py-1.5 bg-gold-400 text-white text-xs md:text-sm font-medium rounded-full">
                      상담 유도 CTA
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">예시 스크립트</p>
                    <p className="text-xs md:text-sm text-gray-800 italic leading-relaxed">
                      &quot;26년 정부 정책자금 예산 60조 원 편성! 자영업자
                      운전자금·시설자금 최대 1억 원까지 지원 가능합니다. 내
                      사업에 맞는 정책자금, 지금 무료 상담 받아보세요.&quot;
                    </p>
                  </div>
                </div>
              </div>

              {/* 영상 구조 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <Clapperboard className="w-4 h-4" />
                  영상 구조 (45초 기준)
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* 타임라인 바 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-4 h-4 text-gray-600" />
                      <span className="text-xs md:text-sm font-medium text-gray-700">
                        타임라인 구조
                      </span>
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="flex h-full">
                        <div className="bg-navy-800 w-[22%]"></div>
                        <div className="bg-navy-900 w-[44%]"></div>
                        <div className="bg-gold-400 w-[34%]"></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                      <span>0초</span>
                      <span>10초</span>
                      <span>30초</span>
                      <span>45초</span>
                    </div>
                  </div>

                  {/* 구간 설명 */}
                  <div className="grid grid-cols-3 gap-2 p-4 pt-0">
                    <div className="text-center bg-gold-50 rounded-lg p-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-navy-800 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                        1
                      </div>
                      <p className="text-xs md:text-sm font-semibold text-gray-900">
                        0~10초
                      </p>
                      <p className="text-[10px] md:text-xs text-gold-600 font-medium">
                        후킹
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 hidden md:block">
                        시선 고정 필수
                      </p>
                    </div>
                    <div className="text-center bg-gold-50 rounded-lg p-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-navy-900 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                        2
                      </div>
                      <p className="text-xs md:text-sm font-semibold text-gray-900">
                        10~30초
                      </p>
                      <p className="text-[10px] md:text-xs text-gold-600 font-medium">
                        본문
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 hidden md:block">
                        팩트 기반 설명
                      </p>
                    </div>
                    <div className="text-center bg-gold-50 rounded-lg p-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-gold-400 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                        3
                      </div>
                      <p className="text-xs md:text-sm font-semibold text-gray-900">
                        30~45초
                      </p>
                      <p className="text-[10px] md:text-xs text-gold-600 font-medium">
                        CTA
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 hidden md:block">
                        상담 신청 안내
                      </p>
                    </div>
                  </div>

                  {/* 후킹 예시 */}
                  <div className="bg-gray-50 p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Crosshair className="w-4 h-4 text-gray-600" />
                      <span className="text-xs md:text-sm font-medium text-gray-700">
                        후킹 문구 예시
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-start gap-2 bg-white rounded-lg p-2.5">
                        <span className="px-2 py-0.5 bg-gold-100 text-navy-700 text-[10px] md:text-xs font-medium rounded">
                          질문형
                        </span>
                        <p className="text-xs md:text-sm text-gray-700">
                          &quot;사업하시는데 정책자금 아직도 안
                          받으셨어요?&quot;
                        </p>
                      </div>
                      <div className="flex items-start gap-2 bg-white rounded-lg p-2.5">
                        <span className="px-2 py-0.5 bg-gold-100 text-navy-700 text-[10px] md:text-xs font-medium rounded">
                          숫자형
                        </span>
                        <p className="text-xs md:text-sm text-gray-700">
                          &quot;26년 정책자금 예산 60조! 지금이 기회입니다&quot;
                        </p>
                      </div>
                      <div className="flex items-start gap-2 bg-white rounded-lg p-2.5">
                        <span className="px-2 py-0.5 bg-gold-100 text-navy-700 text-[10px] md:text-xs font-medium rounded">
                          문제제기
                        </span>
                        <p className="text-xs md:text-sm text-gray-700">
                          &quot;운전자금 부족으로 힘드셨죠?&quot;
                        </p>
                      </div>
                      <div className="flex items-start gap-2 bg-white rounded-lg p-2.5">
                        <span className="px-2 py-0.5 bg-gold-100 text-navy-700 text-[10px] md:text-xs font-medium rounded">
                          정보형
                        </span>
                        <p className="text-xs md:text-sm text-gray-700">
                          &quot;26년도 바뀐 정책자금 조건, 알고 계세요?&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 플랫폼별 스펙 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  플랫폼별 영상 스펙
                </h3>
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px] md:min-w-0">
                    <table className="w-full">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                            플랫폼
                          </th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                            비율
                          </th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                            해상도
                          </th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                            최적 길이
                          </th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                            참여율
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium">
                            YouTube Shorts
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            9:16
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono">
                            1080×1920
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            31~60초
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              5.91%
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium">
                            Instagram Reels
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            9:16
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono">
                            1080×1920
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            6~15초
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              1.23%
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium">
                            TikTok
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            9:16
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono">
                            1080×1920
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            6~15초
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              2.65%
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium">
                            Facebook Reels
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            9:16
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono">
                            1080×1920
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            15~30초
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              0.15%
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 mt-3">
                  <p className="text-xs md:text-sm text-gray-700">
                    💡 <strong>팁:</strong> YouTube Shorts가 가장 높은
                    참여율(5.91%)을 보이며, 하루 2000억 뷰를 기록합니다.
                  </p>
                </div>
              </div>

              {/* 데드존 가이드 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  데드존 가이드
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    ⚠️ <strong>중요:</strong> 데드존은 플랫폼 UI 요소(프로필,
                    좋아요, 설명 등)가 겹쳐지는 영역입니다.{" "}
                    <strong>
                      이 영역에 중요한 텍스트나 CTA를 배치하면 가려집니다!
                    </strong>
                  </p>
                </div>

                {/* 데드존 시각화 */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Ruler className="w-4 h-4 text-gray-600" />
                    <span className="text-xs md:text-sm font-medium text-gray-700">
                      플랫폼별 데드존 영역 (1080×1920 기준)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:gap-6">
                    {/* YouTube Shorts */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        YouTube Shorts
                      </p>
                      <div
                        className="relative mx-auto bg-gray-100 rounded-lg overflow-hidden"
                        style={{ width: "60px", aspectRatio: "9/16" }}
                      >
                        <div
                          className="absolute top-0 left-0 right-0 bg-red-500 flex items-center justify-center"
                          style={{ height: "12%" }}
                        >
                          <span className="text-white text-[8px] font-bold">
                            150px
                          </span>
                        </div>
                        <div
                          className="absolute left-0 right-0 bg-green-200 border border-green-400 border-dashed"
                          style={{ top: "12%", bottom: "16%" }}
                        ></div>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-red-500 flex items-center justify-center"
                          style={{ height: "16%" }}
                        >
                          <span className="text-white text-[8px] font-bold">
                            200px
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Instagram Reels */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        Instagram Reels
                      </p>
                      <div
                        className="relative mx-auto bg-gray-100 rounded-lg overflow-hidden"
                        style={{ width: "60px", aspectRatio: "9/16" }}
                      >
                        <div
                          className="absolute top-0 left-0 right-0 bg-red-500 flex items-center justify-center"
                          style={{ height: "10%" }}
                        >
                          <span className="text-white text-[8px] font-bold">
                            120px
                          </span>
                        </div>
                        <div
                          className="absolute left-0 right-0 bg-green-200 border border-green-400 border-dashed"
                          style={{ top: "10%", bottom: "22%" }}
                        ></div>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-red-500 flex items-center justify-center"
                          style={{ height: "22%" }}
                        >
                          <span className="text-white text-[8px] font-bold">
                            280px
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TikTok */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        TikTok
                      </p>
                      <div
                        className="relative mx-auto bg-gray-100 rounded-lg overflow-hidden"
                        style={{ width: "60px", aspectRatio: "9/16" }}
                      >
                        <div
                          className="absolute top-0 left-0 right-0 bg-red-500 flex items-center justify-center"
                          style={{ height: "12%" }}
                        >
                          <span className="text-white text-[8px] font-bold">
                            150px
                          </span>
                        </div>
                        <div
                          className="absolute left-0 bg-green-200 border border-green-400 border-dashed"
                          style={{ top: "12%", bottom: "22%", right: "15%" }}
                        ></div>
                        <div
                          className="absolute right-0 bg-orange-500"
                          style={{ top: "30%", bottom: "30%", width: "15%" }}
                        ></div>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-red-500 flex items-center justify-center"
                          style={{ height: "22%" }}
                        >
                          <span className="text-white text-[8px] font-bold">
                            270px
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 범례 */}
                  <div className="flex flex-wrap justify-center gap-3 mt-4 text-[10px] md:text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-gray-600">위험 (UI 겹침)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-gray-600">주의 (우측)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
                      <span className="text-gray-600">안전 영역</span>
                    </div>
                  </div>
                </div>

                {/* 안전 배치 팁 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <h4 className="text-xs md:text-sm font-semibold text-green-800">
                        안전한 배치
                      </h4>
                    </div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>핵심 텍스트/자막 → 화면 중앙~중상단</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>CTA 버튼 → 중앙 하단 (데드존 위)</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>중요 정보 → 화면 높이의 20%~70%</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <h4 className="text-xs md:text-sm font-semibold text-red-800">
                        피해야 할 배치
                      </h4>
                    </div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      <li className="flex items-start gap-1.5">
                        <X className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>최상단 자막 → 플랫폼 로고에 가려짐</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <X className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>최하단 CTA → 좋아요 버튼에 가려짐</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <X className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>TikTok 우측 정보 → 액션 버튼에 가려짐</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 mt-3">
                  <p className="text-xs md:text-sm text-gray-700">
                    💡 <strong>크로스 플랫폼 팁:</strong> 모든 플랫폼에서
                    안전하게 보이려면 <strong>화면 중앙 1340×880px 영역</strong>
                    에 핵심 콘텐츠를 배치하세요.
                  </p>
                </div>
              </div>

              {/* 베스트 프랙티스 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  베스트 프랙티스 (Google 권장)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {/* DO */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                      <h4 className="text-sm md:text-base font-semibold text-gray-900">
                        DO (권장)
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            첫 3초에 강력한 후킹
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            알고리즘에 가장 중요
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            자막 필수 추가
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            81%가 무음으로 시청
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            세로 화면(9:16) 최적화
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            81%가 세로로 시청
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            실제 사람 등장
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            53%가 더 관심
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            하나의 명확한 메시지
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            30초 안에 1개만
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* DON'T */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                      <h4 className="text-sm md:text-base font-semibold text-gray-900">
                        DON&apos;T (금지)
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 bg-red-50/50 rounded-lg p-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            가로 영상 그대로 사용
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            처음부터 세로 촬영
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-red-50/50 rounded-lg p-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            느린 인트로
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            6초 안에 후킹 필수
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-red-50/50 rounded-lg p-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            정보 과부하
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            여러 메시지 = 기억 안 남음
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-red-50/50 rounded-lg p-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            플랫폼 무시 리포스팅
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            각 플랫폼에 맞게 최적화
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 bg-red-50/50 rounded-lg p-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">
                            CTA 없이 끝내기
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            명확한 행동 유도 필수
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 체크리스트 */}
              <div>
                <h3 className="text-sm md:text-base text-gold-600 font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  영상 제작 체크리스트
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* 기획 단계 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clapperboard className="w-4 h-4 text-gray-600" />
                        <span className="text-xs md:text-sm font-semibold text-gray-800">
                          기획 단계
                        </span>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>영상 길이 35초~2분 이내 설정</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>후킹 문구 6~10초 내 배치</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>팩트 기반 콘텐츠 (금액, 정책)</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>허위/과장 표현 제거</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>CTA(상담 유도) 명확히 설정</span>
                        </li>
                      </ul>
                    </div>

                    {/* 제작 단계 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Video className="w-4 h-4 text-gray-600" />
                        <span className="text-xs md:text-sm font-semibold text-gray-800">
                          제작 단계
                        </span>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>세로 촬영 (9:16 비율)</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>1080×1920 해상도</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>자막 추가 (무음 시청 대응)</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>핵심 요소 화면 중앙 배치</span>
                        </li>
                        <li className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                          <div className="w-4 h-4 border border-gray-300 rounded"></div>
                          <span>썸네일 최적화</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 상세 가이드 링크 */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  <span className="text-xs md:text-sm font-semibold text-gray-800">
                    상세 가이드
                  </span>
                </div>
                <a
                  href="/docs/policy-fund-video-guide.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gold-50 hover:border-gold-300 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                      <Video className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-900">
                        정책자금 광고 영상 제작 가이드 (전체)
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500">
                        더 자세한 내용과 예시 확인하기
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gold-600 transition-colors" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
