"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Bell, BellOff, Settings, X, ArrowLeft, Youtube, CreditCard, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Image from "next/image";

type Announcement = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  imageUrl: string | null;
  youtubeUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function UserAnnouncementsPage() {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchUserSettings();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements");
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

  const fetchUserSettings = async () => {
    try {
      const user = (session?.user as any);
      if (user?.공지사항이메일수신 !== undefined) {
        setEmailEnabled(user.공지사항이메일수신);
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
          공지사항이메일수신: !emailEnabled,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setEmailEnabled(!emailEnabled);
        alert(
          emailEnabled
            ? "이메일 수신을 해제했습니다"
            : "이메일 수신을 설정했습니다"
        );
        setIsSettingsOpen(false);
        // 세션 새로고침
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
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 animate-pulse">로딩 중...</div>
      </div>
    );
  }

  // 상세보기 모드
  if (selectedAnnouncement) {
    const youtubeId = selectedAnnouncement.youtubeUrl
      ? extractYoutubeId(selectedAnnouncement.youtubeUrl)
      : null;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => setSelectedAnnouncement(null)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </Button>

        <Card>
          <CardContent className="p-6 md:p-8">
            {/* 제목 */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              {selectedAnnouncement.title}
            </h1>

            {/* 메타 정보 */}
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-6 pb-6 border-b">
              <span>작성자: {selectedAnnouncement.authorName}</span>
              <span>•</span>
              <span>{formatDate(selectedAnnouncement.createdAt)}</span>
            </div>

            {/* 대표 이미지 */}
            {selectedAnnouncement.imageUrl && (
              <div className="relative w-full mb-6 rounded-lg overflow-hidden">
                <Image
                  src={selectedAnnouncement.imageUrl}
                  alt={selectedAnnouncement.title}
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* 내용 */}
            <div className="prose prose-lg max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content}
              </p>
            </div>

            {/* 유튜브 영상 */}
            {youtubeId && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Youtube className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    관련 영상
                  </h3>
                </div>
                <div className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-gray-100">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 목록 모드
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-red-600" />
            마케팅 소식
          </h1>
          <p className="text-gray-600 mt-2">
            스타트패키지 및 마케팅 관련 최신 소식을 확인하세요
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          알림 설정
        </Button>
      </div>

      {/* 이메일 수신 상태 배너 */}
      <Card
        className={
          emailEnabled
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
            : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
        }
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {emailEnabled ? (
                <Bell className="w-5 h-5 text-green-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {emailEnabled
                    ? "이메일 알림이 활성화되어 있습니다"
                    : "이메일 알림이 비활성화되어 있습니다"}
                </p>
                <p className="text-sm text-gray-600">
                  {emailEnabled
                    ? "새로운 마케팅 소식을 이메일로 받아보실 수 있습니다"
                    : "새로운 소식을 이메일로 받지 않습니다"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              변경
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 네이버 검색광고 충전 안내 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                💳 네이버 검색광고 충전 안내
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                네이버 검색광고를 사용하시려면 광고비를 충전해주세요
              </p>
              <div className="space-y-3">
                <a
                  href="https://manage.searchad.naver.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    네이버 검색광고 충전하기
                  </Button>
                </a>
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <strong>💡 충전 방법:</strong> 위 버튼을 클릭하여 네이버 검색광고 관리 페이지로 이동 → <strong>충전하기</strong> 버튼 클릭
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 게시판 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                아직 작성된 공지사항이 없습니다
              </CardContent>
            </Card>
          </div>
        ) : (
          announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              onClick={() => setSelectedAnnouncement(announcement)}
            >
              {/* 썸네일 이미지 */}
              {announcement.imageUrl ? (
                <div className="relative w-full aspect-square bg-gray-100">
                  <Image
                    src={announcement.imageUrl}
                    alt={announcement.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center">
                  <Megaphone className="w-16 h-16 text-red-300" />
                </div>
              )}

              <CardContent className="p-4">
                {/* 제목 */}
                <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-2 hover:text-red-600 transition-colors">
                  {announcement.title}
                </h3>

                {/* 내용 미리보기 */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                  {announcement.content}
                </p>

                {/* 유튜브 태그 */}
                {announcement.youtubeUrl && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium mb-3">
                    <Youtube className="w-3 h-3" />
                    영상 포함
                  </div>
                )}

                {/* 날짜 */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                  <span>{formatDate(announcement.createdAt)}</span>
                  <span className="text-red-600 font-medium">자세히 보기 →</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 설정 다이얼로그 */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이메일 알림 설정</DialogTitle>
            <DialogDescription>
              마케팅 소식 이메일 수신 여부를 설정할 수 있습니다
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
              {emailEnabled ? (
                <Bell className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
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
                    ? "새로운 마케팅 소식이 작성되면 이메일로 알림을 받습니다"
                    : "새로운 마케팅 소식 알림을 받지 않습니다"}
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
                  : "bg-green-600 hover:bg-green-700"
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
    </div>
  );
}
