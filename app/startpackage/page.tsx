"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageModal } from "@/components/ui/image-modal";
import {
  Palette,
  Globe,
  Zap,
  MessageSquare,
  Mail,
  BarChart3,
  CheckCircle2,
  Lock,
  ChevronDown,
  ExternalLink,
  FileText,
  CreditCard,
  Smartphone,
  Phone,
  Clock,
  Shield,
  Users,
  ArrowRight,
  Building2,
  Award,
  Headphones,
} from "lucide-react";

const CORRECT_PASSWORD = "1649";

export default function StartPackagePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState(0);

  // 이미지 모달 상태
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  // 이미지 클릭 핸들러
  const handleImageClick = (images: string[], index: number = 0) => {
    setModalImages(images);
    setModalInitialIndex(index);
    setImageModalOpen(true);
  };

  // 세션 스토리지에서 인증 상태 확인
  useEffect(() => {
    const auth = sessionStorage.getItem("startpackage_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("startpackage_auth", "true");
      setError("");
    } else {
      setError("비밀번호가 일치하지 않습니다.");
    }
  };

  // 비밀번호 입력 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-2xl mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">스타트패키지</h1>
            <p className="text-white/70">패키지 정보를 확인하려면 비밀번호를 입력하세요</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/50 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm text-center mt-2">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-white text-slate-800 rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors"
            >
              확인
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 메인 콘텐츠
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-white text-gray-900 overflow-hidden border-b border-gray-100">
        <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-24">
          <div className="text-center">
            {/* 배지 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm mb-6">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span className="text-slate-700 font-medium">비즈액터스쿨</span>
            </div>

            {/* 타이틀 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              스타트패키지
            </h1>

            {/* 설명 */}
            <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
              인쇄물 디자인 + 홈페이지 제작<br />
              비즈니스 시작에 필요한<br className="md:hidden" />모든 것을 통합 진행합니다
            </p>

            {/* 핵심 강점 */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-8 md:mb-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#16255e] text-white rounded-lg w-full md:w-auto justify-center">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">자체개발 홈페이지</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#16255e] text-white rounded-lg w-full md:w-auto justify-center">
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-medium">반응형 최적화</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#16255e] text-white rounded-lg w-full md:w-auto justify-center">
                <Palette className="w-4 h-4" />
                <span className="text-sm font-medium">인쇄물 통합 디자인</span>
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="flex justify-center">
              <a
                href="#design"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-[#16255e] text-white rounded-xl font-semibold text-sm md:text-base hover:bg-[#1a2d6e] transition-colors"
              >
                패키지 구성 보기
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 패키지 요약 */}
      <section className="py-10 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              패키지 구성
            </h2>
            <p className="text-sm md:text-lg text-gray-600">
              비즈니스 시작에 필요한 필수 항목을 모두 포함
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* 디자인 */}
            <a href="#design" className="group p-5 md:p-8 bg-white rounded-2xl border border-gray-200 hover:border-[#16255e] transition-all hover:shadow-lg">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#16255e] rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <Palette className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">인쇄물 디자인</h3>
              <ul className="space-y-1.5 md:space-y-2 text-gray-600 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>로고 디자인</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>명함 (200매)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>대봉투 (500매)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>자문계약서 (500매)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>명찰</span>
                </li>
              </ul>
            </a>

            {/* 홈페이지 */}
            <a href="#homepage" className="group p-5 md:p-8 bg-white rounded-2xl border border-gray-200 hover:border-[#16255e] transition-all hover:shadow-lg">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#16255e] rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">자체개발 홈페이지</h3>
              <ul className="space-y-1.5 md:space-y-2 text-gray-600 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>반응형 웹사이트</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>6가지 스타일 선택</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>상담 접수 폼</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>SEO 최적화</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>SSL 보안 인증</span>
                </li>
              </ul>
            </a>

            {/* 자동화 */}
            <a href="#automation" className="group p-5 md:p-8 bg-white rounded-2xl border border-gray-200 hover:border-[#16255e] transition-all hover:shadow-lg">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#16255e] rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">마케팅 자동화</h3>
              <ul className="space-y-1.5 md:space-y-2 text-gray-600 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>텔레그램 실시간 알림</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>SMS 자동 발송</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>메타 광고 관리</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>네이버 검색 광고</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>성과 리포트</span>
                </li>
              </ul>
            </a>
          </div>
        </div>
      </section>

      {/* 디자인 섹션 */}
      <section id="design" className="py-10 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-2xl mb-4 md:mb-6">
              <Palette className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
              디자인 항목
            </h2>
            <p className="text-sm md:text-lg text-gray-600">
              비즈니스 브랜딩에 필요한<br className="md:hidden" />기본 디자인을 제공합니다
            </p>
          </div>

          {/* 로고 */}
          <div className="bg-white rounded-2xl p-4 md:p-8 mb-6 md:mb-8 shadow-sm">
            <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
              <span className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Palette className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
              </span>
              로고 디자인
            </h3>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 md:mb-3 text-sm md:text-base">제작 방식</h4>
                <ul className="space-y-2 text-gray-600 text-xs md:text-base">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="whitespace-nowrap">기존 로고 이미지 전달 시 바로 적용</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="whitespace-nowrap">선호 스타일/색상/폰트 요청 시 제작</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="whitespace-nowrap">로고 없이도 인쇄물/홈페이지 제작 가능</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 md:mb-3 text-sm md:text-base">로고 유형</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-100 rounded-lg text-xs md:text-sm">워드마크</span>
                  <span className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-100 rounded-lg text-xs md:text-sm">심볼마크</span>
                  <span className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-100 rounded-lg text-xs md:text-sm">엠블럼</span>
                  <span className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-100 rounded-lg text-xs md:text-sm">이니셜형</span>
                </div>
              </div>
            </div>
          </div>

          {/* 명함 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </span>
              명함 (기본 200매 포함)
            </h3>
            <div className="mb-6">
              <p className="text-gray-600 mb-4 text-sm md:text-base">아르미 울트라화이트 310g<br className="md:hidden" /> / 4가지 디자인 중 선택</p>
              <p className="text-sm text-orange-600">추가 제작: 22,000원 (VAT 포함)</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "/guides/print/namecard_1.jpg",
                "/guides/print/namecard_2.jpg",
                "/guides/print/namecard_3.jpg",
                "/guides/print/namecard_4.jpg",
              ].map((src, idx) => (
                <div
                  key={src}
                  className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-orange-400 hover:shadow-lg transition-all"
                  onClick={() => handleImageClick([
                    "/guides/print/namecard_1.jpg",
                    "/guides/print/namecard_2.jpg",
                    "/guides/print/namecard_3.jpg",
                    "/guides/print/namecard_4.jpg",
                  ], idx)}
                >
                  <Image
                    src={src}
                    alt={`명함 스타일 ${idx + 1}`}
                    width={300}
                    height={200}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 대봉투 & 자문계약서 */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </span>
                대봉투 (500매)
              </h3>
              <p className="text-gray-600 mb-3">모조지 150g</p>
              <p className="text-sm text-orange-600 mb-4">추가 제작: 220,000원 (VAT 포함)</p>
              <div
                className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-400 hover:shadow-lg transition-all"
                onClick={() => handleImageClick(["/guides/print/envelope.jpg"])}
              >
                <Image
                  src="/guides/print/envelope.jpg"
                  alt="대봉투"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </span>
                자문계약서 (500매)
              </h3>
              <p className="text-gray-600 mb-3">A3 모조지 180g</p>
              <p className="text-sm text-orange-600 mb-4">추가 제작: 330,000원 (VAT 포함)</p>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-400 hover:shadow-lg transition-all"
                  onClick={() => handleImageClick([
                    "/guides/print/contract_cover.jpg",
                    "/guides/print/contract_inner.jpg"
                  ], 0)}
                >
                  <p className="text-xs text-gray-500 px-2 pt-2">표지</p>
                  <Image
                    src="/guides/print/contract_cover.jpg"
                    alt="자문계약서 표지"
                    width={300}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
                <div
                  className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-400 hover:shadow-lg transition-all"
                  onClick={() => handleImageClick([
                    "/guides/print/contract_cover.jpg",
                    "/guides/print/contract_inner.jpg"
                  ], 1)}
                >
                  <p className="text-xs text-gray-500 px-2 pt-2">내지</p>
                  <Image
                    src="/guides/print/contract_inner.jpg"
                    alt="자문계약서 내지"
                    width={300}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 명찰 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-amber-600" />
              </span>
              명찰
            </h3>
            <p className="text-gray-600 mb-4">제작 기간: 3~4일</p>
            <div className="max-w-md">
              <div
                className="border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-lg transition-all"
                onClick={() => handleImageClick(["/guides/print/badge.jpg"])}
              >
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
      </section>

      {/* 홈페이지 섹션 */}
      <section id="homepage" className="py-10 md:py-24 bg-slate-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-2xl mb-4 md:mb-6">
              <Globe className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
              홈페이지 스타일
            </h2>
            <p className="text-xs md:text-lg text-gray-600 whitespace-nowrap">
              6가지 스타일 중 선호하는 디자인을 선택하세요
            </p>
          </div>

          {/* 모바일: 네비게이션 버튼 + 단일 카드 / 데스크탑: 그리드 */}
          {(() => {
            const styles = [
              { url: "https://financialhealing.imweb.me/", name: "스타일 1" },
              { url: "https://bizen.co.kr/", name: "스타일 2" },
              { url: "https://jmbiz.imweb.me/", name: "스타일 3" },
              { url: "https://ksupport-center.imweb.me/", name: "스타일 4" },
              { url: "https://dkcenter.imweb.me/", name: "스타일 5" },
              { url: "https://k-eai.co.kr/", name: "스타일 6" },
            ];
            return (
              <>
                {/* 모바일 네비게이션 버튼 */}
                <div className="md:hidden mb-4">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {styles.map((style, index) => (
                      <button
                        key={style.name}
                        onClick={() => setActiveStyle(index)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          activeStyle === index
                            ? "bg-[#16255e] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                  {/* 선택된 스타일 카드 */}
                  <a
                    href={styles[activeStyle].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border-2 border-[#16255e] rounded-2xl overflow-hidden shadow-lg"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                      <iframe
                        src={styles[activeStyle].url}
                        className="w-full h-full scale-[0.33] origin-top-left pointer-events-none"
                        style={{ width: '300%', height: '300%' }}
                        title={styles[activeStyle].name}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          클릭하여 미리보기
                        </div>
                      </div>
                    </div>
                    <div className="p-3 text-center">
                      <p className="font-semibold text-gray-900">{styles[activeStyle].name}</p>
                    </div>
                  </a>
                </div>

                {/* 데스크탑 그리드 */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {styles.map((style) => (
                    <a
                      key={style.url}
                      href={style.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-xl transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                        <iframe
                          src={style.url}
                          className="w-full h-full scale-[0.33] origin-top-left pointer-events-none"
                          style={{ width: '300%', height: '300%' }}
                          title={style.name}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity">
                            <ExternalLink className="w-4 h-4" />
                            미리보기
                          </div>
                        </div>
                      </div>
                      <div className="p-4 text-center">
                        <p className="font-semibold text-gray-900">{style.name}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            );
          })()}

          <div className="mt-12 bg-blue-50 rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">홈페이지 포함 기능</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">반응형 웹 디자인 (PC/모바일)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">상담 접수 폼</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">SSL 보안 인증서</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">검색엔진 최적화 (SEO)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">게시글 등록 기능</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">도메인 연결</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 자동화 서비스 섹션 */}
      <section id="automation" className="py-10 md:py-24 bg-[#16255e] text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur rounded-2xl mb-4 md:mb-6">
              <Zap className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-xl md:text-4xl font-bold mb-2 md:mb-4 text-white">
              마케팅 자동화 서비스
            </h2>
            <p className="text-sm md:text-lg text-white/80">
              업무 효율을 높이는<br className="md:hidden" />자동화 시스템을 제공합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* 텔레그램 알림 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-8 border border-white/10">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-white">텔레그램 실시간 알림</h3>
                  <p className="text-white/70 text-xs md:text-sm">고객 상담 접수 즉시 알림</p>
                </div>
              </div>
              <ul className="space-y-2 md:space-y-3 text-white/90 text-xs md:text-base">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="whitespace-nowrap">홈페이지 상담 접수 시 실시간 푸시 알림</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="whitespace-nowrap">고객 연락처, 문의 내용 즉시 확인</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="whitespace-nowrap">모바일에서 바로 확인 가능</span>
                </li>
              </ul>
            </div>

            {/* SMS 자동 발송 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-8 border border-white/10">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-green-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-white">SMS 자동 발송</h3>
                  <p className="text-white/70 text-xs md:text-sm">고객에게 자동 문자 발송</p>
                </div>
              </div>
              <ul className="space-y-2 md:space-y-3 text-white/90 text-xs md:text-base">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>접수 즉시 알림</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>기타 문자설정 연동</span>
                </li>
              </ul>
            </div>

            {/* 메타 광고 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-8 border border-white/10">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-500 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-white">메타 광고 관리</h3>
                  <p className="text-white/70 text-xs md:text-sm">페이스북/인스타그램 광고</p>
                </div>
              </div>
              <ul className="space-y-2 md:space-y-3 text-white/90 text-xs md:text-base">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>광고 계정 세팅 및 관리</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>타겟 오디언스 최적화</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>광고 성과 리포트</span>
                </li>
              </ul>
            </div>

            {/* 네이버 검색 광고 */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-8 border border-white/10">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-white">네이버 검색 광고</h3>
                  <p className="text-white/70 text-xs md:text-sm">검색 광고 세팅 및 관리</p>
                </div>
              </div>
              <ul className="space-y-2 md:space-y-3 text-white/90 text-xs md:text-base">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>키워드 분석 및 세팅</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>광고 문구 최적화</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>예산 효율 관리</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 진행 프로세스 섹션 */}
      <section className="py-10 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-6 md:mb-10">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
              진행 프로세스
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              체계적인 프로세스로 진행됩니다
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="relative p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border border-gray-200 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#16255e] text-white rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 font-bold text-sm md:text-base">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">자료 제출</h3>
              <p className="text-[10px] md:text-sm text-gray-600 whitespace-nowrap">로고, 사진, 텍스트 등 필요 자료 전달</p>
              <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="relative p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border border-gray-200 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#16255e] text-white rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 font-bold text-sm md:text-base">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">디자인 제작</h3>
              <p className="text-[10px] md:text-sm text-gray-600 whitespace-nowrap">시안 제작 및 피드백 반영</p>
              <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="relative p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border border-gray-200 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#16255e] text-white rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 font-bold text-sm md:text-base">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">발주</h3>
              <p className="text-[10px] md:text-sm text-gray-600 whitespace-nowrap">인쇄물 발주 및 홈페이지 세팅</p>
              <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border border-gray-200 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 font-bold text-sm md:text-base">
                4
              </div>
              <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">진행 완료</h3>
              <p className="text-[10px] md:text-sm text-gray-600 whitespace-nowrap">인쇄물 배송 및 홈페이지 오픈</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#16255e] text-white py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Image
            src="/bizactorschool-logo.png"
            alt="비즈액터스쿨"
            width={140}
            height={46}
            className="mx-auto mb-4 md:mb-6 w-[120px] md:w-[180px] h-auto"
          />
          <h2 className="text-lg md:text-3xl font-bold mb-2 md:mb-4 text-white">
            비즈액터스쿨 스타트패키지는
          </h2>
          <p className="text-base md:text-xl text-white/80 mb-6 md:mb-8">
            기업심사관의 도약을 함께 합니다.
          </p>
          <div className="border-t border-white/10 pt-6 md:pt-8">
            <p className="text-xs md:text-sm text-white/50">
              © 비즈액터스쿨. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* 이미지 모달 */}
      {imageModalOpen && (
        <ImageModal
          images={modalImages}
          initialIndex={modalInitialIndex}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}
