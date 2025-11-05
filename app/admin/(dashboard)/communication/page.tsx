"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Send,
  Paperclip,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  XCircle,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { ImageModal } from "@/components/ui/image-modal";
import Image from "next/image";

interface CommunicationThread {
  id: string;
  title: string;
  category: string;
  status: string;
  lastReplyAt: string;
  createdAt: string;
  expectedCompletionDate: string | null;
  user: {
    id: string;
    이름: string;
    email: string;
    연락처: string;
    cohort: { name: string } | null;
  };
  messages: CommunicationMessage[];
  _count: {
    messages: number;
  };
}

interface CommunicationMessage {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  attachments: string[];
  createdAt: string;
  expectedCompletionDate: string | null;
  isReadByUser: boolean;
  readByUserAt: string | null;
  isReadByAdmin: boolean;
  readByAdminAt: string | null;
}

export default function AdminCommunicationPage() {
  const [threads, setThreads] = useState<CommunicationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<CommunicationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [replyContent, setReplyContent] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [expectedDate, setExpectedDate] = useState<Date>();
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // 이미지 모달 상태
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  // 상대 시간 표시 함수
  const getRelativeTime = (date: string): string => {
    const now = new Date();
    const targetDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

    if (diffInSeconds < 60) return "방금 전";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;

    return format(targetDate, "M월 d일 HH:mm", { locale: ko });
  };

  // 날짜별 메시지 그룹핑
  const groupMessagesByDate = (messages: CommunicationMessage[]) => {
    const groups: Array<{ type: "date"; date: string } | { type: "message"; data: CommunicationMessage; index: number }> = [];
    let currentDate: string | null = null;

    messages.forEach((message, index) => {
      const messageDate = format(new Date(message.createdAt), "yyyy-MM-dd", { locale: ko });

      if (messageDate !== currentDate) {
        groups.push({ type: "date", date: messageDate });
        currentDate = messageDate;
      }

      groups.push({ type: "message", data: message, index });
    });

    return groups;
  };

  // 연속 메시지 체크
  const isConsecutiveMessage = (currentMsg: CommunicationMessage, prevMsg: CommunicationMessage | null): boolean => {
    if (!prevMsg) return false;

    const sameAuthor = currentMsg.authorType === prevMsg.authorType;
    const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    const withinFiveMinutes = timeDiff < 5 * 60 * 1000;

    return sameAuthor && withinFiveMinutes;
  };

  const fetchThreads = async (keepSelectedThreadId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);

      const response = await fetch(`/api/admin/communication/threads?${params}`);
      const data = await response.json();

      if (response.ok) {
        setThreads(data);
        // 선택된 스레드 업데이트 (keepSelectedThreadId가 있으면 우선 사용)
        const threadIdToKeep = keepSelectedThreadId || selectedThread?.id;
        if (threadIdToKeep) {
          const updated = data.find((t: CommunicationThread) => t.id === threadIdToKeep);
          if (updated) setSelectedThread(updated);
        }
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자별로 스레드 그룹핑
  const groupThreadsByUser = () => {
    const grouped = threads.reduce((acc, thread) => {
      const userId = thread.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: thread.user,
          threads: [],
          unreadCount: 0,
        };
      }
      acc[userId].threads.push(thread);

      // 미확인 메시지 개수 계산
      const unreadMessages = thread.messages.filter(
        (msg) => msg.authorType === "user" && !msg.isReadByAdmin
      ).length;
      acc[userId].unreadCount += unreadMessages;

      return acc;
    }, {} as Record<string, { user: CommunicationThread["user"]; threads: CommunicationThread[]; unreadCount: number }>);

    // 배열로 변환하고 정렬 (미확인 메시지 있는 사용자 우선)
    return Object.values(grouped).sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount; // 미확인 많은 순
      }
      // 최신 답글 순
      const aLastReply = Math.max(...a.threads.map(t => new Date(t.lastReplyAt).getTime()));
      const bLastReply = Math.max(...b.threads.map(t => new Date(t.lastReplyAt).getTime()));
      return bLastReply - aLastReply;
    });
  };

  useEffect(() => {
    fetchThreads();
  }, [statusFilter, categoryFilter]);

  const handleStatusChange = async (threadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/communication/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchThreads();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.\n영상 및 기타 파일은 mkt@polarad.co.kr로 메일 발송 부탁드립니다.");
      return;
    }

    // 10MB 제한 (서버에서 자동으로 WebP로 압축됨)
    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.\n더 큰 파일은 mkt@polarad.co.kr로 메일 발송 부탁드립니다.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/communication/upload", {
        method: "POST",
        body: formData,
      });

      // 413 에러 등 JSON이 아닌 응답 처리
      if (!response.ok) {
        if (response.status === 413) {
          alert("파일이 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.\n더 큰 파일은 mkt@polarad.co.kr로 메일 발송 부탁드립니다.");
          return;
        }

        let errorMessage = "업로드 실패";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `업로드 실패 (${response.status})`;
        }
        alert(errorMessage);
        return;
      }

      const data = await response.json();
      setReplyAttachments([...replyAttachments, data.url]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 중 오류가 발생했습니다.\n네트워크 연결을 확인해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) return;

    setSending(true);
    try {
      const response = await fetch("/api/admin/communication/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          content: replyContent,
          attachments: replyAttachments,
          expectedCompletionDate: expectedDate?.toISOString(),
        }),
      });

      if (response.ok) {
        setReplyContent("");
        setReplyAttachments([]);
        setExpectedDate(undefined);
        fetchThreads();
      } else {
        alert("답글 전송 실패");
      }
    } catch (error) {
      console.error("Send reply error:", error);
      alert("답글 전송 중 오류가 발생했습니다");
    } finally {
      setSending(false);
    }
  };

  const handleSelectThread = async (thread: CommunicationThread) => {
    setSelectedThread(thread);

    // 관리자가 스레드를 열면 사용자 메시지를 읽음 처리
    try {
      await fetch("/api/admin/communication/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id }),
      });

      // 읽음 처리 후 스레드 목록 새로고침 (현재 선택한 스레드 ID 유지)
      fetchThreads(thread.id);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm("정말 이 스레드를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/communication/threads/${threadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("스레드가 삭제되었습니다");
        if (selectedThread?.id === threadId) {
          setSelectedThread(null);
        }
        fetchThreads();
      } else {
        alert("스레드 삭제 실패");
      }
    } catch (error) {
      console.error("Delete thread error:", error);
      alert("스레드 삭제 중 오류가 발생했습니다");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            대기중
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            진행중
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            완료
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">커뮤니케이션</h1>
          <p className="text-gray-600 mt-2">사용자 문의 및 답변 관리</p>
        </div>
        <MessageSquare className="w-8 h-8 text-red-600" />
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-blue-900">문의 안내사항</p>
          <ul className="space-y-1 mt-2">
            <li>• 문의 사항은 영업일 기준 1일 이내 답변드립니다.</li>
            <li>• 주말은 업무 처리가 어려우며, 평일 기준으로 처리됩니다.</li>
            <li>• 긴급사항(홈페이지 사용불가, 광고계정 정지 등) 외에는 반드시 본 게시판을 이용해 주시기 바랍니다.</li>
            <li>• 문의사항 메일 접수: <a href="mailto:mkt@polarad.co.kr" className="text-blue-600 underline font-medium">mkt@polarad.co.kr</a></li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 스레드 목록 - 모바일: 선택된 스레드가 있으면 숨김 */}
        <Card className={`border-gray-200 bg-white lg:col-span-1 overflow-hidden flex flex-col shadow-sm ${selectedThread ? 'hidden lg:flex' : 'flex'} h-[60vh] lg:h-[calc(100vh-200px)]`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 text-lg">문의 목록</CardTitle>
            <div className="flex gap-2 mt-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="open">대기중</SelectItem>
                  <SelectItem value="in_progress">진행중</SelectItem>
                  <SelectItem value="resolved">완료</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  <SelectItem value="홈페이지">홈페이지</SelectItem>
                  <SelectItem value="로고">로고</SelectItem>
                  <SelectItem value="인쇄물">인쇄물</SelectItem>
                  <SelectItem value="일반">일반</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-500">로딩 중...</p>
            ) : threads.length === 0 ? (
              <p className="text-center text-gray-500">문의가 없습니다</p>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {groupThreadsByUser().map((userGroup) => {
                  const hasUnread = userGroup.unreadCount > 0;

                  return (
                    <AccordionItem
                      key={userGroup.user.id}
                      value={userGroup.user.id}
                      className={`rounded-lg overflow-hidden transition-all ${
                        hasUnread
                          ? "border-2 border-red-500 bg-red-50 shadow-lg"
                          : "border border-gray-200 bg-white"
                      }`}
                    >
                      <AccordionTrigger className={`px-4 py-3 hover:no-underline ${
                        hasUnread ? "hover:bg-red-100" : "hover:bg-gray-50"
                      }`}>
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {hasUnread && (
                                <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />
                              )}
                              <span className={`text-sm font-semibold ${
                                hasUnread ? "text-red-900" : "text-gray-900"
                              }`}>
                                {userGroup.user.이름}
                              </span>
                              {userGroup.user.cohort && (
                                <Badge variant="outline" className={`text-xs ${
                                  hasUnread
                                    ? "border-red-400 text-red-700 bg-red-100"
                                    : "border-gray-300 text-gray-600"
                                }`}>
                                  {userGroup.user.cohort.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${
                                hasUnread ? "text-red-700 font-medium" : "text-gray-500"
                              }`}>
                                {userGroup.threads.length}개 스레드
                              </span>
                              {hasUnread && (
                                <Badge className="bg-red-600 text-white text-sm font-bold px-3 py-1 animate-pulse">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {userGroup.unreadCount}개 미확인
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      <div className="space-y-2">
                        {userGroup.threads.map((thread) => {
                          const threadUnreadCount = thread.messages.filter(
                            (msg) => msg.authorType === "user" && !msg.isReadByAdmin
                          ).length;

                          const hasThreadUnread = threadUnreadCount > 0;

                          return (
                            <div
                              key={thread.id}
                              className={`p-3 rounded-lg transition-all border cursor-pointer ${
                                selectedThread?.id === thread.id
                                  ? "bg-red-50 border-red-300"
                                  : hasThreadUnread
                                  ? "bg-red-100 border-red-400 hover:bg-red-200 shadow-md"
                                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                              }`}
                              onClick={() => handleSelectThread(thread)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {hasThreadUnread && (
                                      <div className="flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>{threadUnreadCount}개 미확인</span>
                                      </div>
                                    )}
                                    <Badge variant="outline" className={`text-xs ${
                                      hasThreadUnread
                                        ? "border-red-600 text-red-800 bg-red-50"
                                        : "border-gray-300 text-gray-600"
                                    }`}>
                                      {thread.category}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-900 font-medium truncate">
                                    {thread.title}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(thread.status)}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteThread(thread.id);
                                    }}
                                    className="p-1.5 hover:bg-red-100 rounded-md transition-colors text-red-600"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{thread._count.messages}개 메시지</span>
                                <span>{formatTime(thread.lastReplyAt)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* 대화 내용 - 모바일: 스레드 선택 시에만 표시 */}
        <Card className={`border-gray-200 bg-white lg:col-span-2 overflow-hidden flex flex-col shadow-sm ${selectedThread ? 'flex' : 'hidden lg:flex'} h-[80vh] lg:h-[calc(100vh-200px)]`}>
          {selectedThread ? (
            <>
              <CardHeader className="pb-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    {/* 모바일 뒤로가기 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedThread(null)}
                      className="lg:hidden mb-2 -ml-2"
                    >
                      ← 목록으로
                    </Button>
                    <CardTitle className="text-gray-900 text-xl mb-2">{selectedThread.title}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {selectedThread.user.이름}
                      </span>
                      {selectedThread.user.cohort && (
                        <span>{selectedThread.user.cohort.name}</span>
                      )}
                      <span>{selectedThread.user.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedThread.status)}
                    <Select
                      value={selectedThread.status}
                      onValueChange={(value) => handleStatusChange(selectedThread.id, value)}
                    >
                      <SelectTrigger className="w-32 bg-gray-50 border-gray-200 text-gray-900 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="open">대기중</SelectItem>
                        <SelectItem value="in_progress">진행중</SelectItem>
                        <SelectItem value="resolved">완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* 메시지 목록 - 모바일 패딩 최적화 */}
              <CardContent className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-gray-50">
                {groupMessagesByDate(selectedThread.messages).map((item, groupIndex) => {
                  if (item.type === "date") {
                    return (
                      <div key={`date-${groupIndex}`} className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="text-xs text-gray-600 font-semibold px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                          {format(new Date(item.date), "yyyy년 M월 d일 EEEE", { locale: ko })}
                        </span>
                        <div className="flex-1 h-px bg-gray-300" />
                      </div>
                    );
                  }

                  const message = item.data;
                  const prevMessage = item.index > 0 ? selectedThread.messages[item.index - 1] : null;
                  const isConsecutive = isConsecutiveMessage(message, prevMessage);

                  return (
                    <div key={message.id}>
                      <div
                        className={`flex ${message.authorType === "admin" ? "justify-end" : "justify-start"} ${
                          isConsecutive ? "mt-1" : "mt-4"
                        }`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[80%]`}>
                          {/* 작성자 정보 (연속 메시지가 아닐 때만 표시) */}
                          {!isConsecutive && (
                            <div className={`flex items-center gap-2 mb-1 ${message.authorType === "admin" ? "justify-end" : ""}`}>
                              <span className="text-xs font-semibold text-gray-700">
                                {message.authorName}
                              </span>
                              {message.authorType === "admin" && (
                                <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] py-0 px-2">
                                  관리자
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {format(new Date(message.createdAt), "HH:mm", { locale: ko })}
                              </span>
                            </div>
                          )}

                          {/* 메시지 버블 */}
                          <div
                            className={`rounded-lg p-4 ${
                              message.authorType === "admin"
                                ? "bg-red-50 border border-red-200"
                                : "bg-white border border-gray-200"
                            } ${isConsecutive ? "shadow-sm" : "shadow-md"}`}
                          >
                            <p className="text-gray-900 whitespace-pre-wrap text-sm">{message.content}</p>
                            {message.attachments.length > 0 && (
                              <div className="space-y-2 mt-3">
                                {message.attachments.map((url, idx) => (
                                  <div key={idx} className="relative w-full cursor-pointer" onClick={() => {
                                    setModalImages(message.attachments);
                                    setModalInitialIndex(idx);
                                    setImageModalOpen(true);
                                  }}>
                                    <Image
                                      src={url}
                                      alt="첨부 이미지"
                                      width={800}
                                      height={600}
                                      className="rounded-lg max-w-full h-auto border border-gray-200 hover:opacity-90 transition-opacity"
                                      unoptimized
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.authorType === "admin" && message.expectedCompletionDate && (
                              <div className="flex items-center gap-1 text-sm text-blue-600 mt-3 bg-blue-50 px-3 py-1.5 rounded-full inline-flex w-fit">
                                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap font-medium">완료 예상일: {format(new Date(message.expectedCompletionDate), "yyyy년 M월 d일", { locale: ko })}</span>
                              </div>
                            )}
                            {/* 연속 메시지일 때는 상대 시간 표시 */}
                            {isConsecutive && (
                              <p className="text-[10px] mt-2 text-gray-400">
                                {getRelativeTime(message.createdAt)}
                              </p>
                            )}
                            {/* 읽음 상태 표시 */}
                            {message.authorType === "admin" && message.isReadByUser && message.readByUserAt && (
                              <p className="text-[10px] mt-1 text-blue-500">
                                읽음 · {format(new Date(message.readByUserAt), "M월 d일 HH:mm", { locale: ko })}
                              </p>
                            )}
                            {message.authorType === "user" && message.isReadByAdmin && message.readByAdminAt && (
                              <p className="text-[10px] mt-1 text-green-600">
                                읽음 · {format(new Date(message.readByAdminAt), "M월 d일 HH:mm", { locale: ko })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>

              {/* 답글 작성 - 모바일 최적화 */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                <div className="space-y-3">
                  {replyAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {replyAttachments.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20">
                          <Image
                            src={url}
                            alt="첨부"
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded border border-gray-200"
                            unoptimized
                          />
                          <button
                            onClick={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            aria-label="첨부 이미지 삭제"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="답글을 입력하세요..."
                    className="bg-white border-gray-200 text-gray-900 resize-none min-h-[100px] text-base"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={`border-gray-200 min-h-[44px] ${expectedDate ? "text-gray-900" : "text-gray-500"}`}
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">{expectedDate ? format(expectedDate, "PPP", { locale: ko }) : "완료 예상일 선택"}</span>
                          <span className="sm:hidden">{expectedDate ? format(expectedDate, "yy.MM.dd", { locale: ko }) : "예상일"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={expectedDate}
                          onSelect={setExpectedDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                    {expectedDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpectedDate(undefined)}
                        className="text-gray-500 hover:text-gray-700 min-h-[44px]"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <input
                        type="file"
                        id="admin-reply-file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = "";
                        }}
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="border-gray-200 text-gray-600 w-full sm:w-auto min-h-[44px]"
                        disabled={uploading}
                        onClick={() => document.getElementById("admin-reply-file")?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {uploading ? "업로드 중..." : "이미지 첨부"}
                      </Button>
                      <span className="text-xs text-gray-500 hidden sm:inline">10MB 이하, 이미지만 가능</span>
                    </div>
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyContent.trim() || sending}
                      className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto min-h-[44px]"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? "전송 중..." : "전송"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>문의를 선택하세요</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

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
