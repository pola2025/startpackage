"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Image from "next/image";

type Announcement = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  imageUrls: string[];
  youtubeUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrls: [] as string[],
    youtubeUrl: "",
    published: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error("공지사항 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        imageUrls: announcement.imageUrls || [],
        youtubeUrl: announcement.youtubeUrl || "",
        published: announcement.published,
      });
      setImagePreviews(announcement.imageUrls || []);
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: "",
        content: "",
        imageUrls: [],
        youtubeUrl: "",
        published: true,
      });
      setImagePreviews([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({
      title: "",
      content: "",
      imageUrls: [],
      youtubeUrl: "",
      published: true,
    });
    setImagePreviews([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 여러 파일 업로드 지원
    const fileArray = Array.from(files);

    // 각 파일 크기 체크 (10MB)
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} 파일 크기는 10MB 이하여야 합니다`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploadPromises = fileArray.map(async (file) => {
        const formDataToUpload = new FormData();
        formDataToUpload.append("file", file);

        const res = await fetch("/api/announcements/upload", {
          method: "POST",
          body: formDataToUpload,
        });

        const data = await res.json();

        if (data.success) {
          return data.url;
        } else {
          throw new Error(data.error || "이미지 업로드 실패");
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedUrls],
      }));
      setImagePreviews((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      alert("이미지 업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("제목과 내용을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : "/api/admin/announcements";

      const method = editingAnnouncement ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          youtubeUrl: formData.youtubeUrl || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(
          editingAnnouncement
            ? "공지사항이 수정되었습니다"
            : "공지사항이 작성되었습니다"
        );
        handleCloseDialog();
        fetchAnnouncements();
      } else {
        alert(data.error || "작업 실패");
      }
    } catch (error) {
      console.error("공지사항 작성/수정 실패:", error);
      alert("작업 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("공지사항이 삭제되었습니다");
        fetchAnnouncements();
      } else {
        alert(data.error || "삭제 실패");
      }
    } catch (error) {
      console.error("공지사항 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다");
    }
  };

  const togglePublished = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !announcement.published }),
      });

      const data = await res.json();

      if (data.success) {
        fetchAnnouncements();
      } else {
        alert(data.error || "상태 변경 실패");
      }
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Megaphone className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-navy-900" />
            마케팅 소식 관리
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            사용자에게 전달할 마케팅 소식 및 공지사항을 작성하고 관리합니다
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-navy-900 hover:bg-navy-800 self-start sm:self-auto text-xs sm:text-sm h-8 sm:h-10"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">새 공지 작성</span>
          <span className="sm:hidden">새 공지</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지사항 목록 ({announcements.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              작성된 공지사항이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* 썸네일 이미지 */}
                  {announcement.imageUrls && announcement.imageUrls.length > 0 ? (
                    <div className="relative w-full aspect-square bg-gray-100">
                      <Image
                        src={announcement.imageUrls[0]}
                        alt={announcement.title}
                        fill
                        className="object-cover"
                      />
                      {announcement.imageUrls.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                          +{announcement.imageUrls.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}

                  {/* 내용 */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                        {announcement.title}
                      </h3>
                      {announcement.published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex-shrink-0">
                          <Eye className="w-3 h-3" />
                          발행
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium flex-shrink-0">
                          <EyeOff className="w-3 h-3" />
                          비공개
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                      {announcement.content}
                    </p>

                    {announcement.youtubeUrl && (
                      <div className="text-xs text-red-600 font-medium mb-3">
                        📺 유튜브 영상 포함
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-3">
                      {announcement.authorName} |{" "}
                      {formatDate(announcement.createdAt)}
                    </div>

                    {/* 버튼 */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublished(announcement)}
                        className="flex-1"
                        title={
                          announcement.published
                            ? "비공개로 전환"
                            : "발행하기"
                        }
                      >
                        {announcement.published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(announcement)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        className="text-red-600 hover:bg-red-50 flex-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 작성/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "공지사항 수정" : "새 공지사항 작성"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="공지사항 제목을 입력하세요"
              />
            </div>

            {/* 이미지 업로드 (여러 이미지 지원) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이미지 ({imagePreviews.length}개)
              </label>

              {/* 이미지 미리보기 그리드 */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  {imagePreviews.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group"
                    >
                      <Image
                        src={url}
                        alt={`이미지 ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 이미지 업로드 버튼 */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  {uploading ? (
                    <div className="text-gray-500">업로드 중...</div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        클릭하여 이미지 추가 (여러 개 선택 가능)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WEBP (최대 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="공지사항 내용을 입력하세요"
                rows={10}
              />
            </div>

            {/* 유튜브 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                유튜브 링크 (선택사항)
              </label>
              <Input
                value={formData.youtubeUrl}
                onChange={(e) =>
                  setFormData({ ...formData, youtubeUrl: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
                type="url"
              />
              <p className="text-xs text-gray-500 mt-1">
                참고할 유튜브 영상이 있다면 링크를 추가하세요
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) =>
                  setFormData({ ...formData, published: e.target.checked })
                }
                className="w-4 h-4 text-navy-900 border-gray-300 rounded focus:ring-gold-500"
              />
              <label htmlFor="published" className="text-sm text-gray-700">
                즉시 발행 (체크하면 사용자에게 이메일 발송)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={submitting || uploading}
            >
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="bg-navy-900 hover:bg-navy-800"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting
                ? "처리 중..."
                : editingAnnouncement
                ? "수정 완료"
                : "작성 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
