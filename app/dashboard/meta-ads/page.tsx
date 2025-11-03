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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Facebook className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Meta 광고 시작하기</h1>
        </div>
        <p className="text-gray-600">
          Facebook과 Instagram에서 여러분의 브랜드를 알리세요
        </p>
      </div>

      {/* 중요 안내 */}
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <p className="font-semibold mb-2">Meta 광고 시작 전 필수 확인사항</p>
          <ul className="space-y-1 text-sm">
            <li>• <strong>Facebook 계정 로그인 필수:</strong> 광고 결과를 직접 확인하려면 로그인 가능한 Facebook 계정이 있어야 합니다.</li>
            <li>• <strong>광고 관리자 접근:</strong> 광고 성과와 통계를 직접 확인할 수 있습니다.</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* 상황별 가이드 */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">상황별 시작 가이드</CardTitle>
          <CardDescription>
            현재 상황에 맞는 탭을 선택하여 진행해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="case1" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="case1" className="text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                광고관리자 있음
              </TabsTrigger>
              <TabsTrigger value="case2" className="text-xs sm:text-sm">
                <Instagram className="w-4 h-4 mr-2" />
                인스타그램 있음
              </TabsTrigger>
              <TabsTrigger value="case3" className="text-xs sm:text-sm">
                <Facebook className="w-4 h-4 mr-2" />
                처음 시작
              </TabsTrigger>
            </TabsList>

            {/* Case 1: 광고관리자가 있는 경우 */}
            <TabsContent value="case1" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">
                      광고관리자가 이미 있으신 경우
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-green-800 font-medium mb-2">📋 필요한 정보</p>
                        <ul className="space-y-2 text-green-700">
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
                      <Alert className="bg-red-50 border-red-200 mb-3">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 text-sm">
                          <strong>중요:</strong> 광고관리자 초대는 <strong className="text-red-900">PC에서만 가능</strong>합니다.
                        </AlertDescription>
                      </Alert>
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-800 mb-3">
                          <strong>📌 진행 방법 (PC에서만 가능):</strong>
                        </p>
                        <ol className="space-y-2 text-sm text-green-800 list-decimal list-inside">
                          <li className="font-medium">
                            광고관리자 초대 페이지 접속
                            <div className="ml-6 mt-1 mb-2">
                              <a
                                href="https://business.facebook.com/latest/settings/business_users"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800 break-all text-xs"
                              >
                                https://business.facebook.com/latest/settings/business_users
                              </a>
                            </div>
                          </li>
                          <li><strong>사람</strong> → <strong className="bg-green-100 px-1 rounded">+초대하기</strong> 버튼 클릭</li>
                          <li>
                            초대할 사람 이메일 주소 입력: <strong className="text-blue-600">mkt@polarad.co.kr</strong>
                            <div className="ml-6 mt-1 text-red-600 font-medium">
                              ⚠️ 임시 액세스 설정하지 마세요
                            </div>
                          </li>
                          <li><strong>전체 관리권한</strong> 활성화</li>
                          <li><strong>고급옵션 보기</strong> 클릭</li>
                          <li><strong>전체 관리권한</strong> 활성화</li>
                          <li><strong>고급옵션 보기/관리</strong> 활성화</li>
                          <li>
                            페이지, 광고계정, 인스타그램 선택 → <strong>모든 권한 할당</strong>
                            <div className="ml-6 mt-1 bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-yellow-800 font-medium">⚠️ 스크롤로 권한 다 확인하고 활성화 필수</p>
                              <p className="text-yellow-700 text-xs mt-1">누락 부분 있으면 관리 불가</p>
                            </div>
                          </li>
                          <li><strong>다음</strong> → <strong className="bg-green-100 px-1 rounded">초대</strong> 버튼 클릭</li>
                          <li>문의하기를 통해 권한 부여 완료 안내</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Case 2: 인스타그램만 있는 경우 */}
            <TabsContent value="case2" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Instagram className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      인스타그램 계정은 있지만 광고관리자가 없는 경우
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-blue-800 font-medium mb-2">📋 제공해주실 정보</p>
                        <ul className="space-y-2 text-blue-700">
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
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-sm">
                          <strong>중요:</strong> PC에서 로그인이 가능해야 광고 설정이 가능합니다.
                          모바일 전용 계정인 경우 PC 로그인 설정이 필요합니다.
                        </AlertDescription>
                      </Alert>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-800">
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Facebook className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">
                      인스타그램 계정도 없는 경우 (처음 시작)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-purple-800 font-medium mb-2">📋 준비할 정보</p>
                        <ul className="space-y-2 text-purple-700">
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
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-800">
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
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            광고 소재 제출 방법
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">📧 제출 이메일</h4>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-blue-600" />
              <a href="mailto:mkt@polarad.co.kr" className="text-lg font-bold text-blue-600 underline">
                mkt@polarad.co.kr
              </a>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">📸 제출할 광고 소재</h4>
              <ul className="space-y-2 text-gray-700">
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

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                광고 예산 안내
              </h4>
              <ul className="space-y-2 text-gray-700">
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
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            광고 성과 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3">✅ 저희가 관리하는 부분</h4>
              <ul className="space-y-2 text-green-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>광고 자동화 연동</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>광고 소재 업로드 및 세팅</span>
                </li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-3">👤 대표님이 하실 부분</h4>
              <ul className="space-y-2 text-orange-800">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">▪</span>
                  <span>광고 성과 데이터 확인 (Meta 광고 관리자)</span>
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
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>광고 효율 측정 권장 일정</strong><br />
              • 최소 7~10일 집행 후 성과 측정<br />
              • 3~5일간 데이터가 전혀 없으면 즉시 교체 권장
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 비용 안내 */}
      <Card className="border-blue-200 bg-blue-50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            서비스 비용 안내
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    마케팅 지원 기간 중
                  </h4>
                  <p className="text-2xl font-bold text-green-600">무료</p>
                </div>
                <Badge className="bg-green-600">지원 서비스</Badge>
              </div>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    지원 기간 종료 후
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-blue-900">월 220,000원</p>
                    <p className="text-sm text-gray-600">(VAT 포함)</p>
                  </div>
                </div>
                <Badge className="bg-blue-600">유료 서비스</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 문의하기 버튼 */}
      <div className="flex justify-center">
        <a
          href="/dashboard/communication"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg"
        >
          <Mail className="w-5 h-5" />
          Meta 광고 시작 문의하기
        </a>
      </div>
    </div>
  );
}
