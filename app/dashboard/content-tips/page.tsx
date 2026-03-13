"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Bell,
  BellOff,
  Settings,
  ExternalLink,
  Youtube,
  Globe,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import { CATEGORIES, CategoryId } from "@/lib/constants/contentTipCategories";

type ContentTip = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  linkType: string;
  linkUrl: string;
  thumbnailUrl: string | null;
  category: CategoryId;
  subCategory: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function UserContentTipsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [categoryTips, setCategoryTips] = useState<{
    instagram: ContentTip[];
    meta_ads: ContentTip[];
    naver_blog: ContentTip[];
    ai: ContentTip[];
  }>({
    instagram: [],
    meta_ads: [],
    naver_blog: [],
    ai: [],
  });
  const [categoryCounts, setCategoryCounts] = useState<{
    instagramTotal: number;
    metaAdsTotal: number;
    naverBlogTotal: number;
    aiTotal: number;
  }>({
    instagramTotal: 0,
    metaAdsTotal: 0,
    naverBlogTotal: 0,
    aiTotal: 0,
  });
  const [selectedTip, setSelectedTip] = useState<ContentTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchContentTips();
    fetchUserSettings();
  }, []);

  const fetchContentTips = async () => {
    try {
      const res = await fetch("/api/content-tips");
      const data = await res.json();
      if (data) {
        setCategoryTips({
          instagram: data.instagram || [],
          meta_ads: data.meta_ads || [],
          naver_blog: data.naver_blog || [],
          ai: data.ai || [],
        });
        setCategoryCounts({
          instagramTotal: data.instagramTotal || 0,
          metaAdsTotal: data.metaAdsTotal || 0,
          naverBlogTotal: data.naverBlogTotal || 0,
          aiTotal: data.aiTotal || 0,
        });
      }
    } catch (error) {
      console.error("콘텐츠 팁 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const user = session?.user as any;
      if (user?.콘텐츠팁이메일수신 !== undefined) {
        setEmailEnabled(user.콘텐츠팁이메일수신);
      }
    } catch (error) {
      console.error("설정 조회 실패:", error);
    }
  };

  const handleUpdateEmailSettings = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          콘텐츠팁이메일수신: !emailEnabled,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setEmailEnabled(!emailEnabled);
        alert(
          emailEnabled
            ? "이메일 수신을 해제했습니다"
            : "이메일 수신을 설정했습니다",
        );
        setIsSettingsOpen(false);
        window.location.reload();
      } else {
        alert(data.error || "설정 변경 실패");
      }
    } catch (error) {
      console.error("설정 변경 실패:", error);
      alert("설정 변경 중 오류가 발생했습니다");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "오늘";
    } else if (diffInDays === 1) {
      return "어제";
    } else if (diffInDays < 7) {
      return `${diffInDays}일 전`;
    } else {
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    }
  };

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    );
    return match ? match[1] : null;
  };

  const getThumbnailUrl = (tip: ContentTip) => {
    if (tip.thumbnailUrl) {
      return tip.thumbnailUrl;
    }
    if (tip.linkType === "youtube") {
      const videoId = extractYoutubeId(tip.linkUrl);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    return null;
  };

  const handleOpenInNewWindow = () => {
    if (selectedTip) {
      window.open(selectedTip.linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 헤더 - 모바일 스택 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <Lightbulb className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
            콘텐츠 제작 Tip
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
            유용한 콘텐츠 제작 팁과 참고 자료를 확인하세요
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 self-start md:self-auto h-10 md:h-9"
        >
          <Settings className="w-4 h-4" />
          알림 설정
        </Button>
      </div>

      {/* 이메일 수신 상태 배너 */}
      <Card
        className={
          emailEnabled
            ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
            : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
        }
      >
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              {emailEnabled ? (
                <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-600 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm md:text-base">
                  {emailEnabled
                    ? "이메일 알림이 활성화되어 있습니다"
                    : "이메일 알림이 비활성화되어 있습니다"}
                </p>
                <p className="text-xs md:text-sm text-gray-600 hidden sm:block">
                  {emailEnabled
                    ? "새로운 콘텐츠 팁을 이메일로 받아보실 수 있습니다"
                    : "새로운 콘텐츠 팁을 이메일로 받지 않습니다"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="flex-shrink-0"
            >
              변경
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리별 섹션 */}
      <div className="space-y-8 md:space-y-12">
        {Object.entries(CATEGORIES).map(([categoryId, category]) => {
          const tips = categoryTips[categoryId as CategoryId];
          const totalKey = `${categoryId}Total` as keyof typeof categoryCounts;
          const total = categoryCounts[totalKey] || 0;

          return (
            <div
              key={categoryId}
              className={`rounded-lg p-4 md:p-6 ${category.color.bg} border-2 ${category.color.border}`}
            >
              {/* 섹션 헤더 - 모바일 최적화 */}
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-2xl md:text-3xl">{category.icon}</span>
                  <div>
                    <h2
                      className={`text-lg md:text-2xl font-bold ${category.color.text}`}
                    >
                      {category.name}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">
                      총 {total}개의 콘텐츠
                    </p>
                  </div>
                </div>
                {/* 더보기 버튼 - 인스타그램: 12개 초과, 나머지: 8개 초과 */}
                {((categoryId === "instagram" && total > 12) ||
                  (categoryId !== "instagram" && total > 8)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/dashboard/content-tips/${categoryId}`)
                    }
                    className={`${category.color.text} border-current hover:bg-white/50 text-xs md:text-sm px-2 md:px-3`}
                  >
                    더보기
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-0.5 md:ml-1" />
                  </Button>
                )}
              </div>

              {/* 모바일: 첫 번째만 썸네일 + 나머지 목록형, 데스크탑: 그리드 */}
              {tips.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">
                    아직 등록된 콘텐츠가 없습니다
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* 모바일 레이아웃 */}
                  <div className="block sm:hidden space-y-3">
                    {/* 첫 번째 콘텐츠: 썸네일 카드 */}
                    {tips[0] && (
                      <Card
                        className="cursor-pointer hover:shadow-lg transition-all overflow-hidden bg-white"
                        onClick={() => setSelectedTip(tips[0])}
                      >
                        {(() => {
                          const thumbnailUrl = getThumbnailUrl(tips[0]);
                          return thumbnailUrl ? (
                            <div
                              className="relative w-full aspect-video bg-gray-100 bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${thumbnailUrl})`,
                              }}
                            >
                              {tips[0].linkType === "youtube" && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                  <Youtube className="w-3 h-3" />
                                  YouTube
                                </div>
                              )}
                              {tips[0].subCategory && (
                                <div
                                  className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${category.color.badge}`}
                                >
                                  {tips[0].subCategory}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="relative w-full aspect-video bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex flex-col items-center justify-center">
                              {tips[0].linkType === "youtube" ? (
                                <Youtube className="w-10 h-10 text-yellow-400" />
                              ) : (
                                <Globe className="w-10 h-10 text-gold-400" />
                              )}
                            </div>
                          );
                        })()}
                        <CardContent className="p-3">
                          <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">
                            {tips[0].title}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatDate(tips[0].createdAt)}</span>
                            <span className="text-yellow-600 font-medium">
                              보기 →
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 나머지 콘텐츠: 목록형 (최대 5개) */}
                    {tips.length > 1 && (
                      <div className="bg-white rounded-lg border divide-y">
                        {tips.slice(1, 6).map((tip) => (
                          <div
                            key={tip.id}
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setSelectedTip(tip)}
                          >
                            {/* 작은 썸네일 또는 아이콘 */}
                            <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {getThumbnailUrl(tip) ? (
                                <div
                                  className="w-full h-full bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url(${getThumbnailUrl(tip)})`,
                                  }}
                                />
                              ) : tip.linkType === "youtube" ? (
                                <Youtube className="w-5 h-5 text-red-500" />
                              ) : (
                                <Globe className="w-5 h-5 text-gold-500" />
                              )}
                            </div>
                            {/* 콘텐츠 정보 */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                                {tip.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span>{formatDate(tip.createdAt)}</span>
                                {tip.subCategory && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] ${category.color.badge}`}
                                  >
                                    {tip.subCategory}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 데스크탑 그리드 레이아웃 */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {tips.map((tip) => {
                      const thumbnailUrl = getThumbnailUrl(tip);

                      return (
                        <Card
                          key={tip.id}
                          className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden bg-white"
                          onClick={() => setSelectedTip(tip)}
                        >
                          {/* 16:9 썸네일 */}
                          {thumbnailUrl ? (
                            <div
                              className="relative w-full aspect-video bg-gray-100 bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${thumbnailUrl})`,
                              }}
                            >
                              {tip.linkType === "youtube" && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                  <Youtube className="w-3 h-3" />
                                  YouTube
                                </div>
                              )}
                              {tip.linkType === "blog" && (
                                <div className="absolute top-2 right-2 bg-navy-900 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  Blog
                                </div>
                              )}
                              {/* 서브카테고리 뱃지 */}
                              {tip.subCategory && (
                                <div
                                  className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${category.color.badge}`}
                                >
                                  {tip.subCategory}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="relative w-full aspect-video bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex flex-col items-center justify-center">
                              {tip.linkType === "youtube" ? (
                                <>
                                  <Youtube className="w-12 h-12 text-yellow-400 mb-2" />
                                  <span className="text-sm text-yellow-700 font-medium">
                                    YouTube
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Globe className="w-12 h-12 text-gold-400 mb-2" />
                                  <span className="text-sm text-navy-700 font-medium">
                                    Blog
                                  </span>
                                </>
                              )}
                              {/* 서브카테고리 뱃지 */}
                              {tip.subCategory && (
                                <div
                                  className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${category.color.badge}`}
                                >
                                  {tip.subCategory}
                                </div>
                              )}
                            </div>
                          )}

                          <CardContent className="p-4">
                            {/* 제목 */}
                            <h3 className="font-bold text-base text-gray-900 line-clamp-2 mb-2 hover:text-yellow-600 transition-colors">
                              {tip.title}
                            </h3>

                            {/* 설명 미리보기 */}
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                              {tip.description}
                            </p>

                            {/* 날짜 */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                              <span>{formatDate(tip.createdAt)}</span>
                              <span className="text-yellow-600 font-medium">
                                보기 →
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 콘텐츠 팁 상세 모달/바텀시트 */}
      {isMobile ? (
        <BottomSheet
          open={!!selectedTip}
          onOpenChange={() => setSelectedTip(null)}
        >
          {selectedTip && (
            <div className="space-y-4 pb-4">
              {/* 헤더 */}
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {selectedTip.linkType === "youtube" ? (
                    <Youtube className="w-5 h-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <Globe className="w-5 h-5 text-gold-600 flex-shrink-0" />
                  )}
                  <span className="line-clamp-2">{selectedTip.title}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedTip.authorName} · {formatDate(selectedTip.createdAt)}
                </p>
              </div>

              {/* 설명 */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTip.description}
                </p>
              </div>

              {/* 유튜브 임베드 */}
              {selectedTip.linkType === "youtube" && (
                <div className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-gray-100">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${extractYoutubeId(selectedTip.linkUrl)}`}
                    title={selectedTip.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {/* 블로그 미리보기 */}
              {selectedTip.linkType === "blog" && selectedTip.thumbnailUrl && (
                <div
                  className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-gray-100 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${selectedTip.thumbnailUrl})`,
                  }}
                />
              )}

              {/* 버튼 */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleOpenInNewWindow}
                  className="w-full h-12 bg-yellow-600 hover:bg-yellow-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />새 창에서 열기
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTip(null)}
                  className="w-full h-12"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </BottomSheet>
      ) : (
        <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedTip && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    {selectedTip.linkType === "youtube" ? (
                      <Youtube className="w-6 h-6 text-red-600" />
                    ) : (
                      <Globe className="w-6 h-6 text-gold-600" />
                    )}
                    {selectedTip.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500">
                    {selectedTip.authorName} ·{" "}
                    {formatDate(selectedTip.createdAt)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* 설명 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedTip.description}
                    </p>
                  </div>

                  {/* 유튜브 임베드 */}
                  {selectedTip.linkType === "youtube" && (
                    <div className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-gray-100">
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${extractYoutubeId(selectedTip.linkUrl)}`}
                        title={selectedTip.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {/* 블로그 미리보기 */}
                  {selectedTip.linkType === "blog" &&
                    selectedTip.thumbnailUrl && (
                      <div
                        className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-gray-100 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${selectedTip.thumbnailUrl})`,
                        }}
                      />
                    )}
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTip(null)}
                  >
                    닫기
                  </Button>
                  <Button
                    onClick={handleOpenInNewWindow}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />새 창에서 열기
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* 설정 다이얼로그/바텀시트 */}
      {isMobile ? (
        <BottomSheet
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          title="이메일 알림 설정"
          description="콘텐츠 제작 팁 이메일 수신 여부를 설정할 수 있습니다"
        >
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
              {emailEnabled ? (
                <Bell className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  현재 상태:{" "}
                  {emailEnabled ? "이메일 수신 중" : "이메일 수신 안 함"}
                </h4>
                <p className="text-sm text-gray-600">
                  {emailEnabled
                    ? "새로운 콘텐츠 팁이 등록되면 이메일로 알림을 받습니다"
                    : "새로운 콘텐츠 팁 알림을 받지 않습니다"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 pb-4">
            <Button
              onClick={handleUpdateEmailSettings}
              disabled={updating}
              className={`w-full h-12 ${
                emailEnabled
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }`}
            >
              {updating
                ? "처리 중..."
                : emailEnabled
                  ? "이메일 수신 해제"
                  : "이메일 수신 설정"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(false)}
              disabled={updating}
              className="w-full h-12"
            >
              취소
            </Button>
          </div>
        </BottomSheet>
      ) : (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이메일 알림 설정</DialogTitle>
              <DialogDescription>
                콘텐츠 제작 팁 이메일 수신 여부를 설정할 수 있습니다
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                {emailEnabled ? (
                  <Bell className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                ) : (
                  <BellOff className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    현재 상태:{" "}
                    {emailEnabled ? "이메일 수신 중" : "이메일 수신 안 함"}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {emailEnabled
                      ? "새로운 콘텐츠 팁이 등록되면 이메일로 알림을 받습니다"
                      : "새로운 콘텐츠 팁 알림을 받지 않습니다"}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSettingsOpen(false)}
                disabled={updating}
              >
                취소
              </Button>
              <Button
                onClick={handleUpdateEmailSettings}
                disabled={updating}
                className={
                  emailEnabled
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }
              >
                {updating
                  ? "처리 중..."
                  : emailEnabled
                    ? "이메일 수신 해제"
                    : "이메일 수신 설정"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
