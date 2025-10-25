"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, MessageSquare, CreditCard, Globe, Mail, FileText, Instagram, UserPlus, Palette, Sparkles } from "lucide-react";

export default function GuidesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">가이드</h1>
        <p className="text-gray-600">
          스타트패키지 이용 가이드를 확인하세요
        </p>
      </div>

      <Tabs defaultValue="telegram" className="space-y-4">
        <TabsList className="bg-white border-2 border-gray-200">
          <TabsTrigger value="telegram">
            <MessageSquare className="w-4 h-4 mr-2" />
            텔레그램
          </TabsTrigger>
          <TabsTrigger value="sms">
            <Mail className="w-4 h-4 mr-2" />
            SMS 발신
          </TabsTrigger>
          <TabsTrigger value="meta">
            <CreditCard className="w-4 h-4 mr-2" />
            메타 결제
          </TabsTrigger>
          <TabsTrigger value="imweb">
            <Globe className="w-4 h-4 mr-2" />
            아임웹
          </TabsTrigger>
          <TabsTrigger value="design">
            <FileText className="w-4 h-4 mr-2" />
            인쇄물 발주
          </TabsTrigger>
          <TabsTrigger value="meta-admin">
            <UserPlus className="w-4 h-4 mr-2" />
            Meta 관리자
          </TabsTrigger>
          <TabsTrigger value="instagram">
            <Instagram className="w-4 h-4 mr-2" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="logo">
            <Palette className="w-4 h-4 mr-2" />
            로고 제작
          </TabsTrigger>
          <TabsTrigger value="ai-tips">
            <Sparkles className="w-4 h-4 mr-2" />
            AI 활용
          </TabsTrigger>
        </TabsList>

        {/* 텔레그램 가이드 */}
        <TabsContent value="telegram">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                텔레그램 설정 가이드
              </CardTitle>
              <CardDescription>
                고객 상담 알림을 받기 위한 텔레그램 설정 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-blue-600 font-semibold mb-2">1. 텔레그램 설치</h3>
                <p className="text-gray-600">구글 플레이스토어에서 &apos;텔레그램&apos; 검색 후 설치</p>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-2">2. 개인정보 보호 설정</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>좌측 햄버거메뉴 (삼선메뉴) 클릭</li>
                  <li>설정 클릭</li>
                  <li>개인 정보 및 보안 클릭</li>
                  <li>전화번호 클릭</li>
                  <li>내 전화번호를 볼 수 있는 사람 - <span className="text-orange-600">&apos;없음&apos;</span> 체크</li>
                  <li>내 번호로 나를 찾을 수 있는 사람 - <span className="text-orange-600">&apos;내 연락처&apos;</span> 체크</li>
                </ol>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 개인정보 보호 설정을 완료해야 홈페이지 상담 접수 시 텔레그램으로 알림을 받을 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS 발신 가이드 */}
        <TabsContent value="sms">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                SMS 발신 등록 가이드
              </CardTitle>
              <CardDescription>
                고객에게 문자 발송을 위한 필수 서류 안내
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📋 필요 서류</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">1. 사업자등록증</h4>
                    <p className="text-sm text-gray-600">문자 발신 서비스 등록용</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">2. 대표자 신분증</h4>
                    <p className="text-sm text-gray-600">본인 확인용 (법적 요구사항)</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">3. 통신서비스 이용증명원</h4>
                    <p className="text-sm text-gray-600">발신번호로 사용할 번호의 통신사에서 발급</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">4. 신용카드 앞면</h4>
                    <p className="text-sm text-gray-600">번호, 유효기간, CVV 번호 포함</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📱 발신번호 선택</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-2">핸드폰 번호 발신</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>✅ 고객 문자 수신 가능</li>
                      <li>✅ 핸드폰 통신사에서 발급</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-600 mb-2">대표번호 발신</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>⚠️ 고객 문자 수신 불가</li>
                      <li>✅ 대표번호 통신사에서 발급</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  ⚠️ <strong>중요:</strong> 통신서비스 이용증명원은 통신사별로 문서 이름이 다릅니다.
                  네이버에서 '통신서비스 이용증명원 발급'을 검색하면 상세 가이드를 확인할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 메타 결제 가이드 */}
        <TabsContent value="meta">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                메타 광고 결제 안내
              </CardTitle>
              <CardDescription>
                메타(페이스북/인스타그램) 광고 결제 방식 안내
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-blue-600 font-semibold mb-3">💳 결제 패턴</h3>
                <div className="space-y-2 text-gray-700">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium mb-1">초반 (1~2주)</p>
                    <p className="text-sm text-gray-600">$1, $2, $3 등 소액으로 자주 결제</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium mb-1">중반 (1개월)</p>
                    <p className="text-sm text-gray-600">$10, $20, $30 등으로 상향 결제</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium mb-1">안정기 (1~2개월 이후)</p>
                    <p className="text-sm text-gray-600">$100, $200 금액으로 정기 청구</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 카드 결제 시점에 따라 전월 결제액이 당월로 넘어와 청구될 수 있습니다.
                  결제 청구일에 따라 시점이 달라지는 것일 뿐 일 예산 및 월 예산은 지정된 예산 범위로 운영됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 아임웹 가이드 */}
        <TabsContent value="imweb">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                아임웹 사용 가이드
              </CardTitle>
              <CardDescription>
                홈페이지 관리 및 게시글 등록 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-blue-600 font-semibold mb-3">✍️ 게시글 등록 방법</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>아임웹 로그인</li>
                  <li>사이트 선택</li>
                  <li>사이트관리자화면 / 대시보드 진입</li>
                  <li>사이트 바로가기 클릭</li>
                  <li>메인페이지 - 접수폼 위에 &apos;글쓰기&apos; 클릭</li>
                </ol>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>✅ SEO 최적화 Tip:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 블로그 글 또는 인스타그램 게시글을 복사하여 작성</li>
                  <li>• 웹 검색에 평균 1~2개월 후 반영</li>
                  <li>• 반영 후 일주일에 한 번씩 업데이트</li>
                  <li>• 네이버 블로그 이미지는 개별 업로드 필요</li>
                </ul>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">💰 아임웹 요금</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900">월 22,000원 요금제 (권장)</p>
                    <p className="text-sm text-gray-600">11,000원 요금제는 기능 제한</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    • 6개월/12개월 결제 시 할인 적용<br/>
                    • 중도 해지 시 할인 금액 일부만 환불
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">🌐 도메인 설정</h3>
                <div className="space-y-2 text-gray-700">
                  <p className="font-medium">기본 도메인: 대표님도메인.imweb.me</p>
                  <p className="text-sm text-gray-600">✅ HTTPS 보안 인증 완료 상태</p>
                  <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-lg mt-2">
                    <p className="text-sm">
                      <strong>개인 도메인 (.co.kr, .com 등):</strong><br/>
                      도메인 판매업체에서 구입 후 ID/PW 전달 필요<br/>
                      ⚠️ 별도 보안 인증 필요
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📝 계정 이관</h3>
                <p className="text-gray-700">
                  홈페이지 확인 후 계정 이관을 위해 imweb.me 가입 후 아이디를 전달해주세요.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meta 광고관리자 초대 가이드 */}
        <TabsContent value="meta-admin">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Meta 광고관리자 초대 안내
              </CardTitle>
              <CardDescription>
                Meta 광고 계정에 관리자 권한 부여 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-blue-600 font-semibold mb-3">👥 관리자 초대 절차</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Meta 비즈니스 관리자(business.facebook.com) 접속</li>
                  <li>비즈니스 설정 클릭</li>
                  <li>사용자 &gt; 사람 메뉴 선택</li>
                  <li>&apos;추가&apos; 버튼 클릭</li>
                  <li>초대할 사람의 이메일 입력</li>
                  <li>권한 수준: &apos;관리자 액세스&apos; 선택</li>
                  <li>&apos;다음&apos; 클릭 후 초대 완료</li>
                </ol>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">🔑 광고 계정 액세스 권한 부여</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>비즈니스 설정 &gt; 계정 &gt; 광고 계정 선택</li>
                  <li>해당 광고 계정 클릭</li>
                  <li>&apos;사람 추가&apos; 클릭</li>
                  <li>초대한 사람 선택</li>
                  <li>역할: &apos;광고 계정 관리&apos; 선택</li>
                  <li>&apos;할당&apos; 클릭</li>
                </ol>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 초대받은 사람은 이메일로 받은 초대 링크를 통해 수락해야 권한이 활성화됩니다.
                </p>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  ⚠️ <strong>주의:</strong> 관리자 권한은 광고 계정의 모든 설정을 변경할 수 있으므로, 신뢰할 수 있는 사람에게만 부여하세요.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instagram PC 로그인 가이드 */}
        <TabsContent value="instagram">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Instagram className="w-5 h-5" />
                Instagram PC 로그인 오류 해결
              </CardTitle>
              <CardDescription>
                PC에서 Instagram 접속 시 비밀번호 오류 해결 방법
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 font-semibold mb-2">
                  ⚠️ 반드시 다음 과정으로 진행하세요!
                </p>
                <p className="text-sm text-gray-600">
                  PC에서 로그인이 안 되는 경우, 반드시 앱에서 비밀번호를 재설정해야 합니다.
                </p>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📱 비밀번호 재설정 절차</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>인스타그램 앱 실행</li>
                  <li>오른쪽 삼선메뉴 (햄버거메뉴) 클릭</li>
                  <li>계정센터 클릭</li>
                  <li>비밀번호 및 보안 클릭</li>
                  <li>비밀번호 변경 선택</li>
                  <li>인스타 계정 선택</li>
                  <li>
                    <span className="text-blue-600 font-medium">파란색 글자 &quot;비밀번호를 잊으셨나요?&quot;</span> 클릭
                  </li>
                  <li>계정 비밀번호 재설정 후 로그인</li>
                  <li>
                    <span className="text-orange-600 font-medium">재설정한 비밀번호를 다시 전달</span>
                  </li>
                </ol>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  ✅ <strong>완료 후:</strong> 새로운 비밀번호로 PC에서 로그인이 정상적으로 가능합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 로고 제작 가이드 */}
        <TabsContent value="logo">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                로고 제작 가이드
              </CardTitle>
              <CardDescription>
                로고 제작 요청 방법 및 추천 사이트 안내
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📋 로고 제작 방법</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-2">방법 1: 이미지로 전달</h4>
                    <p className="text-sm text-gray-700">
                      로고 이미지를 전달하시면 바로 제작 진행됩니다
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-700 mb-2">방법 2: 텍스트 설명으로 요청</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      아래 내용을 포함하여 요청해주세요:
                    </p>
                    <div className="grid gap-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[100px]">로고 유형:</span>
                        <span className="text-gray-600">워드마크 / 심볼마크 / 엠블럼 / 이니셜형</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[100px]">선호 스타일:</span>
                        <span className="text-gray-600">심플 / 모던 / 클래식 / 빈티지 / 고급스러운</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[100px]">선호 색상:</span>
                        <span className="text-gray-600">선호 색상 / 피하고 싶은 색상</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700 min-w-[100px]">선호 폰트:</span>
                        <span className="text-gray-600">손글씨체 / 명조체 / 고딕체</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-700 mb-2">📌 중요 안내</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 로고 제작 디자인이 만족스럽지 않은 경우, 본인이 개별 제작해서 전달 필요</li>
                  <li>• 로고 없이도 인쇄물 및 홈페이지 제작 가능</li>
                </ul>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">🌐 로고 생성 추천 사이트</h3>
                <div className="space-y-2">
                  <a
                    href="https://logo.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <span className="text-blue-600 font-medium">logo.com</span>
                    <span className="text-gray-500 ml-2">→</span>
                  </a>
                  <a
                    href="https://www.design.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <span className="text-blue-600 font-medium">design.com</span>
                    <span className="text-gray-500 ml-2">→</span>
                  </a>
                  <a
                    href="https://www.logoai.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <span className="text-blue-600 font-medium">logoai.com</span>
                    <span className="text-gray-500 ml-2">→</span>
                  </a>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> AI 로고 생성 사이트를 활용하면 빠르고 저렴하게 다양한 로고 옵션을 확인할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 활용 팁 */}
        <TabsContent value="ai-tips">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI 활용 무료 팁
              </CardTitle>
              <CardDescription>
                Google AI Studio로 무료로 강력한 AI 기능 사용하기
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
                <h3 className="text-purple-700 font-bold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Google AI Studio 무료 사용법
                </h3>
                <p className="text-gray-700 mb-4">
                  AI 기능을 구독하지 않아도 Google AI Studio에서 강력한 AI를 무료로 사용할 수 있습니다!
                </p>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">✨ 주요 특징</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">무료 사용량</h4>
                      <p className="text-sm text-gray-700">백만 토큰까지 무료 사용 가능</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-full flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">최신 모델</h4>
                      <p className="text-sm text-gray-700">Google Gemini 2.5 Pro 지원 (유료와 동일한 성능)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-600 rounded-full flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">결제 없음</h4>
                      <p className="text-sm text-gray-700">카드 연동은 필요하지만 실제 결제는 되지 않습니다</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📚 상세 가이드</h3>
                <a
                  href="https://blog.naver.com/ryurime88/223859489656?trackingCode=rss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-md">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Google AI Studio 사용법 가이드</p>
                        <p className="text-sm text-gray-600">네이버 블로그에서 자세한 설명 확인하기</p>
                      </div>
                    </div>
                    <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </a>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> 마케팅 콘텐츠 작성, 광고 문구 생성, 고객 응대 등 다양한 업무에 AI를 활용하여 효율을 높일 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 인쇄물 발주 가이드 */}
        <TabsContent value="design">
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                인쇄물 발주 안내
              </CardTitle>
              <CardDescription>
                인쇄물 시안 검토 및 발주 시 주의사항
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-red-600 font-bold mb-3 flex items-center gap-2">
                  ⚠️ 필독! 발주 전 주의사항
                </h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• 시안 검토 후 <strong className="text-orange-600">반드시 본인이 직접 발주 요청</strong></li>
                  <li>• <strong className="text-orange-600">발주 후 정보 변경 불가</strong></li>
                  <li>• <strong className="text-orange-600">오탈자 발견 시 재발주 비용 본인 부담</strong></li>
                  <li>• 개인 정보 반드시 확인!</li>
                </ul>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">⏱️ 제작 기간 (발주 확정 후)</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900">명찰</p>
                    <p className="text-sm text-gray-600">3~4일</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900">명함</p>
                    <p className="text-sm text-gray-600">2~3일</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900">대봉투</p>
                    <p className="text-sm text-gray-600">4~5일</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900">자문계약서</p>
                    <p className="text-sm text-gray-600">7일</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-blue-600 font-semibold mb-3">📦 제작 사양</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">명함</h4>
                    <p className="text-sm text-gray-600">아르미 울트라화이트 310g / 기본 200매 포함</p>
                    <p className="text-xs text-orange-600 mt-1">추가 제작: 2만원 (VAT 별도)</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">대봉투</h4>
                    <p className="text-sm text-gray-600">모조지 150g / 500매 포함</p>
                    <p className="text-xs text-orange-600 mt-1">추가 제작: 20만원 (VAT 별도)</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-1">자문계약서</h4>
                    <p className="text-sm text-gray-600">A3 모조지 180g / 500매 포함</p>
                    <p className="text-xs text-orange-600 mt-1">추가 제작: 30만원 (VAT 별도)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
