"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Palette,
  Send,
  Paperclip,
  CheckCircle,
  Clock,
  FileImage,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Check,
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  FolderOpen,
  Download,
  Eye,
} from "lucide-react";
import { ImageModal } from "@/components/ui/image-modal";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-media-query";
import { DraggableBottomSheet } from "@/components/ui/bottom-sheet";

// 워크플로우 타입 매핑
const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  로고: "로고",
  명함: "명함",
  리플렛: "리플렛",
  현수막: "현수막",
  배너: "배너",
  기타: "기타",
};

interface DesignThread {
  id: string;
  status: string;
  currentVersion: number;
  confirmedAt: string | null;
  confirmedByName: string | null;
  workflow: {
    id: string;
    type: string;
    status: string;
    user: {
      id: string;
      이름: string;
      email: string;
      cohort: { name: string } | null;
    };
  };
  lastMessage: DesignMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DesignMessage {
  id: string;
  authorType: string;
  authorName: string;
  messageType: string;
  content: string;
  attachments: string[];
  designVersion: number | null;
  designUrl: string | null;
  isReadByAdmin: boolean;
  isReadByUser: boolean;
  createdAt: string;
}

interface ThreadDetail {
  id: string;
  status: string;
  currentVersion: number;
  confirmedAt: string | null;
  confirmedByName: string | null;
  workflow: {
    id: string;
    type: string;
    status: string;
    user: {
      id: string;
      이름: string;
      email: string;
      연락처: string;
      submission: { 브랜드명: string | null } | null;
      cohort: { name: string } | null;
    };
  };
  messages: DesignMessage[];
}

export default function UserDesignThreadsPage() {
  const [threads, setThreads] = useState<DesignThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // 메시지 입력
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // 확정 다이얼로그
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // 새 메시지 알림
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 이미지 모달 상태
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  // 이미지 첨부 바텀시트 상태
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);

  // 모바일 감지
  const isMobile = useIsMobile();

  // 날짜별 메시지 그룹핑 (역순 - 최신 메시지가 위로)
  const groupMessagesByDate = (messages: DesignMessage[]) => {
    const groups: Array<
      | { type: "date"; date: string }
      | { type: "message"; data: DesignMessage; index: number }
    > = [];
    let currentDate: string | null = null;

    [...messages].reverse().forEach((message, reverseIndex) => {
      const originalIndex = messages.length - 1 - reverseIndex;
      const messageDate = format(new Date(message.createdAt), "yyyy-MM-dd", {
        locale: ko,
      });

      if (messageDate !== currentDate) {
        groups.push({ type: "date", date: messageDate });
        currentDate = messageDate;
      }

      groups.push({ type: "message", data: message, index: originalIndex });
    });

    return groups;
  };

  // 스레드 목록 조회
  const fetchThreads = useCallback(
    async (keepSelectedThreadId?: string, silentRefresh: boolean = false) => {
      try {
        if (!silentRefresh) setLoading(true);
        const response = await fetch("/api/design-threads");
        const data = await response.json();

        if (response.ok) {
          setThreads(data.threads || []);

          const threadIdToKeep = keepSelectedThreadId || selectedThread?.id;
          if (threadIdToKeep) {
            fetchThreadDetail(threadIdToKeep, silentRefresh);
          }
        }
      } catch (error) {
        console.error("Failed to fetch threads:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedThread?.id],
  );

  // 스레드 상세 조회
  const fetchThreadDetail = async (
    threadId: string,
    silentRefresh: boolean = false,
  ) => {
    try {
      const response = await fetch(`/api/design-threads/${threadId}`);
      const data = await response.json();

      if (response.ok) {
        if (
          lastMessageCount > 0 &&
          data.thread.messages.length > lastMessageCount
        ) {
          setNewMessageAlert(true);
        }

        setSelectedThread(data.thread);
        setLastMessageCount(data.thread.messages.length);
      }
    } catch (error) {
      console.error("Failed to fetch thread detail:", error);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  // 스레드 선택
  const handleSelectThread = async (thread: DesignThread) => {
    setNewMessageAlert(false);
    await fetchThreadDetail(thread.id);
  };

  // 이미지 업로드
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
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

      if (!response.ok) {
        if (response.status === 413) {
          alert("파일이 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.");
          return;
        }
        const data = await response.json();
        alert(data.error || "업로드 실패");
        return;
      }

      const data = await response.json();
      setAttachments([...attachments, data.url]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  // 수정 요청 메시지 전송
  const handleSendRevisionRequest = async () => {
    if (!selectedThread) return;
    if (!messageContent.trim()) {
      alert("수정 요청 내용을 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        `/api/design-threads/${selectedThread.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageType: "revision_request",
            content: messageContent,
            attachments,
          }),
        },
      );

      if (response.ok) {
        setMessageContent("");
        setAttachments([]);
        fetchThreads(selectedThread.id, true);
      } else {
        const data = await response.json();
        alert(data.error || "전송 실패");
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  // 일반 메시지 전송
  const handleSendMessage = async () => {
    if (!selectedThread) return;
    if (!messageContent.trim() && attachments.length === 0) {
      alert("메시지를 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        `/api/design-threads/${selectedThread.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageType: "message",
            content: messageContent,
            attachments,
          }),
        },
      );

      if (response.ok) {
        setMessageContent("");
        setAttachments([]);
        fetchThreads(selectedThread.id, true);
      } else {
        const data = await response.json();
        alert(data.error || "전송 실패");
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  // 시안 확정
  const handleConfirmDesign = async () => {
    if (!selectedThread || !confirmChecked) return;

    setConfirming(true);
    try {
      const confirmMessage =
        `[시안 확정 및 발주 요청]\n\n` +
        `✅ ${selectedThread.currentVersion}차 시안을 최종 확인하였으며, 이 시안으로 발주를 요청합니다.\n` +
        `✅ 확정 후에는 수정이 어려울 수 있음을 이해하고 동의합니다.`;

      const response = await fetch(
        `/api/design-threads/${selectedThread.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: confirmMessage,
          }),
        },
      );

      if (response.ok) {
        setConfirmDialogOpen(false);
        setConfirmChecked(false);
        alert("시안이 확정되었습니다. 발주 단계로 진행됩니다.");
        fetchThreads(selectedThread.id, true);
      } else {
        const data = await response.json();
        alert(data.error || "확정 실패");
      }
    } catch (error) {
      console.error("Confirm error:", error);
      alert("확정 중 오류가 발생했습니다.");
    } finally {
      setConfirming(false);
    }
  };

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            대기
          </Badge>
        );
      case "uploaded":
      case "feedback_waiting":
        return (
          <Badge
            variant="outline"
            className="bg-gold-50 text-navy-700 border-gold-200"
          >
            <FileImage className="w-3 h-3 mr-1" />
            확인 필요
          </Badge>
        );
      case "revision_requested":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            수정 요청됨
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            확정 완료
          </Badge>
        );
      default:
        return null;
    }
  };

  // 메시지 타입 뱃지
  const getMessageTypeBadge = (messageType: string) => {
    switch (messageType) {
      case "design_upload":
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
            <FileImage className="w-3 h-3 mr-1" />
            시안
          </Badge>
        );
      case "revision_request":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            수정 요청
          </Badge>
        );
      case "confirmation":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            확정
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

  // 시안 확인 필요 여부
  const needsFeedback =
    selectedThread &&
    (selectedThread.status === "uploaded" ||
      selectedThread.status === "feedback_waiting") &&
    selectedThread.currentVersion > 0;

  return (
    <div
      className={`${isMobile && selectedThread ? "h-[calc(100dvh-60px)]" : ""}`}
    >
      {/* 헤더 - 모바일 상세뷰에서는 숨김 */}
      {(!isMobile || !selectedThread) && (
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                시안 확인
              </h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                시안 확인 및 피드백
              </p>
            </div>
            <Palette className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
          </div>

          {/* 안내 - 모바일에서 축소 */}
          <Alert className="bg-purple-50 border-purple-200">
            <AlertDescription className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-purple-900">시안 확인 안내</p>
              <ul className="space-y-1 mt-2 text-xs md:text-sm">
                <li>
                  •{" "}
                  <span className="font-medium text-purple-800">
                    시안이 업로드되면 알림을 통해 안내드립니다.
                  </span>
                </li>
                <li className="hidden md:block">
                  • 시안을 확인하신 후 수정이 필요하면 수정 요청을 보내주세요.
                </li>
                <li className="hidden md:block">
                  • 시안이 마음에 드시면 &quot;시안 확정&quot; 버튼을
                  눌러주세요.
                </li>
                <li>
                  • 시안 확정 후에는 변경이 어려우니 신중하게 확인해주세요.
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div
        className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${isMobile && selectedThread ? "h-full" : ""}`}
      >
        {/* 스레드 목록 */}
        <Card
          className={`lg:col-span-1 flex flex-col ${
            selectedThread ? "hidden lg:flex" : "flex"
          } h-[calc(100dvh-300px)] md:h-[calc(100vh-250px)]`}
        >
          <CardHeader>
            <CardTitle className="text-lg">내 시안 목록</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-500">로딩 중...</p>
            ) : threads.length === 0 ? (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">시안이 없습니다</p>
                <p className="text-sm text-gray-400">
                  워크플로우가 시안 단계에 진입하면 여기에 표시됩니다
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => {
                  const hasUnread = thread.unreadCount > 0;

                  return (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread)}
                      className={`p-4 rounded-lg cursor-pointer transition-all border ${
                        selectedThread?.id === thread.id
                          ? "bg-purple-50 border-purple-300"
                          : hasUnread
                            ? "bg-purple-100 border-purple-400 hover:bg-purple-200"
                            : "bg-gray-50 border-gray-200 hover:border-purple-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {hasUnread && (
                              <Badge className="bg-purple-600 text-white text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {thread.unreadCount}개 미확인
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {WORKFLOW_TYPE_LABELS[thread.workflow.type] ||
                                thread.workflow.type}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            {thread.currentVersion > 0
                              ? `${thread.currentVersion}차 시안`
                              : "시안 대기"}
                          </p>
                        </div>
                        {getStatusBadge(thread.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {thread.lastMessage
                            ? thread.lastMessage.authorName
                            : "메시지 없음"}
                        </span>
                        <span>{formatTime(thread.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 대화 내용 */}
        <Card
          className={`lg:col-span-2 flex flex-col ${
            selectedThread ? "flex" : "hidden lg:flex"
          } ${isMobile ? "h-full border-0 shadow-none rounded-none" : "h-[calc(100vh-250px)]"}`}
        >
          {selectedThread ? (
            <>
              <CardHeader
                className={`border-b ${isMobile ? "py-3 px-4 bg-white sticky top-0 z-20" : "py-4"}`}
              >
                <div className="flex items-center gap-3">
                  {/* 모바일 뒤로가기 버튼 */}
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedThread(null)}
                      className="h-9 w-9 shrink-0"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle
                        className={`${isMobile ? "text-base" : "text-xl"} truncate`}
                      >
                        {WORKFLOW_TYPE_LABELS[selectedThread.workflow.type] ||
                          selectedThread.workflow.type}{" "}
                        시안
                        {selectedThread.currentVersion > 0 &&
                          ` (${selectedThread.currentVersion}차)`}
                      </CardTitle>
                      {getStatusBadge(selectedThread.status)}
                    </div>
                    {!isMobile && (
                      <CardDescription className="mt-0.5 text-sm">
                        시안을 확인하고 피드백을 남겨주세요
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* 시안 확정 필요 알림 */}
              {needsFeedback && (
                <div className="mx-3 sm:mx-6 mt-3">
                  <Alert className="bg-white border-gray-200">
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-gold-600" />
                        <span className="text-sm font-medium text-navy-800">
                          새 시안이 도착했습니다! 확인 후 피드백을 보내주세요.
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setConfirmChecked(false);
                          setConfirmDialogOpen(true);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        시안 확정
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* 새 메시지 알림 */}
              {newMessageAlert && (
                <div className="sticky top-0 z-10 mx-3 sm:mx-6 mt-3">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-between animate-bounce">
                    <span className="text-sm font-medium">
                      새 메시지가 도착했습니다
                    </span>
                    <button
                      onClick={() => setNewMessageAlert(false)}
                      className="text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* 메시지 목록 */}
              <CardContent
                className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gray-50 ${isMobile ? "pb-40" : ""}`}
              >
                {groupMessagesByDate(selectedThread.messages).map(
                  (item, groupIndex) => {
                    if (item.type === "date") {
                      return (
                        <div
                          key={`date-${groupIndex}`}
                          className="flex items-center gap-3 my-6"
                        >
                          <div className="flex-1 h-px bg-gray-300" />
                          <span className="text-xs text-gray-600 font-semibold px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                            {format(
                              new Date(item.date),
                              "yyyy년 M월 d일 EEEE",
                              { locale: ko },
                            )}
                          </span>
                          <div className="flex-1 h-px bg-gray-300" />
                        </div>
                      );
                    }

                    const message = item.data;

                    return (
                      <div key={message.id}>
                        <div
                          className={`flex ${
                            message.authorType === "admin"
                              ? "justify-start"
                              : "justify-end"
                          } mt-4`}
                        >
                          <div className="max-w-[85%] sm:max-w-[80%]">
                            {/* 작성자 정보 */}
                            <div
                              className={`flex items-center gap-2 mb-1 ${
                                message.authorType === "admin"
                                  ? ""
                                  : "justify-end"
                              }`}
                            >
                              <span className="text-xs font-semibold text-gray-700">
                                {message.authorName}
                              </span>
                              {message.authorType === "admin" && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-[10px] py-0 px-2">
                                  디자이너
                                </Badge>
                              )}
                              {getMessageTypeBadge(message.messageType)}
                              <span className="text-xs text-gray-500">
                                {format(new Date(message.createdAt), "HH:mm", {
                                  locale: ko,
                                })}
                              </span>
                            </div>

                            {/* 메시지 버블 */}
                            <div
                              className={`rounded-lg p-4 shadow-md ${
                                message.authorType === "admin"
                                  ? "bg-white border border-purple-200"
                                  : "bg-purple-600 text-white"
                              }`}
                            >
                              <p
                                className={`whitespace-pre-wrap text-sm ${
                                  message.authorType === "admin"
                                    ? "text-gray-800"
                                    : "text-white"
                                }`}
                              >
                                {message.content}
                              </p>

                              {/* 시안 파일 */}
                              {message.designUrl && (
                                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileImage className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-800">
                                      {message.designVersion}차 시안
                                    </span>
                                  </div>
                                  {/* 이미지 파일인 경우 미리보기 */}
                                  {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
                                    message.designUrl,
                                  ) ? (
                                    <div className="space-y-2">
                                      <div
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setModalImages([message.designUrl!]);
                                          setModalInitialIndex(0);
                                          setImageModalOpen(true);
                                        }}
                                      >
                                        <Image
                                          src={message.designUrl}
                                          alt={`${message.designVersion}차 시안`}
                                          width={400}
                                          height={300}
                                          className="rounded-lg max-w-full h-auto border border-purple-200 hover:opacity-90 transition-opacity"
                                          unoptimized
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-purple-700 border-purple-300 hover:bg-purple-100"
                                          onClick={() => {
                                            setModalImages([
                                              message.designUrl!,
                                            ]);
                                            setModalInitialIndex(0);
                                            setImageModalOpen(true);
                                          }}
                                        >
                                          <Eye className="w-4 h-4 mr-1" />
                                          크게 보기
                                        </Button>
                                        <a
                                          href={message.designUrl}
                                          download
                                          className="inline-flex items-center justify-center text-sm font-medium h-9 px-3 rounded-md border border-purple-300 text-purple-700 hover:bg-purple-100"
                                        >
                                          <Download className="w-4 h-4 mr-1" />
                                          다운로드
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    /* 디자인 파일 (AI, PSD, PDF 등)인 경우 다운로드만 */
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 p-2 bg-white rounded border border-purple-200">
                                        <span className="text-sm text-gray-600 break-all">
                                          {message.designUrl.split("/").pop() ||
                                            "시안 파일"}
                                        </span>
                                      </div>
                                      <a
                                        href={message.designUrl}
                                        download
                                        className="inline-flex items-center justify-center text-sm font-medium h-10 px-4 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                                      >
                                        <Download className="w-4 h-4 mr-1" />
                                        다운로드
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 첨부 이미지 */}
                              {message.attachments.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  {message.attachments.map((url, idx) => (
                                    <div
                                      key={idx}
                                      className="relative w-full cursor-pointer"
                                      onClick={() => {
                                        setModalImages(message.attachments);
                                        setModalInitialIndex(idx);
                                        setImageModalOpen(true);
                                      }}
                                    >
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

                              {/* 읽음 상태 */}
                              {message.authorType === "user" &&
                                message.isReadByAdmin && (
                                  <p className="text-[10px] mt-1 text-purple-200">
                                    읽음
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}

                {selectedThread.messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>아직 메시지가 없습니다.</p>
                    <p className="text-sm mt-1">
                      디자이너가 시안을 업로드하면 알림을 보내드립니다.
                    </p>
                  </div>
                )}
              </CardContent>

              {/* 메시지 입력 영역 */}
              {selectedThread.status !== "confirmed" && (
                <div
                  className={`p-3 sm:p-4 border-t ${isMobile ? "fixed-input-above-tab" : "bg-white"}`}
                >
                  <div className="space-y-2">
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative w-14 h-14 sm:w-16 sm:h-16"
                          >
                            <Image
                              src={url}
                              alt="첨부"
                              width={64}
                              height={64}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded border border-gray-200"
                              unoptimized
                            />
                            <button
                              onClick={() =>
                                setAttachments(
                                  attachments.filter((_, i) => i !== idx),
                                )
                              }
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              aria-label="첨부 이미지 삭제"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 모바일 입력 UI */}
                    {isMobile ? (
                      <div className="flex items-end gap-2">
                        <input
                          type="file"
                          id="user-design-file"
                          accept="image/*"
                          capture="environment"
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
                          variant="ghost"
                          size="icon"
                          disabled={uploading}
                          onClick={() => setAttachmentSheetOpen(true)}
                          className="h-10 w-10 shrink-0"
                        >
                          <Paperclip className="w-5 h-5 text-gray-500" />
                        </Button>
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="메시지 입력..."
                          className="resize-none min-h-[44px] max-h-[120px] text-base flex-1 py-2.5"
                          rows={1}
                        />
                        {needsFeedback && messageContent.trim() ? (
                          <Button
                            onClick={handleSendRevisionRequest}
                            disabled={!messageContent.trim() || sending}
                            size="icon"
                            className="h-10 w-10 shrink-0 bg-orange-500 hover:bg-orange-600"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </Button>
                        ) : (
                          <Button
                            onClick={handleSendMessage}
                            disabled={
                              (!messageContent.trim() &&
                                attachments.length === 0) ||
                              sending
                            }
                            size="icon"
                            className="h-10 w-10 shrink-0"
                          >
                            <Send className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      /* 데스크탑 입력 UI */
                      <>
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (
                                (messageContent.trim() ||
                                  attachments.length > 0) &&
                                !sending
                              ) {
                                handleSendMessage();
                              }
                            }
                          }}
                          placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                          className="resize-none min-h-[80px] text-base"
                        />
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id="user-design-file-desktop"
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
                              disabled={uploading}
                              onClick={() =>
                                document
                                  .getElementById("user-design-file-desktop")
                                  ?.click()
                              }
                            >
                              <Paperclip className="w-4 h-4 mr-2" />
                              {uploading ? "업로드 중..." : "이미지"}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            {needsFeedback && (
                              <Button
                                onClick={handleSendRevisionRequest}
                                disabled={!messageContent.trim() || sending}
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                수정 요청
                              </Button>
                            )}
                            <Button
                              onClick={handleSendMessage}
                              disabled={
                                (!messageContent.trim() &&
                                  attachments.length === 0) ||
                                sending
                              }
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {sending ? "전송 중..." : "전송"}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 확정 완료 시 표시 */}
              {selectedThread.status === "confirmed" && (
                <div className="p-4 border-t bg-green-50">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">시안이 확정되었습니다.</span>
                    {selectedThread.confirmedAt && (
                      <span className="text-sm text-green-600">
                        (
                        {format(
                          new Date(selectedThread.confirmedAt),
                          "yyyy-MM-dd HH:mm",
                          { locale: ko },
                        )}
                        )
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>시안을 선택하세요</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* 시안 확정 확인 다이얼로그 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시안 확정 및 발주 요청</DialogTitle>
            <DialogDescription>
              시안을 확정하고 발주를 요청합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedThread && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">워크플로우:</span>{" "}
                  {WORKFLOW_TYPE_LABELS[selectedThread.workflow.type] ||
                    selectedThread.workflow.type}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">확정 버전:</span>{" "}
                  {selectedThread.currentVersion}차 시안
                </p>
              </div>
            )}

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                <strong>주의:</strong> 시안 확정 후에는 변경이 어렵습니다.
                발주가 진행되면 취소 또는 수정이 불가능합니다.
              </AlertDescription>
            </Alert>

            {/* 확인 체크박스 */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirm-agreement"
                  checked={confirmChecked}
                  onCheckedChange={(checked) =>
                    setConfirmChecked(checked === true)
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor="confirm-agreement"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  위 시안을 최종 확인하였으며, 이 시안으로 발주를 요청합니다.
                  확정 후에는 수정이 어려울 수 있음을 이해합니다.
                </Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmDesign}
              disabled={confirming || !confirmChecked}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirming ? "확정 중..." : "시안 확정 및 발주 요청"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 이미지 모달 */}
      {imageModalOpen && (
        <ImageModal
          images={modalImages}
          initialIndex={modalInitialIndex}
          onClose={() => setImageModalOpen(false)}
        />
      )}

      {/* 이미지 첨부 바텀시트 (모바일) */}
      <DraggableBottomSheet
        open={attachmentSheetOpen}
        onOpenChange={setAttachmentSheetOpen}
        title="이미지 첨부"
        description="첨부할 이미지를 선택하세요"
      >
        <div className="p-4 pb-8">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="file"
              id="camera-input"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                  setAttachmentSheetOpen(false);
                }
                e.target.value = "";
              }}
              disabled={uploading}
            />
            <button
              onClick={() => document.getElementById("camera-input")?.click()}
              disabled={uploading}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">카메라</span>
            </button>

            <input
              type="file"
              id="gallery-input"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                  setAttachmentSheetOpen(false);
                }
                e.target.value = "";
              }}
              disabled={uploading}
            />
            <button
              onClick={() => document.getElementById("gallery-input")?.click()}
              disabled={uploading}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">갤러리</span>
            </button>

            <input
              type="file"
              id="file-input"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                  setAttachmentSheetOpen(false);
                }
                e.target.value = "";
              }}
              disabled={uploading}
            />
            <button
              onClick={() => document.getElementById("file-input")?.click()}
              disabled={uploading}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">파일</span>
            </button>
          </div>
          {uploading && (
            <div className="mt-4 text-center text-sm text-gray-500">
              업로드 중...
            </div>
          )}
        </div>
      </DraggableBottomSheet>
    </div>
  );
}
