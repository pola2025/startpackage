"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, Eye, ExternalLink, GraduationCap, UserCheck, Send, MessageSquare, Paperclip, X, Loader2 } from "lucide-react";

interface UserActionsProps {
  user: any;
}

export default function UserActions({ user }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showGraduateDialog, setShowGraduateDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageChannel, setMessageChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");

  // 문의하기 메시지 (Communication Thread)
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [sendingCommunication, setSendingCommunication] = useState(false);
  const [commThreadTitle, setCommThreadTitle] = useState("");
  const [commCategory, setCommCategory] = useState<"일반" | "제작" | "배송" | "기타">("일반");
  const [commContent, setCommContent] = useState("");
  const [commAttachments, setCommAttachments] = useState<string[]>([]);
  const [uploadingCommAttachment, setUploadingCommAttachment] = useState(false);

  const fetchSubmission = async () => {
    setLoadingSubmission(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/submission`);
      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    } finally {
      setLoadingSubmission(false);
    }
  };

  const handleViewDetails = () => {
    setShowDetailDialog(true);
    fetchSubmission();
  };

  const handleDelete = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error("삭제 실패");
      }

      router.refresh();
      setShowDeleteDialog(false);
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGraduate = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/toggle-graduate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isGraduated: !user.isGraduated }),
      });

      if (!response.ok) {
        throw new Error("수료생 전환 실패");
      }

      router.refresh();
      setShowGraduateDialog(false);
    } catch (error) {
      alert("수료생 전환 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert("제목과 메시지를 모두 입력해주세요.");
      return;
    }

    if (sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          channel: messageChannel,
          title: messageTitle,
          message: messageContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "메시지 발송 실패");
      }

      alert(`${messageChannel === "SMS" ? "문자" : "이메일"}를 성공적으로 발송했습니다.`);
      setShowMessageDialog(false);
      setMessageTitle("");
      setMessageContent("");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "메시지 발송 중 오류가 발생했습니다.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCommAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setUploadingCommAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/communication/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("파일 업로드 실패");
      }

      const data = await response.json();
      setCommAttachments([...commAttachments, data.url]);
    } catch (error) {
      alert("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingCommAttachment(false);
      e.target.value = "";
    }
  };

  const handleRemoveCommAttachment = (index: number) => {
    setCommAttachments(commAttachments.filter((_, i) => i !== index));
  };

  const handleSendCommunication = async () => {
    if (!commThreadTitle.trim() || !commContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (sendingCommunication) return;

    setSendingCommunication(true);
    try {
      const response = await fetch("/api/admin/communication/create-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: commThreadTitle,
          category: commCategory,
          content: commContent,
          attachments: commAttachments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "문의하기 메시지 전송 실패");
      }

      alert("문의하기 메시지를 성공적으로 전송했습니다.\n사용자에게 실시간 알림이 전송되었습니다.");
      setShowCommunicationDialog(false);
      setCommThreadTitle("");
      setCommCategory("일반");
      setCommContent("");
      setCommAttachments([]);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "문의하기 메시지 전송 중 오류가 발생했습니다.");
    } finally {
      setSendingCommunication(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white border-gray-200" align="end">
          <DropdownMenuItem
            onClick={handleViewDetails}
            className="text-blue-600 hover:bg-blue-50 cursor-pointer"
          >
            <Eye className="w-4 h-4 mr-2" />
            제출 정보 확인
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowMessageDialog(true)}
            disabled={loading}
            className="text-purple-600 hover:bg-purple-50 cursor-pointer"
          >
            <Send className="w-4 h-4 mr-2" />
            메시지 발송 (SMS/이메일)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowCommunicationDialog(true)}
            disabled={loading}
            className="text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            문의하기 메시지
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowGraduateDialog(true)}
            disabled={loading}
            className={`${user.isGraduated ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"} cursor-pointer`}
          >
            {user.isGraduated ? (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                재학생으로 전환
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4 mr-2" />
                수료생으로 전환
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
            className="text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showGraduateDialog} onOpenChange={setShowGraduateDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.isGraduated ? "재학생으로 전환" : "수료생으로 전환"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{user.이름}</strong> 사용자를{" "}
              {user.isGraduated ? "재학생" : "수료생"}으로 전환하시겠습니까?
              <br />
              {user.isGraduated ? (
                <>모든 기능에 접근할 수 있게 됩니다.</>
              ) : (
                <>커뮤니케이션과 마케팅 소식만 접근할 수 있게 됩니다.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleGraduate}
              disabled={loading}
              className={`${user.isGraduated ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"} text-white`}
            >
              {loading ? "처리 중..." : "전환"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <strong>{user.이름}</strong> 사용자를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              {user.이름} - 제출 정보
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              사용자가 제출한 모든 정보를 확인할 수 있습니다
            </DialogDescription>
          </DialogHeader>

          {loadingSubmission ? (
            <div className="py-8 text-center text-gray-500">
              정보를 불러오는 중...
            </div>
          ) : submission ? (
            <div className="space-y-6 mt-4">
              {/* 기본 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">기본 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">브랜드명:</span>
                    <p className="font-medium text-gray-900">{submission.브랜드명 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">업종:</span>
                    <p className="font-medium text-gray-900">{submission.업종 || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">주소:</span>
                    <p className="font-medium text-gray-900">{submission.주소 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">대표번호:</span>
                    <p className="font-medium text-gray-900">{submission.대표번호 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">이메일:</span>
                    <p className="font-medium text-gray-900">{submission.이메일 || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 로고 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">로고 & 명함 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">로고 선호 스타일:</span>
                    <p className="font-medium text-gray-900">{submission.로고선호스타일 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">로고 선호 폰트:</span>
                    <p className="font-medium text-gray-900">{submission.로고선호폰트 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">명함 색상:</span>
                    <div className="flex items-center gap-2">
                      {submission.명함색상 && (
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: submission.명함색상 }}
                        />
                      )}
                      <p className="font-medium text-gray-900">{submission.명함색상 || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">명함 시안:</span>
                    <p className="font-medium text-gray-900">{submission.명함시안 || "-"}</p>
                  </div>
                  {submission.로고URL && (
                    <div className="col-span-2">
                      <span className="text-gray-600">로고 파일:</span>
                      <a
                        href={submission.로고URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        파일 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 홈페이지 정보 */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900">홈페이지 정보</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">선택한 스타일:</span>
                    {submission.홈페이지스타일 ? (
                      <a
                        href={submission.홈페이지스타일}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        {submission.홈페이지스타일} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">컬러 컨셉:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {submission.홈페이지컬러컨셉 && (
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: submission.홈페이지컬러컨셉 }}
                        />
                      )}
                      <p className="font-medium text-gray-900">{submission.홈페이지컬러컨셉 || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">아임웹 ID:</span>
                    <p className="font-medium text-gray-900">{submission.아임웹ID || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">아임웹 비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.아임웹PW ? "●●●●●●" : "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">아임웹 관리자 비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.아임웹관리자PW ? "●●●●●●" : "-"}</p>
                  </div>
                </div>
              </div>

              {/* 마케팅 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">마케팅 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">네이버 검색광고 ID:</span>
                    <p className="font-medium text-gray-900">{submission.네이버검색광고ID || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Instagram ID:</span>
                    <p className="font-medium text-gray-900">{submission.InstagramID || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 파일 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">업로드 파일</h3>
                <div className="space-y-2 text-sm">
                  {submission.사업자등록증URL && (
                    <div>
                      <span className="text-gray-600">사업자등록증:</span>
                      <a
                        href={submission.사업자등록증URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        파일 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {submission.프로필사진URL && (
                    <div>
                      <span className="text-gray-600">프로필 사진:</span>
                      <a
                        href={submission.프로필사진URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        파일 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              제출된 정보가 없습니다.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 메시지 발송 다이얼로그 */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              {user.이름}님에게 메시지 발송
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              SMS 또는 이메일을 선택하여 개별 메시지를 발송할 수 있습니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 채널 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">발송 방법 *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMessageChannel("SMS")}
                  disabled={!user.SMS수신동의}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    messageChannel === "SMS"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-gray-300 bg-white text-gray-700 hover:border-purple-400"
                  } ${!user.SMS수신동의 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="font-semibold">SMS (문자)</div>
                  <div className="text-xs mt-1">{user.연락처}</div>
                  {!user.SMS수신동의 && (
                    <div className="text-xs text-red-600 mt-1">수신 동의 안 함</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageChannel("EMAIL")}
                  disabled={!user.이메일수신동의}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    messageChannel === "EMAIL"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-gray-300 bg-white text-gray-700 hover:border-purple-400"
                  } ${!user.이메일수신동의 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="font-semibold">이메일</div>
                  <div className="text-xs mt-1">{user.email}</div>
                  {!user.이메일수신동의 && (
                    <div className="text-xs text-red-600 mt-1">수신 동의 안 함</div>
                  )}
                </button>
              </div>
            </div>

            {/* 제목 입력 */}
            <div className="space-y-2">
              <label htmlFor="message-title" className="text-sm font-semibold text-gray-900">
                제목 *
              </label>
              <input
                id="message-title"
                type="text"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="메시지 제목을 입력하세요"
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">{messageTitle.length}/100자</p>
            </div>

            {/* 메시지 내용 */}
            <div className="space-y-2">
              <label htmlFor="message-content" className="text-sm font-semibold text-gray-900">
                메시지 내용 *
              </label>
              <textarea
                id="message-content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="메시지 내용을 입력하세요"
                rows={8}
                maxLength={1000}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none overflow-y-auto max-h-[400px]"
              />
              <p className="text-xs text-gray-500">{messageContent.length}/1000자</p>
            </div>

            {/* 미리보기 */}
            {(messageTitle || messageContent) && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">미리보기</p>
                <div className="space-y-2">
                  {messageTitle && (
                    <div className="font-semibold text-gray-900">[{messageTitle}]</div>
                  )}
                  {messageContent && (
                    <div className="text-gray-700 whitespace-pre-wrap text-sm">
                      {messageContent}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMessageDialog(false)}
                disabled={sendingMessage}
                className="flex-1 border-gray-300"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageTitle.trim() || !messageContent.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {sendingMessage ? (
                  "발송 중..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {messageChannel === "SMS" ? "문자" : "이메일"} 발송
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 문의하기 메시지 다이얼로그 */}
      <Dialog open={showCommunicationDialog} onOpenChange={setShowCommunicationDialog}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-indigo-900">
              <MessageSquare className="w-5 h-5 inline mr-2" />
              문의하기 메시지 보내기
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              <strong>{user.이름}</strong>님에게 문의하기 스레드를 생성하고 메시지를 보냅니다.
              <br />
              사용자에게 실시간 알림이 전송됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={commThreadTitle}
                onChange={(e) => setCommThreadTitle(e.target.value)}
                placeholder="예: 로고 디자인 관련 문의"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={100}
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <div className="flex gap-2">
                {(["일반", "제작", "배송", "기타"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCommCategory(cat)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      commCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 메시지 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메시지 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={commContent}
                onChange={(e) => setCommContent(e.target.value)}
                placeholder="사용자에게 전달할 메시지를 작성해주세요."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-y-auto max-h-[400px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                현재 {commContent.length}자
              </p>
            </div>

            {/* 첨부파일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                첨부파일 (선택)
              </label>
              <div className="space-y-2">
                {/* 업로드 버튼 */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCommAttachmentUpload}
                    disabled={uploadingCommAttachment}
                    className="hidden"
                    id="comm-attachment-upload"
                  />
                  <label
                    htmlFor="comm-attachment-upload"
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      uploadingCommAttachment ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {uploadingCommAttachment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4 mr-2" />
                        이미지 첨부
                      </>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    이미지 파일만 가능 (최대 10MB)
                  </p>
                </div>

                {/* 첨부된 파일 목록 */}
                {commAttachments.length > 0 && (
                  <div className="space-y-2">
                    {commAttachments.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200"
                      >
                        <img
                          src={url}
                          alt={`첨부파일 ${index + 1}`}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 text-xs text-gray-700 truncate">
                          이미지 {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCommAttachment(index)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCommunicationDialog(false);
                  setCommThreadTitle("");
                  setCommCategory("일반");
                  setCommContent("");
                  setCommAttachments([]);
                }}
                disabled={sendingCommunication}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSendCommunication}
                disabled={sendingCommunication || !commThreadTitle.trim() || !commContent.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {sendingCommunication ? (
                  "전송 중..."
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    메시지 전송
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
