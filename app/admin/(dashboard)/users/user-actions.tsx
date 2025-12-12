"use client";

import { useState, useMemo } from "react";
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
import { MoreVertical, Trash2, Eye, ExternalLink, GraduationCap, UserCheck, Send, MessageSquare, Paperclip, X, Loader2, Phone, FileText, ChevronDown } from "lucide-react";

// 이메일 템플릿 정의
const EMAIL_TEMPLATES = [
  {
    id: "homepage-complete",
    name: "홈페이지 제작 완료",
    title: "홈페이지 제작 완료 안내",
    content: `홈페이지 제작이 완료되었습니다.

텔레그램 설정 참고
(이 과정을 안하시면 스팸메세지 계속 수신됩니다.)
https://www.polaai.co.kr/dashboard/guides

텔레그램 채팅방
https://t.me/+TH1D9UVrEXBhMWI1

아임웹 결제 안내
https://www.polaai.co.kr/dashboard/guides#imweb`,
  },
  {
    id: "card-complete",
    name: "명함 제작 완료",
    title: "명함 제작 완료 안내",
    content: `명함 제작이 완료되었습니다.

첨부된 시안을 확인해 주세요.
수정이 필요하시면 문의하기를 통해 연락 부탁드립니다.`,
  },
  {
    id: "nametag-complete",
    name: "명찰 제작 완료",
    title: "명찰 제작 완료 안내",
    content: `명찰 제작이 완료되었습니다.

첨부된 시안을 확인해 주세요.
수정이 필요하시면 문의하기를 통해 연락 부탁드립니다.`,
  },
  {
    id: "envelope-complete",
    name: "대봉투 제작 완료",
    title: "대봉투 제작 완료 안내",
    content: `대봉투 제작이 완료되었습니다.

첨부된 시안을 확인해 주세요.
수정이 필요하시면 문의하기를 통해 연락 부탁드립니다.`,
  },
  {
    id: "contract-cover-complete",
    name: "자문계약서 표지 제작 완료",
    title: "자문계약서 표지 제작 완료 안내",
    content: `자문계약서 표지 제작이 완료되었습니다.

첨부된 시안을 확인해 주세요.
수정이 필요하시면 문의하기를 통해 연락 부탁드립니다.`,
  },
  {
    id: "contract-inner-complete",
    name: "자문계약서 내지 제작 완료",
    title: "자문계약서 내지 제작 완료 안내",
    content: `자문계약서 내지 제작이 완료되었습니다.

첨부된 시안을 확인해 주세요.
수정이 필요하시면 문의하기를 통해 연락 부탁드립니다.`,
  },
];

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // 이메일 첨부파일
  const [emailAttachments, setEmailAttachments] = useState<Array<{
    url: string;
    filename: string;
    size: number;
    type: string;
  }>>([]);
  const [uploadingEmailAttachment, setUploadingEmailAttachment] = useState(false);

  // 문의하기 메시지 (Communication Thread)
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [sendingCommunication, setSendingCommunication] = useState(false);
  const [commThreadTitle, setCommThreadTitle] = useState("");
  const [commCategory, setCommCategory] = useState<"일반" | "제작" | "배송" | "기타">("일반");
  const [commContent, setCommContent] = useState("");
  const [commAttachments, setCommAttachments] = useState<string[]>([]);
  const [uploadingCommAttachment, setUploadingCommAttachment] = useState(false);

  // 전화번호 수정
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");

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

  // 이메일 첨부파일 업로드
  const handleEmailAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingEmailAttachment(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 파일 크기 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`"${file.name}" 파일 크기가 10MB를 초과합니다.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin/email-attachment/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.error || `"${file.name}" 업로드에 실패했습니다.`);
          continue;
        }

        const data = await response.json();
        setEmailAttachments(prev => [...prev, {
          url: data.url,
          filename: data.filename,
          size: data.size,
          type: data.type,
        }]);
      }
    } catch (error) {
      alert("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingEmailAttachment(false);
      e.target.value = "";
    }
  };

  const handleRemoveEmailAttachment = (index: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // 템플릿 선택 핸들러
  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    setShowTemplateDropdown(false);

    if (templateId) {
      const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setMessageTitle(template.title);
        setMessageContent(template.content);
      }
    } else {
      // "직접 작성" 선택 시 초기화
      setMessageTitle("");
      setMessageContent("");
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
          attachments: messageChannel === "EMAIL" ? emailAttachments : undefined,
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
      setEmailAttachments([]);
      setSelectedTemplateId(null);
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

  const handleUpdatePhone = async () => {
    if (!newPhone.trim()) {
      alert("새 전화번호를 입력해주세요.");
      return;
    }

    // 전화번호 형식 검증 (프론트엔드)
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(newPhone)) {
      alert("올바른 전화번호 형식이 아닙니다.\n예: 010-1234-5678 또는 01012345678");
      return;
    }

    if (updatingPhone) return;

    setUpdatingPhone(true);
    try {
      const response = await fetch("/api/admin/users/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          연락처: newPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "전화번호 수정 실패");
      }

      alert(data.message || "전화번호가 성공적으로 변경되었습니다.");
      setShowPhoneDialog(false);
      setNewPhone("");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "전화번호 수정 중 오류가 발생했습니다.");
    } finally {
      setUpdatingPhone(false);
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
            onClick={() => {
              setNewPhone(user.연락처 || "");
              setShowPhoneDialog(true);
            }}
            disabled={loading}
            className="text-teal-600 hover:bg-teal-50 cursor-pointer"
          >
            <Phone className="w-4 h-4 mr-2" />
            전화번호 수정
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
                    <span className="text-gray-600">로고 선호 색상:</span>
                    <div className="flex items-center gap-2">
                      {submission.로고선호색상 && (
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: submission.로고선호색상 }}
                        />
                      )}
                      <p className="font-medium text-gray-900">{submission.로고선호색상 || "-"}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">로고 제작 요청사항:</span>
                    <p className="font-medium text-gray-900 whitespace-pre-wrap mt-1">
                      {submission.로고제작요청사항 || "-"}
                    </p>
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
        <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-gray-900">
              {user.이름}님에게 메시지 발송
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              SMS 또는 이메일을 선택하여 개별 메시지를 발송할 수 있습니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
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

            {/* 템플릿 선택 (이메일 선택 시만 표시) */}
            {messageChannel === "EMAIL" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">템플릿 선택</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-purple-400 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      {selectedTemplateId
                        ? EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name
                        : "직접 작성"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showTemplateDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {showTemplateDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(null)}
                        className={`w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors ${
                          !selectedTemplateId ? "bg-purple-50 text-purple-700" : "text-gray-700"
                        }`}
                      >
                        직접 작성
                      </button>
                      {EMAIL_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectTemplate(template.id)}
                          className={`w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors border-t border-gray-100 ${
                            selectedTemplateId === template.id ? "bg-purple-50 text-purple-700" : "text-gray-700"
                          }`}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">템플릿 선택 후 내용을 수정할 수 있습니다</p>
              </div>
            )}

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
                rows={6}
                maxLength={1000}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y min-h-[120px] max-h-[300px]"
              />
              <p className="text-xs text-gray-500">{messageContent.length}/1000자</p>
            </div>

            {/* 이메일 첨부파일 (이메일 선택 시만 표시) */}
            {messageChannel === "EMAIL" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">
                  첨부파일 (선택)
                </label>
                <div className="space-y-2">
                  {/* 파일 업로드 버튼 */}
                  <div>
                    <input
                      type="file"
                      multiple
                      onChange={handleEmailAttachmentUpload}
                      disabled={uploadingEmailAttachment}
                      className="hidden"
                      id="email-attachment-upload"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                    />
                    <label
                      htmlFor="email-attachment-upload"
                      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        uploadingEmailAttachment ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {uploadingEmailAttachment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4 mr-2" />
                          파일 첨부
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      이미지, PDF, 문서, 엑셀, PPT, 텍스트, ZIP (파일당 최대 10MB, 여러 파일 선택 가능)
                    </p>
                  </div>

                  {/* 첨부된 파일 목록 */}
                  {emailAttachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-medium text-gray-700">
                        첨부된 파일 ({emailAttachments.length}개)
                      </p>
                      {emailAttachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200"
                        >
                          <Paperclip className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmailAttachment(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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

          </div>

          {/* 버튼 - 하단 고정 */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 flex-shrink-0 mt-4">
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
        </DialogContent>
      </Dialog>

      {/* 전화번호 수정 다이얼로그 */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              전화번호 수정
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              <strong>{user.이름}</strong>님의 전화번호를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="new-phone" className="text-sm font-semibold text-gray-900">
                새 전화번호 *
              </label>
              <input
                id="new-phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="010-1234-5678 또는 01012345678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">
                현재 전화번호: {user.연락처 || "없음"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPhoneDialog(false);
                setNewPhone("");
              }}
              disabled={updatingPhone}
              className="flex-1 border-gray-300"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleUpdatePhone}
              disabled={updatingPhone || !newPhone.trim()}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {updatingPhone ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  수정 중...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  수정
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 문의하기 메시지 다이얼로그 */}
      <Dialog open={showCommunicationDialog} onOpenChange={setShowCommunicationDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
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

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
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
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[120px] max-h-[300px]"
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
          </div>

          {/* 버튼 - 하단 고정 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 mt-4">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
