import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Gift,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE,
  ONLINE_MARKETING_BILLING_MONTHS,
  ONLINE_MARKETING_MONTHLY_PRICE,
  ONLINE_MARKETING_TOTAL_PRICE,
  formatManwon,
  formatWon,
} from "@/lib/marketing-pricing";

const baseServices = [
  "Meta 광고 계정 세팅 및 운영",
  "광고 소재 업로드, 교체 요청 반영",
  "타겟, 예산, 집행 상태 점검",
  "홈페이지 문의 접수와 광고 유입 흐름 확인",
  "광고 성과 및 운영 이슈 안내",
];

const automationItems = [
  "기업마당 동기화",
  "홈페이지 게시글 매일 작성",
  "네이버 블로그 매일 작성",
  "인스타그램 게시글 매일 작성",
  "릴스 매일 작성",
];

const notes = [
  "Meta 광고비는 상품 비용과 별도이며 대표님 계정에서 직접 결제됩니다.",
  "광고 소재와 기본 방향은 대표님 확인을 기준으로 운영합니다.",
  "네이버 블로그 자동화는 2단계 인증이 꺼져 있어야 진행할 수 있습니다.",
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
            BAS 수강생을 위한 Meta 광고 운영과 콘텐츠 자동화 안내입니다.
          </p>
        </div>

        <Button asChild className="bg-navy-900 hover:bg-navy-800">
          <Link href="/dashboard/communication">
            <MessageSquare className="h-4 w-4" />
            상담 문의하기
          </Link>
        </Button>
      </div>

      <Card className="border-gold-200 bg-gold-50 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-700">
                <Sparkles className="h-4 w-4" />
                BAS 수강생 이용 혜택
              </div>
              <h2 className="text-lg font-bold text-navy-900 md:text-2xl">
                운영형 온라인마케팅 월{" "}
                {formatWon(ONLINE_MARKETING_MONTHLY_PRICE)}원
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                기존 운영형 상품의 핵심 구성은 유지하고, BAS 수강생 전용
                혜택으로 1개월 콘텐츠 자동화를 함께 제공합니다.
              </p>
            </div>

            <div className="rounded-lg border border-gold-200 bg-white p-4">
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-gray-500">월</span>
                <span className="text-3xl font-bold text-navy-900">
                  {formatManwon(ONLINE_MARKETING_MONTHLY_PRICE)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">VAT 포함</p>
              <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gold-600" />
                  {ONLINE_MARKETING_BILLING_MONTHS}개월 단위 결제
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {ONLINE_MARKETING_BILLING_MONTHS}개월 총액{" "}
                  {formatWon(ONLINE_MARKETING_TOTAL_PRICE)}원
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 md:text-lg">
              <BarChart3 className="h-5 w-5 text-gold-600" />
              기본 운영 항목
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <ul className="space-y-2 text-sm text-gray-700">
              {baseServices.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 md:text-lg">
              <Gift className="h-5 w-5 text-gold-600" />
              1개월 제공 혜택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
                <Bot className="h-4 w-4" />
                콘텐츠 자동화 1개월 제공
              </div>
              <p className="mt-1 text-xs leading-relaxed text-green-700">
                1개월 이후에는 유료옵션으로 전환되며 월{" "}
                {formatWon(CONTENT_AUTOMATION_OPTION_MONTHLY_PRICE)}원(VAT 포함)
                입니다.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Clock3 className="h-4 w-4 text-gold-600" />
                제공 기간 이후
              </div>
              <p className="text-xs leading-relaxed text-gray-600">
                콘텐츠 자동화 유지 여부는 1개월 사용 후 선택할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base text-gray-900 md:text-lg">
            <FileText className="h-5 w-5 text-gold-600" />
            콘텐츠 자동화 항목
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="grid gap-2 sm:grid-cols-2">
            {automationItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800"
              >
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-gold-600" />
                <span>{item}</span>
              </div>
            ))}
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
