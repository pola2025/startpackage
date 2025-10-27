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
import { MoreVertical, Trash2, Eye, ExternalLink } from "lucide-react";

interface UserActionsProps {
  user: any;
}

export default function UserActions({ user }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

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
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
            className="text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}
