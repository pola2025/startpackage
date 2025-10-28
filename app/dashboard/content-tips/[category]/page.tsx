"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Youtube, Globe, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CATEGORIES, CategoryId, isValidCategory } from "@/lib/constants/contentTipCategories";

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

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.category as string;

  const [tips, setTips] = useState<ContentTip[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<ContentTip | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate category
  if (!isValidCategory(categoryId)) {
    router.push("/dashboard/content-tips");
    return null;
  }

  const category = CATEGORIES[categoryId];

  useEffect(() => {
    fetchCategoryTips();
  }, [categoryId, selectedSubCategory]);

  const fetchCategoryTips = async () => {
    try {
      const url = selectedSubCategory
        ? `/api/content-tips/category/${categoryId}?subCategory=${encodeURIComponent(selectedSubCategory)}`
        : `/api/content-tips/category/${categoryId}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data) {
        setTips(data.tips || []);
        setAvailableSubCategories(data.availableSubCategories || []);
      }
    } catch (error) {
      console.error("콘텐츠 팁 조회 실패:", error);
    } finally {
      setLoading(false);
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
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className={`rounded-lg p-6 ${category.color.bg} border-2 ${category.color.border}`}>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/content-tips")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-4xl">{category.icon}</span>
          <div>
            <h1 className={`text-3xl font-bold ${category.color.text}`}>
              {category.name}
            </h1>
            <p className="text-gray-600 mt-1">
              총 {tips.length}개의 콘텐츠
            </p>
          </div>
        </div>
      </div>

      {/* 서브카테고리 필터 */}
      {availableSubCategories.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 mr-2">
                서브카테고리:
              </span>
              <Button
                variant={selectedSubCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSubCategory(null)}
              >
                전체
              </Button>
              {availableSubCategories.map((subCat) => (
                <Button
                  key={subCat}
                  variant={selectedSubCategory === subCat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubCategory(subCat)}
                  className={selectedSubCategory === subCat ? category.color.badge : ""}
                >
                  {subCat}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tips.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                {selectedSubCategory
                  ? `"${selectedSubCategory}" 서브카테고리에 해당하는 콘텐츠가 없습니다`
                  : "아직 등록된 콘텐츠가 없습니다"}
              </CardContent>
            </Card>
          </div>
        ) : (
          tips.map((tip) => {
            const thumbnailUrl = getThumbnailUrl(tip);

            return (
              <Card
                key={tip.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                onClick={() => setSelectedTip(tip)}
              >
                {/* 썸네일 */}
                {thumbnailUrl ? (
                  <div
                    className="relative w-full aspect-video bg-gray-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${thumbnailUrl})` }}
                  >
                    {tip.linkType === "youtube" && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                        <Youtube className="w-3 h-3" />
                        YouTube
                      </div>
                    )}
                    {tip.linkType === "blog" && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Blog
                      </div>
                    )}
                    {tip.subCategory && (
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${category.color.badge}`}>
                        {tip.subCategory}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full aspect-video bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex flex-col items-center justify-center">
                    {tip.linkType === "youtube" ? (
                      <>
                        <Youtube className="w-16 h-16 text-yellow-400 mb-2" />
                        <span className="text-sm text-yellow-700 font-medium">YouTube</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-16 h-16 text-blue-400 mb-2" />
                        <span className="text-sm text-blue-700 font-medium">Blog</span>
                      </>
                    )}
                    {tip.subCategory && (
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${category.color.badge}`}>
                        {tip.subCategory}
                      </div>
                    )}
                  </div>
                )}

                <CardContent className="p-4">
                  <h3 className="font-bold text-base text-gray-900 line-clamp-2 mb-2 hover:text-yellow-600 transition-colors">
                    {tip.title}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {tip.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                    <span>{formatDate(tip.createdAt)}</span>
                    <span className="text-yellow-600 font-medium">자세히 보기 →</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 콘텐츠 팁 상세 모달 */}
      <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTip && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {selectedTip.linkType === "youtube" ? (
                    <Youtube className="w-6 h-6 text-red-600" />
                  ) : (
                    <Globe className="w-6 h-6 text-blue-600" />
                  )}
                  {selectedTip.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 flex items-center gap-2">
                  {selectedTip.subCategory && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${category.color.badge}`}>
                      {selectedTip.subCategory}
                    </span>
                  )}
                  <span>{selectedTip.authorName} · {formatDate(selectedTip.createdAt)}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedTip.description}
                  </p>
                </div>

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

                {selectedTip.linkType === "blog" && selectedTip.thumbnailUrl && (
                  <div
                    className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-gray-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${selectedTip.thumbnailUrl})` }}
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
                  <ExternalLink className="w-4 h-4 mr-2" />
                  새 창에서 열기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
