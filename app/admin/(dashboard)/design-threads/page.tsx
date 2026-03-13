"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Palette,
  Send,
  Paperclip,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  FileImage,
  RefreshCw,
  Eye,
  Download,
  X,
} from "lucide-react";
import { ImageModal } from "@/components/ui/image-modal";
import Image from "next/image";

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

export default function AdminDesignThreadsPage() {
  const [threads, setThreads] = useState<DesignThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // 메시지 입력
  const [messageContent, setMessageContent] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [designUrl, setDesignUrl] = useState("");
  const [designFileName, setDesignFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [designUploading, setDesignUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDesignUpload, setIsDesignUpload] = useState(false);

  // 새 메시지 알림
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 이미지 모달 상태
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  // 날짜별 메시지 그룹핑 (역순 - 최신 메시지가 위로)
  const groupMessagesByDate = (messages: DesignMessage[]) => {
    const groups: Array<
      | { type: "date"; date: string }
      | { type: "message"; data: DesignMessage; index: number }
    > = [];
    let currentDate: string | null = null;

    // 메시지를 역순으로 순회 (최신 메시지부터)
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
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (typeFilter !== "all") params.append("type", typeFilter);

        const response = await fetch(`/api/design-threads?${params}`);
        const data = await response.json();

        if (response.ok) {
          setThreads(data.threads || []);

          // 선택된 쓰레드가 있으면 상세 정보 다시 조회
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
    [statusFilter, typeFilter, selectedThread?.id],
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
        // 새 메시지 감지
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

  // 사용자별로 스레드 그룹핑
  const groupThreadsByUser = () => {
    const grouped = threads.reduce(
      (acc, thread) => {
        const userId = thread.workflow.user.id;
        if (!acc[userId]) {
          acc[userId] = {
            user: thread.workflow.user,
            threads: [],
            unreadCount: 0,
          };
        }
        acc[userId].threads.push(thread);
        acc[userId].unreadCount += thread.unreadCount;

        return acc;
      },
      {} as Record<
        string,
        {
          user: DesignThread["workflow"]["user"];
          threads: DesignThread[];
          unreadCount: number;
        }
      >,
    );

    // 배열로 변환하고 정렬 (미확인 메시지 있는 사용자 우선)
    return Object.values(grouped).sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      // 최신 업데이트 순
      const aLastUpdate = Math.max(
        ...a.threads.map((t) => new Date(t.updatedAt).getTime()),
      );
      const bLastUpdate = Math.max(
        ...b.threads.map((t) => new Date(t.updatedAt).getTime()),
      );
      return bLastUpdate - aLastUpdate;
    });
  };

  useEffect(() => {
    fetchThreads();
  }, [statusFilter, typeFilter]);

  // 스레드 선택
  const handleSelectThread = async (thread: DesignThread) => {
    setNewMessageAlert(false);
    await fetchThreadDetail(thread.id);
  };

  // 이미지 업로드 (일반 메시지용)
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

  // 시안 파일 업로드
  const handleDesignFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setDesignUploading(true);
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
      setDesignUrl(data.url);
      setDesignFileName(file.name);
    } catch (error) {
      console.error("Design upload error:", error);
      alert("시안 파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setDesignUploading(false);
    }
  };

  // 메시지 전송 (일반 메시지 또는 시안 업로드)
  const handleSendMessage = async () => {
    if (!selectedThread) return;

    if (isDesignUpload) {
      if (!designUrl.trim()) {
        alert("시안 파일을 업로드해주세요.");
        return;
      }
    } else {
      if (!messageContent.trim() && attachments.length === 0) {
        alert("메시지를 입력해주세요.");
        return;
      }
    }

    setSending(true);
    try {
      const response = await fetch(
        `/api/design-threads/${selectedThread.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageType: isDesignUpload ? "design_upload" : "message",
            content: isDesignUpload
              ? `${selectedThread.currentVersion + 1}차 시안을 업로드했습니다.`
              : messageContent,
            attachments: isDesignUpload ? [] : attachments,
            designUrl: isDesignUpload ? designUrl : undefined,
          }),
        },
      );

      if (response.ok) {
        setMessageContent("");
        setAttachments([]);
        setDesignUrl("");
        setDesignFileName("");
        setIsDesignUpload(false);
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

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            <Clock className="w-3 h-3 mr-1" />
            대기
          </Badge>
        );
      case "uploaded":
      case "feedback_waiting":
        return (
          <Badge className="bg-gold-100 text-gold-700 border-gold-300">
            <FileImage className="w-3 h-3 mr-1" />
            피드백 대기
          </Badge>
        );
      case "revision_requested":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <RefreshCw className="w-3 h-3 mr-1" />
            수정 요청
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
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
            <Upload className="w-3 h-3 mr-1" />
            시안 업로드
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
            시안 확정
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">시안 관리</h1>
          <p className="text-gray-600 mt-2">시안 업로드 및 피드백 관리</p>
        </div>
        <Palette className="w-8 h-8 text-purple-600" />
      </div>

      <Alert className="bg-purple-50 border-purple-200">
        <AlertDescription className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-purple-900">시안 관리 안내</p>
          <ul className="space-y-1 mt-2">
            <li>
              •{" "}
              <span className="font-medium text-purple-800">
                시안 업로드 시 클라이언트에게 자동 알림이 전송됩니다.
              </span>
            </li>
            <li>
              • 클라이언트가 시안을 확정하면 자동으로 발주 단계로 넘어갑니다.
            </li>
            <li>• 수정 요청이 오면 &quot;수정 요청&quot; 상태로 변경됩니다.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 스레드 목록 */}
        <Card
          className={`border-gray-200 bg-white lg:col-span-1 overflow-hidden flex flex-col shadow-sm ${
            selectedThread ? "hidden lg:flex" : "flex"
          } h-[60vh] lg:h-[calc(100vh-200px)]`}
        >
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-900 text-lg">시안 목록</CardTitle>
            <div className="flex gap-2 mt-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="feedback_waiting">피드백 대기</SelectItem>
                  <SelectItem value="revision_requested">수정 요청</SelectItem>
                  <SelectItem value="confirmed">확정 완료</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">전체 타입</SelectItem>
                  <SelectItem value="로고">로고</SelectItem>
                  <SelectItem value="명함">명함</SelectItem>
                  <SelectItem value="리플렛">리플렛</SelectItem>
                  <SelectItem value="현수막">현수막</SelectItem>
                  <SelectItem value="배너">배너</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {loading && threads.length === 0 ? (
              <p className="text-center text-gray-500">로딩 중...</p>
            ) : threads.length === 0 ? (
              <p className="text-center text-gray-500">시안이 없습니다</p>
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
                          ? "border border-purple-500 bg-purple-50 shadow-lg"
                          : "border border-gray-200 bg-white"
                      }`}
                    >
                      <AccordionTrigger
                        className={`px-4 py-3 hover:no-underline ${
                          hasUnread ? "hover:bg-purple-100" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {hasUnread && (
                                <AlertCircle className="w-5 h-5 text-purple-600 animate-pulse" />
                              )}
                              <span
                                className={`text-sm font-semibold ${
                                  hasUnread
                                    ? "text-purple-900"
                                    : "text-gray-900"
                                }`}
                              >
                                {userGroup.user.이름}
                              </span>
                              {userGroup.user.cohort && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    hasUnread
                                      ? "border-purple-400 text-purple-700 bg-purple-100"
                                      : "border-gray-300 text-gray-600"
                                  }`}
                                >
                                  {userGroup.user.cohort.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${
                                  hasUnread
                                    ? "text-purple-700 font-medium"
                                    : "text-gray-500"
                                }`}
                              >
                                {userGroup.threads.length}개 시안
                              </span>
                              {hasUnread && (
                                <Badge className="bg-purple-600 text-white text-sm font-bold px-3 py-1 animate-pulse">
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
                            const hasThreadUnread = thread.unreadCount > 0;

                            return (
                              <div
                                key={thread.id}
                                className={`p-3 rounded-lg transition-all border cursor-pointer ${
                                  selectedThread?.id === thread.id
                                    ? "bg-purple-50 border-purple-300"
                                    : hasThreadUnread
                                      ? "bg-purple-100 border-purple-400 hover:bg-purple-200 shadow-md"
                                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                }`}
                                onClick={() => handleSelectThread(thread)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {hasThreadUnread && (
                                        <div className="flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                          <AlertCircle className="w-3 h-3" />
                                          <span>
                                            {thread.unreadCount}개 미확인
                                          </span>
                                        </div>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                          hasThreadUnread
                                            ? "border-purple-600 text-purple-800 bg-purple-50"
                                            : "border-gray-300 text-gray-600"
                                        }`}
                                      >
                                        {WORKFLOW_TYPE_LABELS[
                                          thread.workflow.type
                                        ] || thread.workflow.type}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-900 font-medium">
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
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* 대화 내용 */}
        <Card
          className={`border-gray-200 bg-white lg:col-span-2 overflow-hidden flex flex-col shadow-sm ${
            selectedThread ? "flex" : "hidden lg:flex"
          } max-h-[85vh] lg:max-h-[calc(100vh-180px)]`}
        >
          {selectedThread ? (
            <>
              <CardHeader className="py-2 sm:py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* 모바일 뒤로가기 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedThread(null)}
                      className="lg:hidden mb-1 -ml-2 h-7 px-2 text-xs"
                    >
                      ← 목록으로
                    </Button>
                    <CardTitle className="text-gray-900 text-base sm:text-xl mb-1">
                      {WORKFLOW_TYPE_LABELS[selectedThread.workflow.type] ||
                        selectedThread.workflow.type}{" "}
                      시안
                      {selectedThread.currentVersion > 0 &&
                        ` (${selectedThread.currentVersion}차)`}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 sm:w-4 sm:h-4" />
                        {selectedThread.workflow.user.이름}
                      </span>
                      {selectedThread.workflow.user.submission?.브랜드명 && (
                        <span className="text-purple-600 font-medium">
                          {selectedThread.workflow.user.submission.브랜드명}
                        </span>
                      )}
                      {selectedThread.workflow.user.cohort && (
                        <span className="hidden sm:inline">
                          {selectedThread.workflow.user.cohort.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {getStatusBadge(selectedThread.status)}
                  </div>
                </div>
              </CardHeader>

              {/* 새 메시지 알림 */}
              {newMessageAlert && (
                <div className="sticky top-0 z-10 mx-3 sm:mx-6 mt-3 flex-shrink-0">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-between animate-bounce">
                    <span className="text-sm font-medium">
                      클라이언트가 새 메시지를 보냈습니다
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
              <CardContent className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-gray-50 min-h-0">
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
                              ? "justify-end"
                              : "justify-start"
                          } mt-4`}
                        >
                          <div className="max-w-[85%] sm:max-w-[80%]">
                            {/* 작성자 정보 */}
                            <div
                              className={`flex items-center gap-2 mb-1 ${
                                message.authorType === "admin"
                                  ? "justify-end"
                                  : ""
                              }`}
                            >
                              <span className="text-xs font-semibold text-gray-700">
                                {message.authorName}
                              </span>
                              {message.authorType === "admin" && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-[10px] py-0 px-2">
                                  관리자
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
                                  ? "bg-purple-50 border border-purple-200"
                                  : "bg-white border border-gray-200"
                              }`}
                            >
                              <p className="text-gray-900 whitespace-pre-wrap text-sm">
                                {message.content}
                              </p>

                              {/* 시안 파일 */}
                              {message.designUrl && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
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
                                          시안 확인
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
                                      <div className="flex-1 p-2 bg-purple-50 rounded border border-purple-200">
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
                              {message.authorType === "admin" &&
                                message.isReadByUser && (
                                  <p className="text-[10px] mt-1 text-gold-600">
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
                    <p className="text-sm mt-1">시안을 업로드해주세요.</p>
                  </div>
                )}
              </CardContent>

              {/* 메시지/시안 입력 영역 */}
              <div className="p-2 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="space-y-2">
                  {/* 시안 업로드 / 일반 메시지 토글 - 확정 상태가 아닐 때만 표시 */}
                  {selectedThread.status !== "confirmed" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant={!isDesignUpload ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsDesignUpload(false)}
                        className={
                          !isDesignUpload
                            ? "bg-purple-600 hover:bg-purple-700"
                            : ""
                        }
                      >
                        일반 메시지
                      </Button>
                      <Button
                        variant={isDesignUpload ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsDesignUpload(true)}
                        className={
                          isDesignUpload
                            ? "bg-purple-600 hover:bg-purple-700"
                            : ""
                        }
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        시안 업로드
                      </Button>
                    </div>
                  )}

                  {isDesignUpload && selectedThread.status !== "confirmed" ? (
                    /* 시안 업로드 모드 - 확정 상태가 아닐 때만 */
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          시안 파일 업로드
                        </label>
                        {designUrl ? (
                          <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <FileImage className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="text-sm text-gray-700 flex-1 truncate">
                              {designFileName}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDesignUrl("");
                                setDesignFileName("");
                              }}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              id="design-file-upload"
                              accept="image/*,.pdf,.ai,.psd,.eps,.svg"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDesignFileUpload(file);
                                e.target.value = "";
                              }}
                              disabled={designUploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-20 border-dashed border hover:border-purple-400 hover:bg-purple-50"
                              onClick={() =>
                                document
                                  .getElementById("design-file-upload")
                                  ?.click()
                              }
                              disabled={designUploading}
                            >
                              <div className="flex flex-col items-center gap-1">
                                {designUploading ? (
                                  <>
                                    <div className="w-5 h-5 border border-purple-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-gray-500">
                                      업로드 중...
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-5 h-5 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      파일 선택
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      이미지, PDF, AI, PSD 지원
                                    </span>
                                  </>
                                )}
                              </div>
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        다음 시안 버전: {selectedThread.currentVersion + 1}차
                      </p>
                    </div>
                  ) : (
                    /* 일반 메시지 모드 */
                    <div className="space-y-2">
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((url, idx) => (
                            <div key={idx} className="relative w-16 h-16">
                              <Image
                                src={url}
                                alt="첨부"
                                width={64}
                                height={64}
                                className="w-16 h-16 object-cover rounded border border-gray-200"
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
                        className="bg-white border-gray-200 text-gray-900 resize-none min-h-[60px] sm:min-h-[100px] text-sm sm:text-base"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    {(!isDesignUpload ||
                      selectedThread.status === "confirmed") && (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="admin-design-file"
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
                          size="sm"
                          className="border-gray-200 text-gray-600 h-8 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                          disabled={uploading}
                          onClick={() =>
                            document
                              .getElementById("admin-design-file")
                              ?.click()
                          }
                        >
                          <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {uploading ? "업로드 중..." : "이미지"}
                          </span>
                        </Button>
                      </div>
                    )}
                    <div
                      className={
                        isDesignUpload && selectedThread.status !== "confirmed"
                          ? "ml-auto"
                          : ""
                      }
                    >
                      <Button
                        onClick={handleSendMessage}
                        disabled={
                          sending ||
                          (isDesignUpload &&
                          selectedThread.status !== "confirmed"
                            ? !designUrl.trim()
                            : !messageContent.trim() &&
                              attachments.length === 0)
                        }
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
                      >
                        <Send className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        {sending
                          ? "전송 중..."
                          : isDesignUpload &&
                              selectedThread.status !== "confirmed"
                            ? "시안 업로드"
                            : "전송"}
                      </Button>
                    </div>
                  </div>

                  {/* 확정 완료 안내 배너 */}
                  {selectedThread.status === "confirmed" && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 text-sm">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">시안 확정 완료</span>
                        {selectedThread.confirmedAt && (
                          <span className="text-green-600">
                            ({selectedThread.confirmedByName},{" "}
                            {format(
                              new Date(selectedThread.confirmedAt),
                              "yyyy-MM-dd HH:mm",
                              { locale: ko },
                            )}
                            )
                          </span>
                        )}
                        <span className="text-green-600 ml-auto text-xs">
                          추가 안내사항을 전달할 수 있습니다
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>시안을 선택하세요</p>
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
