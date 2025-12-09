"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Facebook,
  Instagram,
  Mail,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  TrendingUp,
  Info,
} from "lucide-react";

export default function MetaAdsPage() {
  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-4 md:px-0">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <Facebook className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Meta 광고 시작하기</h1>
        </div>
        <p className="text-sm md:text-base text-gray-600">
          Facebook과 Instagram에서 여러분의 브랜드를 알리세요
        </p>
      </div>

      {/* 중요 안내 */}
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        <AlertDescription className="text-yellow-800">
          <p className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Meta 광고 시작 전 필수 확인사항</p>
          <ul className="space-y-1 text-xs md:text-sm">
            <li>• <strong>Facebook 계정 로그인 필수:</strong> <span className="hidden sm:inline">광고 결과를 직접 확인하려면</span> 로그인 가능한 Facebook 계정이 있어야 합니다.</li>
            <li className="hidden md:block">• <strong>광고 관리자 접근:</strong> 광고 성과와 통계를 직접 확인할 수 있습니다.</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* 상황별 가이드 */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-gray-900 text-base md:text-lg">상황별 시작 가이드</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            현재 상황에 맞는 탭을 선택하여 진행해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <Tabs defaultValue="case1" className="w-full">
            {/* 탭 - 모바일에서 가로 스크롤 */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4 md:mb-6">
              <TabsList className="grid w-full min-w-[320px] grid-cols-3 h-auto p-1">
                <TabsTrigger value="case1" className="text-[10px] sm:text-xs md:text-sm py-2 px-1 md:px-3 flex flex-col sm:flex-row items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 sm:mr-1" />
                  <span className="whitespace-nowrap">광고관리자 있음</span>
                </TabsTrigger>
                <TabsTrigger value="case2" className="text-[10px] sm:text-xs md:text-sm py-2 px-1 md:px-3 flex flex-col sm:flex-row items-center gap-1">
                  <Instagram className="w-3 h-3 md:w-4 md:h-4 sm:mr-1" />
                  <span className="whitespace-nowrap">인스타그램 있음</span>
                </TabsTrigger>
                <TabsTrigger value="case3" className="text-[10px] sm:text-xs md:text-sm py-2 px-1 md:px-3 flex flex-col sm:flex-row items-center gap-1">
                  <Facebook className="w-3 h-3 md:w-4 md:h-4 sm:mr-1" />
                  <span className="whitespace-nowrap">처음 시작</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Case 1: 광고관리자가 있는 경우 */}
            <TabsContent value="case1" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6">
                <div className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-green-900 mb-2 md:mb-3">
                      광고관리자가 이미 있으신 경우
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <p className="text-green-800 font-medium mb-2 text-sm md:text-base">📋 필요한 정보</p>
                        <ul className="space-y-1.5 md:space-y-2 text-green-700 text-xs md:text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">▪</span>
                            <span>광고 관리자 계정 접근 권한 설정</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">▪</span>
                            <span>담당자 이메일: <a href="mailto:mkt@polarad.co.kr" className="text-blue-600 underline font-semibold">mkt@polarad.co.kr</a></span>
                          </li>
                        </ul>
                      </div>
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <AlertDescription className="text-red-800 text-xs md:text-sm">
                          <strong>중요:</strong> 광고관리자 초대는 <strong className="text-red-900">PC에서만 가능</strong>합니다.
                        </AlertDescription>
                      </Alert>
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-green-200">
                        <p className="text-xs md:text-sm text-green-800 mb-2 md:mb-3">
                          <strong>📌 진행 방법 (PC에서만 가능):</strong>
                        </p>
                        <ol className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-green-800 list-decimal list-inside">
                          <li className="font-medium">
                            광고관리자 초대 페이지 접속
                            <div className="ml-4 md:ml-6 mt-1 mb-2">
                              <a
                                href="https://business.facebook.com/latest/settings/business_users"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800 break-all text-[10px] md:text-xs"
                              >
                                business.facebook.com/.../business_users
                              </a>
                            </div>
                          </li>
                          <li><strong>사람</strong> → <strong className="bg-green-100 px-1 rounded">+초대하기</strong> 클릭</li>
                          <li>
                            이메일: <strong className="text-blue-600">mkt@polarad.co.kr</strong>
                            <div className="ml-4 md:ml-6 mt-1 text-red-600 font-medium text-[10px] md:text-xs">
                              ⚠️ 임시 액세스 설정 X
                            </div>
                          </li>
                          <li><strong>전체 관리권한</strong> 활성화</li>
                          <li><strong>고급옵션 보기</strong> 클릭</li>
                          <li><strong>전체 관리권한</strong> 활성화</li>
                          <li><strong>고급옵션 보기/관리</strong> 활성화</li>
                          <li>
                            페이지, 광고계정, 인스타그램 → <strong>모든 권한</strong>
                            <div className="ml-4 md:ml-6 mt-1 bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-yellow-800 font-medium text-[10px] md:text-xs">⚠️ 스크롤로 권한 다 확인 필수</p>
                            </div>
                          </li>
                          <li><strong>다음</strong> → <strong className="bg-green-100 px-1 rounded">초대</strong></li>
                          <li>문의하기로 완료 안내</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Case 2: 인스타그램만 있는 경우 */}
            <TabsContent value="case2" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
                <div className="flex items-start gap-2 md:gap-3">
                  <Instagram className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2 md:mb-3">
                      인스타그램 계정은 있지만 광고관리자가 없는 경우
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <p className="text-blue-800 font-medium mb-2 text-sm md:text-base">📋 제공해주실 정보</p>
                        <ul className="space-y-1.5 md:space-y-2 text-blue-700 text-xs md:text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">▪</span>
                            <span>인스타그램 로그인 ID (이메일 또는 전화번호)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">▪</span>
                            <span>인스타그램 로그인 비밀번호</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">▪</span>
                            <span>PC에서 로그인 가능 여부 확인</span>
                          </li>
                        </ul>
                      </div>
                      <Alert className="bg-blue-100 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <AlertDescription className="text-blue-800 text-xs md:text-sm">
                          <strong>중요:</strong> PC에서 로그인이 가능해야 광고 설정이 가능합니다.
                        </AlertDescription>
                      </Alert>
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-blue-200">
                        <p className="text-xs md:text-sm text-blue-800">
                          <strong>📌 다음 단계:</strong><br />
                          문의하기를 통해 위 정보를 전달해주시면, Facebook 비즈니스 계정과 광고 관리자를 설정해드립니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Case 3: 처음 시작하는 경우 */}
            <TabsContent value="case3" className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 md:p-6">
                <div className="flex items-start gap-2 md:gap-3">
                  <Facebook className="w-5 h-5 md:w-6 md:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-purple-900 mb-2 md:mb-3">
                      인스타그램 계정도 없는 경우 (처음 시작)
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <p className="text-purple-800 font-medium mb-2 text-sm md:text-base">📋 준비할 정보</p>
                        <ul className="space-y-1.5 md:space-y-2 text-purple-700 text-xs md:text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-purple-600">▪</span>
                            <span>인스타그램에 사용할 이메일 주소</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-600">▪</span>
                            <span>사용하실 비밀번호 (안전한 비밀번호 권장)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-600">▪</span>
                            <span>브랜드/업체 이름</span>
                          </li>
                        </ul>
                      </div>
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-purple-200">
                        <p className="text-xs md:text-sm text-purple-800">
                          <strong>📌 진행 과정:</strong><br />
                          1. 인스타그램 계정 생성<br />
                          2. Facebook 페이지 연결<br />
                          3. Meta 광고 관리자 설정<br />
                          4. 광고 계정 활성화<br />
                          <br />
                          <strong className="text-purple-900">문의하기를 통해 위 정보를 전달해주시면, 전체 과정을 도와드립니다.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 광고 소재 제출 */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-gray-900 flex items-center gap-2 text-base md:text-lg">
            <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            광고 소재 제출 방법
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-blue-900 mb-2 md:mb-3 text-sm md:text-base">📧 제출 이메일</h4>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              <a href="mailto:mkt@polarad.co.kr" className="text-base md:text-lg font-bold text-blue-600 underline">
                mkt@polarad.co.kr
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2 md:mb-3 text-sm md:text-base">📸 제출할 광고 소재</h4>
              <ul className="space-y-1.5 md:space-y-2 text-gray-700 text-xs md:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">▪</span>
                  <span>광고용 이미지 또는 영상 파일</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">▪</span>
                  <span>광고 문구 (선택사항)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">▪</span>
                  <span>타겟 지역/연령대 (선택사항)</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                광고 예산 안내
              </h4>
              <ul className="space-y-1.5 md:space-y-2 text-gray-700 text-xs md:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">▪</span>
                  <span>하루 예산: $10, $20, $30 등</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">▪</span>
                  <span>광고별로 다른 예산 설정 가능</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">▪</span>
                  <span>예산은 언제든 조정 가능</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 광고 관리 안내 */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-gray-900 flex items-center gap-2 text-base md:text-lg">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            광고 성과 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
              <h4 className="font-semibold text-green-900 mb-2 md:mb-3 text-sm md:text-base">✅ 저희가 관리하는 부분</h4>
              <ul className="space-y-1.5 md:space-y-2 text-green-800 text-xs md:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>광고 자동화 연동</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>광고 소재 업로드 및 세팅</span>
                </li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:p-4">
              <h4 className="font-semibold text-orange-900 mb-2 md:mb-3 text-sm md:text-base">👤 대표님이 하실 부분</h4>
              <ul className="space-y-1.5 md:space-y-2 text-orange-800 text-xs md:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">▪</span>
                  <span>광고 성과 데이터 확인</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">▪</span>
                  <span>광고 콘텐츠 구성 및 방향 결정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">▪</span>
                  <span>광고 교체 또는 예산 조정 요청</span>
                </li>
              </ul>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <AlertDescription className="text-blue-800 text-xs md:text-sm">
              <strong>광고 효율 측정 권장 일정</strong><br />
              • 최소 7~10일 집행 후 성과 측정<br />
              • 3~5일간 데이터가 전혀 없으면 즉시 교체 권장
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 비용 안내 */}
      <Card className="border-blue-200 bg-blue-50 shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-blue-900 flex items-center gap-2 text-base md:text-lg">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            서비스 비용 안내
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="space-y-2 md:space-y-3">
            <div className="bg-white border border-green-200 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-green-900 text-sm md:text-base whitespace-nowrap">
                      마케팅 지원 기간 중
                    </h4>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-green-600 whitespace-nowrap">무료</p>
                </div>
                <Badge className="bg-green-600 text-xs whitespace-nowrap flex-shrink-0">지원 서비스</Badge>
              </div>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-blue-900 text-sm md:text-base whitespace-nowrap">
                      지원 기간 종료 후
                    </h4>
                  </div>
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <p className="text-lg md:text-2xl font-bold text-blue-900">월 220,000원</p>
                    <p className="text-[10px] md:text-sm text-gray-600">(VAT)</p>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-xs whitespace-nowrap flex-shrink-0">유료 서비스</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 문의하기 버튼 */}
      <div className="flex justify-center pb-4 md:pb-0">
        <a
          href="/dashboard/communication"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 md:px-8 py-3 md:py-4 rounded-lg transition-colors shadow-lg text-sm md:text-base w-full md:w-auto justify-center"
        >
          <Mail className="w-4 h-4 md:w-5 md:h-5" />
          Meta 광고 시작 문의하기
        </a>
      </div>
    </div>
  );
}
