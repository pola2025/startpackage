import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Film,
  Gift,
  Images,
  Megaphone,
  Mic,
  MessageSquare,
  Package,
  ShieldCheck,
  Sparkles,
  StopCircle,
} from "lucide-react";
import {
  CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE,
  ONLINE_MARKETING_BILLING_MONTHS,
  ONLINE_MARKETING_MONTHLY_PRICE,
  ONLINE_MARKETING_TOTAL_PRICE,
  formatManwon,
} from "@/lib/marketing-pricing";

const baseServices = [
  "Meta 광고 계정 세팅 및 운영",
  "광고 소재 업로드, 교체 요청 반영",
  "타겟, 예산, 집행 상태 점검",
  "홈페이지 문의 접수와 광고 유입 흐름 확인",
  "광고 성과 및 운영 이슈 안내",
];

const contentDeliverables = [
  { icon: FileText, label: "네이버 블로그" },
  { icon: Images, label: "인스타그램 게시글" },
  { icon: Film, label: "인스타그램 릴스" },
];

const MONTHLY_CONTENT_COUNT = contentDeliverables.length * 30;

const notes = [
  "Meta 광고비는 상품 비용과 별도이며 대표님 계정에서 직접 결제됩니다.",
  "광고 소재와 기본 방향은 대표님 확인을 기준으로 운영합니다.",
  "네이버 블로그 발행은 2단계 인증이 꺼져 있어야 진행할 수 있습니다.",
  "콘텐츠 대행 종료 시 콘텐츠 배포가 함께 종료됩니다.",
];

export default function OnlineMarketingPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-gold-600 md:h-6 md:w-6" />
            <Badge className="bg-navy-900 text-white">유료 상품</Badge>
          </div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            온라인마케팅
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            BAS 수강생을 위한 광고운영대행과 콘텐츠 대행 안내입니다.
          </p>
        </div>

        <Button asChild className="bg-navy-900 hover:bg-navy-800">
          <Link href="/dashboard/communication">
            <MessageSquare className="h-4 w-4" />
            상담 문의하기
          </Link>
        </Button>
      </div>

      {/* 수강생 혜택 배너 */}
      <Card className="border-gold-200 bg-gold-50 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-700">
            <Sparkles className="h-4 w-4" />
            BAS 수강생 전용가
          </div>
          <h2 className="text-lg font-bold text-navy-900 md:text-2xl">
            광고운영대행을 수강생 특별가로 제공합니다
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            BAS 수강생은 광고운영대행을 월{" "}
            {formatManwon(ONLINE_MARKETING_MONTHLY_PRICE)}으로 이용하실 수
            있습니다. 콘텐츠 대행은 월{" "}
            {formatManwon(CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE)}으로 함께
            진행할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* 상품 구성 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Package className="h-5 w-5 text-gold-600" />
          <h3 className="text-base font-bold text-gray-900 md:text-lg">
            상품 구성
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 상품 A: 광고운영대행 */}
          <Card className="flex flex-col border-2 border-navy-900 shadow-sm">
            <CardHeader className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 md:text-lg">
                  <Badge className="bg-navy-900 text-white">광고</Badge>
                  광고운영대행
                </CardTitle>
                <Badge className="border border-gold-200 bg-gold-50 text-gold-700">
                  수강생가
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-4 pt-0 md:p-5 md:pt-0">
              <p className="text-xs leading-relaxed text-gray-600">
                대표님 광고 계정에 캠페인을 세팅하고 소재·메시지·접수 흐름을
                운영합니다.
              </p>

              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-500">월</span>
                  <span className="text-3xl font-bold text-navy-900">
                    {formatManwon(ONLINE_MARKETING_MONTHLY_PRICE)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  VAT 포함 · {ONLINE_MARKETING_BILLING_MONTHS}개월 단위 결제
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {ONLINE_MARKETING_BILLING_MONTHS}개월 총액{" "}
                  {formatManwon(ONLINE_MARKETING_TOTAL_PRICE)}
                </p>
              </div>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-700">
                {baseServices.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  매체 광고비는 대행료와 별도이며, 대표님 광고 계정에서 직접
                  결제됩니다.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 상품 B: 콘텐츠 대행 */}
          <Card className="flex flex-col border-2 border-green-500 shadow-sm">
            <CardHeader className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 md:text-lg">
                  <Badge className="bg-green-600 text-white">콘텐츠</Badge>
                  콘텐츠 대행
                </CardTitle>
                <Badge className="border border-green-200 bg-green-50 text-green-700">
                  매일 발행
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-4 pt-0 md:p-5 md:pt-0">
              <p className="text-xs leading-relaxed text-gray-600">
                블로그·카드뉴스·숏폼을 매일 제작·배포해 검색·SNS·상담 전 신뢰를
                쌓습니다.
              </p>

              <div className="mt-3 rounded-lg bg-green-50 p-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-500">월</span>
                  <span className="text-3xl font-bold text-navy-900">
                    {formatManwon(CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  VAT 포함 · 1개월 단위 연장
                </p>
                <p className="mt-0.5 text-xs font-semibold text-green-700">
                  월 기준 +{MONTHLY_CONTENT_COUNT}개 발행
                </p>
              </div>

              <div className="mt-4 flex-1">
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  매일 발행 콘텐츠 (하루 {contentDeliverables.length}종)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {contentDeliverables.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-800"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-green-600" />
                      <div className="flex flex-col leading-tight">
                        <span>{label}</span>
                        <span className="text-[11px] text-gray-500">
                          1개 / 일
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-green-300 bg-green-50 p-2.5 text-sm font-medium text-green-800">
                  <Sparkles className="h-4 w-4" />
                  기업마당 연동 리라이팅 세팅
                </div>

                <div className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-green-300 bg-green-50 p-2.5 text-xs leading-relaxed text-green-900">
                  <Mic className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    <b className="font-semibold">대표님 목소리 적용 가능</b>
                    <br />
                    릴스 내레이션에 대표님 목소리를 쓰고 싶으시면 한 번 녹취해
                    주세요. 이후 콘텐츠에 그 목소리로 생성해 적용합니다.
                  </span>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="mt-3 w-full border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Link href="/dashboard/content-samples">
                    콘텐츠 제작사례 보기
                  </Link>
                </Button>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">
                <StopCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>콘텐츠 대행 종료 시 콘텐츠 배포가 함께 종료됩니다.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 홈페이지 제작 전 시작 혜택 */}
      <Card className="border-gold-200 bg-gradient-to-r from-gold-50 to-green-50 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gold-200 bg-white text-gold-600">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-navy-900">
                  홈페이지 제작 전 시작 혜택
                </h3>
                <Badge className="bg-green-600 text-white">
                  콘텐츠 대행 1개월 무료
                </Badge>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                홈페이지 제작 전에 광고운영대행을 시작하시면, 콘텐츠 대행 첫
                1개월을 무료로 제공합니다. 무료 기간 이후에는 월{" "}
                {formatManwon(CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE)}으로
                동일하게 이용하실 수 있습니다.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                ※ 콘텐츠 대행 1개월 무료 혜택은 홈페이지 제작 전에만 제공됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50">
        <ShieldCheck className="h-4 w-4 text-blue-700" />
        <AlertTitle className="text-blue-900">운영 전 확인사항</AlertTitle>
        <AlertDescription className="mt-2 text-sm text-blue-900">
          <ul className="space-y-1">
            {notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
