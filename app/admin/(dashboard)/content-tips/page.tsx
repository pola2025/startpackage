"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Lightbulb,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Youtube,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function AdminContentTipsPage() {
  const [tips, setTips] = useState<ContentTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<ContentTip | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    linkType: "youtube" as "youtube" | "blog",
    linkUrl: "",
    thumbnailUrl: "",
    category: "instagram" as CategoryId,
    subCategory: "",
    published: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const res = await fetch("/api/admin/content-tips");
      const data = await res.json();
      if (data.tips) {
        setTips(data.tips);
      }
    } catch (error) {
      console.error("콘텐츠 팁 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tip?: ContentTip) => {
    if (tip) {
      setEditingTip(tip);
      setFormData({
        title: tip.title,
        description: tip.description,
        linkType: tip.linkType as "youtube" | "blog",
        linkUrl: tip.linkUrl,
        thumbnailUrl: tip.thumbnailUrl || "",
        category: tip.category,
        subCategory: tip.subCategory || "",
        published: tip.published,
      });
    } else {
      setEditingTip(null);
      setFormData({
        title: "",
        description: "",
        linkType: "youtube",
        linkUrl: "",
        thumbnailUrl: "",
        category: "instagram",
        subCategory: "",
        published: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTip(null);
    setFormData({
      title: "",
      description: "",
      linkType: "youtube",
      linkUrl: "",
      thumbnailUrl: "",
      category: "instagram",
      subCategory: "",
      published: true,
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.linkUrl || !formData.category) {
      alert("제목, 설명, 링크, 카테고리는 필수 항목입니다");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingTip
        ? `/api/admin/content-tips/${editingTip.id}`
        : "/api/admin/content-tips";
      const method = editingTip ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          thumbnailUrl: formData.thumbnailUrl || null,
          subCategory: formData.subCategory || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(editingTip ? "수정되었습니다" : "등록되었습니다");
        handleCloseDialog();
        fetchTips();
      } else {
        alert(data.error || "저장 실패");
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/admin/content-tips/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("삭제되었습니다");
        fetchTips();
      } else {
        alert(data.error || "삭제 실패");
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다");
    }
  };

  const handleTogglePublished = async (tip: ContentTip) => {
    try {
      const res = await fetch(`/api/admin/content-tips/${tip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          published: !tip.published,
        }),
      });

      const data = await res.json();

      if (data.success) {
        fetchTips();
      } else {
        alert(data.error || "변경 실패");
      }
    } catch (error) {
      console.error("발행 상태 변경 실패:", error);
      alert("변경 중 오류가 발생했습니다");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              콘텐츠 제작 Tip 관리
            </CardTitle>
            <Button onClick={() => handleOpenDialog()} className="self-start sm:self-auto text-xs sm:text-sm h-8 sm:h-10">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">새 콘텐츠 팁 등록</span>
              <span className="sm:hidden">등록</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">타입</th>
                  <th className="text-left p-3 font-semibold">카테고리</th>
                  <th className="text-left p-3 font-semibold">제목</th>
                  <th className="text-left p-3 font-semibold">설명</th>
                  <th className="text-left p-3 font-semibold">링크</th>
                  <th className="text-left p-3 font-semibold">작성자</th>
                  <th className="text-left p-3 font-semibold">작성일</th>
                  <th className="text-left p-3 font-semibold">상태</th>
                  <th className="text-left p-3 font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {tips.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      등록된 콘텐츠 팁이 없습니다
                    </td>
                  </tr>
                ) : (
                  tips.map((tip) => (
                    <tr key={tip.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {tip.linkType === "youtube" ? (
                            <Youtube className="w-4 h-4 text-red-600" />
                          ) : (
                            <Globe className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium">
                            {tip.linkType === "youtube" ? "유튜브" : "블로그"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{CATEGORIES[tip.category].icon}</span>
                            <span className="text-sm font-medium">
                              {CATEGORIES[tip.category].name}
                            </span>
                          </div>
                          {tip.subCategory && (
                            <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${CATEGORIES[tip.category].color.badge}`}>
                              {tip.subCategory}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium">{tip.title}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {tip.description}
                        </span>
                      </td>
                      <td className="p-3">
                        <a
                          href={tip.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="text-sm">링크</span>
                        </a>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {tip.authorName}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {formatDate(tip.createdAt)}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublished(tip)}
                        >
                          {tip.published ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(tip)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tip.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTip ? "콘텐츠 팁 수정" : "새 콘텐츠 팁 등록"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 링크 타입 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                링크 타입 *
              </label>
              <Select
                value={formData.linkType}
                onValueChange={(value: "youtube" | "blog") =>
                  setFormData({ ...formData, linkType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      <span>유튜브</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="blog">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>블로그</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                카테고리 *
              </label>
              <Select
                value={formData.category}
                onValueChange={(value: CategoryId) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 서브 카테고리 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                서브 카테고리 (선택)
              </label>
              <Input
                value={formData.subCategory}
                onChange={(e) =>
                  setFormData({ ...formData, subCategory: e.target.value })
                }
                placeholder="예: 릴스, 피드, 스토리 등"
              />
              <p className="text-xs text-gray-500 mt-1">
                콘텐츠에 뱃지 형태로 표시됩니다
              </p>
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                제목 *
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="콘텐츠 제작 팁 제목을 입력하세요"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                설명 *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="간략한 설명을 입력하세요"
                rows={4}
              />
            </div>

            {/* 링크 URL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                링크 URL *
              </label>
              <Input
                type="url"
                value={formData.linkUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkUrl: e.target.value })
                }
                placeholder={
                  formData.linkType === "youtube"
                    ? "https://youtube.com/watch?v=..."
                    : "https://blog.example.com/..."
                }
              />
            </div>

            {/* 썸네일 URL (선택) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                썸네일 URL (선택)
              </label>
              <Input
                type="url"
                value={formData.thumbnailUrl}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnailUrl: e.target.value })
                }
                placeholder="썸네일 이미지 URL (비워두면 기본 이미지 사용)"
              />
              {formData.thumbnailUrl && (
                <div className="mt-2">
                  <img
                    src={formData.thumbnailUrl}
                    alt="썸네일 미리보기"
                    className="w-full h-48 object-cover rounded"
                  />
                </div>
              )}
            </div>

            {/* 발행 상태 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) =>
                  setFormData({ ...formData, published: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="published" className="text-sm font-medium">
                즉시 발행
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "저장 중..." : editingTip ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
