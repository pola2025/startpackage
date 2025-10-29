"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Paperclip,
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";

import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface CommunicationThread {
  id: string;
  title: string;
  category: string;
  status: string;
  lastReplyAt: string;
  createdAt: string;
  expectedCompletionDate: string | null;
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
}

export default function UserCommunicationPage() {
  const [threads, setThreads] = useState<CommunicationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<CommunicationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [newThreadOpen, setNewThreadOpen] = useState(false);

  // 새 스레드 작성
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("일반");
  const [newContent, setNewContent] = useState("");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // 답글 작성
  const [replyContent, setReplyContent] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/communication/threads");
      const data = await response.json();

      if (response.ok) {
        setThreads(data);
        // 선택된 스레드 업데이트
        if (selectedThread) {
          const response = await fetch(`/api/communication/threads/${selectedThread.id}`);
          if (response.ok) {
            const updated = await response.json();
            setSelectedThread(updated);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setLoading(false);
    }
  };

  // 스레드 선택 시 읽음 처리
  const handleSelectThread = async (thread: CommunicationThread) => {
    setSelectedThread(thread);

    // 읽음 처리
    try {
      await fetch("/api/communication/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id }),
      });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  useEffect(() => {
    fetchThreads();

    // ✅ SSE 연결로 실시간 스레드 업데이트
    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "new_message") {
          console.log("📩 새 메시지 도착, 스레드 목록 새로고침");
          fetchThreads(); // 스레드 목록 자동 새로고침
        }
      } catch (error) {
        console.error("SSE 메시지 파싱 실패:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ SSE 연결 오류:", error);
      eventSource.close();
    };

    return () => {
      console.log("🔌 문의하기 페이지 SSE 연결 종료");
      eventSource.close();
    };
  }, []);

  const handleImageUpload = async (file: File, isNewThread: boolean = false) => {
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
      if (isNewThread) {
        setNewAttachments([...newAttachments, data.url]);
      } else {
        setReplyAttachments([...replyAttachments, data.url]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 중 오류가 발생했습니다.\n네트워크 연결을 확인해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert("제목과 내용을 입력해주세요");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/communication/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent,
          attachments: newAttachments,
        }),
      });

      if (response.ok) {
        setNewTitle("");
        setNewCategory("일반");
        setNewContent("");
        setNewAttachments([]);
        setNewThreadOpen(false);
        fetchThreads();
      } else {
        alert("문의 등록 실패");
      }
    } catch (error) {
      console.error("Create thread error:", error);
      alert("문의 등록 중 오류가 발생했습니다");
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) return;

    setSending(true);
    try {
      const response = await fetch("/api/communication/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread.id,
          content: replyContent,
          attachments: replyAttachments,
        }),
      });

      if (response.ok) {
        setReplyContent("");
        setReplyAttachments([]);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            대기중
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            진행중
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
          <p className="text-gray-600 mt-2">관리자와 1:1 문의 및 답변</p>
        </div>
        <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              새 문의 작성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>새 문의 작성</DialogTitle>
              <DialogDescription>
                문의 내용을 작성하시면 관리자가 확인 후 답변드립니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="문의 제목을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="홈페이지">홈페이지</SelectItem>
                    <SelectItem value="로고">로고</SelectItem>
                    <SelectItem value="인쇄물">인쇄물</SelectItem>
                    <SelectItem value="일반">일반</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="문의 내용을 입력하세요"
                  rows={6}
                  className="resize-none"
                />
              </div>
              {newAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newAttachments.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="첨부" className="w-20 h-20 object-cover rounded border" />
                      <button
                        onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="new-thread-file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, true);
                    e.target.value = "";
                  }}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById("new-thread-file")?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  {uploading ? "업로드 중..." : "이미지 첨부"}
                </Button>
                <p className="text-xs text-gray-500 mt-1">10MB 이하, 이미지만 가능 (자동 압축) | 영상/기타 파일: mkt@polarad.co.kr</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewThreadOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreateThread} disabled={creating || !newTitle.trim() || !newContent.trim()}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {creating ? "등록 중..." : "등록"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
        {/* 스레드 목록 */}
        <Card className="lg:col-span-1 h-[calc(100vh-250px)] flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">내 문의 목록</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-500">로딩 중...</p>
            ) : threads.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">문의 내역이 없습니다</p>
                <p className="text-sm text-gray-400">새 문의를 작성해보세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                      selectedThread?.id === thread.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-gray-50 border-gray-200 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {thread.category}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {thread.title}
                        </p>
                      </div>
                      {getStatusBadge(thread.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{thread._count.messages}개 메시지</span>
                      <span>{formatTime(thread.lastReplyAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 대화 내용 */}
        <Card className="lg:col-span-2 h-[calc(100vh-250px)] flex flex-col">
          {selectedThread ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{selectedThread.title}</CardTitle>
                    <CardDescription className="mt-1">
                      카테고리: {selectedThread.category}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedThread.status)}
                </div>
              </CardHeader>

              {/* 메시지 목록 */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {selectedThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.authorType === "admin" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.authorType === "admin"
                          ? "bg-white border-2 border-blue-200"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-semibold ${message.authorType === "admin" ? "text-gray-900" : "text-white"}`}>
                          {message.authorName}
                        </span>
                        {message.authorType === "admin" && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                            관리자
                          </Badge>
                        )}
                      </div>
                      <p className={`whitespace-pre-wrap text-sm mb-2 ${message.authorType === "admin" ? "text-gray-800" : "text-white"}`}>
                        {message.content}
                      </p>
                      {message.authorType === "admin" && message.expectedCompletionDate && (
                        <div className="flex items-center gap-1 text-sm text-blue-600 mt-2 bg-blue-50 px-3 py-1.5 rounded-full inline-flex w-fit">
                          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap font-medium">완료 예상일: {format(new Date(message.expectedCompletionDate), "yyyy년 M월 d일", { locale: ko })}</span>
                        </div>
                      )}
                      {message.attachments.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {message.attachments.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="첨부 이미지"
                              className="rounded-lg max-w-full h-auto border"
                            />
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-2 ${message.authorType === "admin" ? "text-gray-500" : "text-blue-100"}`}>
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* 답글 작성 */}
              <div className="p-4 border-t bg-white">
                <div className="space-y-3">
                  {replyAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {replyAttachments.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt="첨부" className="w-20 h-20 object-cover rounded border" />
                          <button
                            onClick={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
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
                    className="resize-none min-h-[80px]"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <input
                        type="file"
                        id="reply-file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, false);
                          e.target.value = "";
                        }}
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => document.getElementById("reply-file")?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {uploading ? "업로드 중..." : "이미지 첨부"}
                      </Button>
                    </div>
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyContent.trim() || sending}
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
              <div className="text-center text-gray-400">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>문의를 선택하세요</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
