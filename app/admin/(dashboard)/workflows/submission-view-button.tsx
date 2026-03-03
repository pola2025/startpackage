"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

interface SubmissionViewButtonProps {
  workflow: any;
}

export default function SubmissionViewButton({ workflow }: SubmissionViewButtonProps) {
  const [open, setOpen] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubmission = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${workflow.userId}/submission`);
      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // 항상 최신 데이터를 가져옴
      fetchSubmission();
    }
  };

  // 워크플로우 타입별 기본 탭 결정
  const getDefaultTab = () => {
    switch (workflow.type) {
      case "명함":
      case "명찰":
        return "namecard";
      case "로고":
        return "logo";
      case "홈페이지":
        return "website";
      default:
        return "basic";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-gold-300 text-gold-700 hover:bg-gold-50"
        >
          <FileText className="w-3 h-3 mr-1" />
          제출정보
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl text-gray-900">
            {workflow.user.이름} - {workflow.type} 제작 정보
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            사용자가 제출한 정보를 확인할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-gold-600 mb-3" />
              <p className="text-gray-500">정보를 불러오는 중...</p>
            </div>
          ) : submission ? (
            <Tabs defaultValue={getDefaultTab()} className="mt-4">
            <TabsList className="grid w-full grid-cols-5 bg-gray-100">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="logo">로고</TabsTrigger>
              <TabsTrigger value="namecard">명함</TabsTrigger>
              <TabsTrigger value="website">홈페이지</TabsTrigger>
              <TabsTrigger value="marketing">마케팅</TabsTrigger>
            </TabsList>

            {/* 기본 정보 탭 */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">브랜드 정보</h3>
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

              {/* 계좌 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">계좌 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">은행명:</span>
                    <p className="font-medium text-gray-900">{submission.은행명 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">계좌번호:</span>
                    <p className="font-medium text-gray-900">{submission.계좌번호 || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 배송 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900">배송 정보</h3>
                <div className="text-sm">
                  <span className="text-gray-600">인쇄물 받을 주소:</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {submission.인쇄물받을주소 || submission.주소 || "-"}
                  </p>
                  {submission.인쇄물받을주소 && submission.인쇄물받을주소 !== submission.주소 && (
                    <p className="text-xs text-gray-500 mt-1">
                      (사업장 주소: {submission.주소})
                    </p>
                  )}
                </div>
              </div>

              {/* 파일 */}
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
                        className="text-gold-600 hover:underline flex items-center gap-1 mt-1"
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
                        className="text-gold-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        파일 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 로고 정보 탭 */}
            <TabsContent value="logo" className="space-y-4">
              <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900">로고 디자인 요청사항</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">선호 스타일:</span>
                    <p className="font-medium text-gray-900">{submission.로고선호스타일 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">선호 폰트:</span>
                    <p className="font-medium text-gray-900">{submission.로고선호폰트 || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">선호 색상:</span>
                    {submission.로고선호색상 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: submission.로고선호색상 }}
                        />
                        <p className="font-medium text-gray-900">{submission.로고선호색상}</p>
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">제작 요청사항:</span>
                    <p className="font-medium text-gray-900 whitespace-pre-wrap mt-1">
                      {submission.로고제작요청사항 || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 로고 파일 */}
              {(submission.로고URL || submission.로고예시디자인URL) && (
                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-gray-900">업로드 파일</h3>
                  <div className="space-y-2 text-sm">
                    {submission.로고URL && (
                      <div>
                        <span className="text-gray-600">로고 파일:</span>
                        <a
                          href={submission.로고URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          파일 보기 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {submission.로고예시디자인URL && (
                      <div>
                        <span className="text-gray-600">로고 예시 디자인:</span>
                        <a
                          href={submission.로고예시디자인URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          파일 보기 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 명함 정보 탭 */}
            <TabsContent value="namecard" className="space-y-4">
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900">명함 디자인 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">명함 색상:</span>
                    {submission.명함색상 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: submission.명함색상 }}
                        />
                        <p className="font-medium text-gray-900">{submission.명함색상}</p>
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">명함 시안:</span>
                    <p className="font-medium text-gray-900">{submission.명함시안 || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 명함에 들어갈 정보 */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900">명함 표기 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">이름:</span>
                    <p className="font-medium text-gray-900">{workflow.user.이름 || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">대표번호:</span>
                    <p className="font-medium text-gray-900">{submission.대표번호 || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">이메일:</span>
                    <p className="font-medium text-gray-900">{submission.이메일 || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">주소:</span>
                    <p className="font-medium text-gray-900">{submission.주소 || "-"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 홈페이지 정보 탭 */}
            <TabsContent value="website" className="space-y-4">
              <div className="space-y-3 p-4 bg-gold-50 rounded-lg border border-gold-200">
                <h3 className="font-semibold text-gray-900">홈페이지 정보</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">선택한 스타일:</span>
                    {submission.홈페이지스타일 ? (
                      <a
                        href={submission.홈페이지스타일}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        {(() => {
                          const styles: Record<string, string> = {
                            "https://www.jnipartners.co.kr": "스타일 1",
                            "https://mjgood.imweb.me/": "스타일 2",
                            "https://jmbiz.imweb.me/": "스타일 3",
                            "https://ksupport-center.imweb.me/": "스타일 4",
                            "https://www.wiztion.com/": "스타일 5",
                            "https://fpbiz.imweb.me/": "스타일 6",
                          };
                          return styles[submission.홈페이지스타일] || submission.홈페이지스타일;
                        })()}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="font-medium text-gray-900 mt-1">-</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">컬러 컨셉:</span>
                    {submission.홈페이지컬러컨셉 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-10 h-10 rounded border border-gray-300"
                          style={{ backgroundColor: submission.홈페이지컬러컨셉 }}
                        />
                        <p className="font-medium text-gray-900">{submission.홈페이지컬러컨셉}</p>
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900 mt-1">-</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 아임웹 계정 정보 */}
              <div className="space-y-3 p-4 bg-gold-50 rounded-lg border border-gold-200">
                <h3 className="font-semibold text-gray-900">아임웹 계정 정보</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">아임웹 ID:</span>
                    <p className="font-medium text-gray-900">{submission.아임웹ID || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">아임웹 비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.아임웹PW || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">아임웹 관리자 비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.아임웹관리자PW || "-"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 마케팅 정보 탭 */}
            <TabsContent value="marketing" className="space-y-4">
              {/* 네이버 검색광고 */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900">네이버 검색광고</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">ID:</span>
                    <p className="font-medium text-gray-900">{submission.네이버검색광고ID || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.네이버검색광고PW || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 네이버 클라우드 */}
              <div className="space-y-3 p-4 bg-gold-50 rounded-lg border border-gold-200">
                <h3 className="font-semibold text-gray-900">네이버 클라우드</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">ID:</span>
                    <p className="font-medium text-gray-900">{submission.네이버클라우드ID || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.네이버클라우드PW || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Instagram */}
              <div className="space-y-3 p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h3 className="font-semibold text-gray-900">Instagram</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">ID:</span>
                    <p className="font-medium text-gray-900">{submission.InstagramID || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">비밀번호:</span>
                    <p className="font-medium text-gray-900">{submission.InstagramPW || "-"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          ) : (
            <div className="py-12 text-center text-gray-500">
              제출된 정보가 없습니다.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
