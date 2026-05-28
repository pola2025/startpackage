"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Megaphone, CheckCircle, XCircle, Clock, User, Mail, Phone, Calendar } from "lucide-react";
import {
  ONLINE_MARKETING_BILLING_MONTHS,
  ONLINE_MARKETING_MONTHLY_PRICE,
  ONLINE_MARKETING_TOTAL_PRICE,
  formatWon,
} from "@/lib/marketing-pricing";

interface MarketingExtensionRequest {
  id: string;
  userId: string;
  requestDate: string;
  currentEndDate: string;
  newEndDate: string;
  requestMessage: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminResponse: string | null;
  user: {
    id: string;
    이름: string;
    email: string;
    연락처: string;
    cohort: {
      name: string;
    } | null;
  };
}

export default function MarketingExtensionsPage() {
  const [requests, setRequests] = useState<MarketingExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [selectedRequest, setSelectedRequest] = useState<MarketingExtensionRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [processing, setProcessing] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/marketing-extension/list");
      const data = await response.json();

      if (response.ok) {
        // Filter by status
        const filtered = data.filter((req: MarketingExtensionRequest) => req.status === statusFilter);
        setRequests(filtered);
      } else {
        console.error("Failed to fetch requests:", data.error);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const openDialog = (request: MarketingExtensionRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
    setAdminResponse("");
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === "reject" && !adminResponse) {
      alert("거부 사유를 입력해주세요.");
      return;
    }

    setProcessing(true);

    try {
      const endpoint = `/api/admin/marketing-extension/${selectedRequest.id}/${actionType}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminResponse }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setDialogOpen(false);
        fetchRequests();
      } else {
        alert(data.error || "처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
            <Clock className="w-3 h-3 mr-1" />
            대기중
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
            <CheckCircle className="w-3 h-3 mr-1" />
            승인됨
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/50">
            <XCircle className="w-3 h-3 mr-1" />
            거부됨
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold neon-text-red">마케팅 지원 연장 신청</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1 sm:mt-2">사용자의 마케팅 지원 기간 연장 신청을 관리합니다</p>
        </div>
        <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-neon-red flex-shrink-0" />
      </div>

      {/* Status Filter - 모바일에서 가로 스크롤 */}
      <Card className="glass border-white/10">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              size="sm"
              className={`flex-shrink-0 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm ${
                statusFilter === "pending"
                  ? "bg-neon-red text-white"
                  : "border-white/20 text-gray-400"
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              대기중
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={() => setStatusFilter("approved")}
              size="sm"
              className={`flex-shrink-0 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm ${
                statusFilter === "approved"
                  ? "bg-neon-red text-white"
                  : "border-white/20 text-gray-400"
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              승인됨
            </Button>
            <Button
              variant={statusFilter === "rejected" ? "default" : "outline"}
              onClick={() => setStatusFilter("rejected")}
              size="sm"
              className={`flex-shrink-0 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm ${
                statusFilter === "rejected"
                  ? "bg-neon-red text-white"
                  : "border-white/20 text-gray-400"
              }`}
            >
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              거부됨
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <Card className="glass border-white/10">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">로딩 중...</p>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="glass border-white/10">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">연장 신청이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="glass border-white/10">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                {/* 모바일: 세로 배치, 데스크톱: 가로 배치 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{request.user.이름}</span>
                      {/* 모바일에서 배지를 이름 옆에 표시 */}
                      <span className="sm:hidden">{getStatusBadge(request.status)}</span>
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{request.user.email}</span>
                    </p>
                    {request.user.cohort && (
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        기수: {request.user.cohort.name}
                      </p>
                    )}
                  </div>
                  {/* 데스크톱에서만 배지 표시 */}
                  <div className="hidden sm:block flex-shrink-0">
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
                <div className="space-y-3">
                  {/* 날짜 정보 그리드 */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-black/30 p-3 sm:p-4 rounded-lg">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">현재 종료일</p>
                      <p className="text-xs sm:text-sm text-white font-medium flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {new Date(request.currentEndDate).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">연장 후 종료일</p>
                      <p className="text-xs sm:text-sm text-green-400 font-medium flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-3 h-3 text-green-400 flex-shrink-0" />
                        {new Date(request.newEndDate).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm text-gray-400">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">연락처: {request.user.연락처}</span>
                    </p>
                    <p className="text-xs sm:text-sm">
                      신청일시:{" "}
                      {new Date(request.requestDate).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </p>
                    {request.requestMessage && (
                      <div className="bg-gold-500/10 p-2.5 sm:p-3 rounded border border-gold-500/20">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">요청 메시지</p>
                        <p className="text-xs sm:text-sm text-gold-300 break-words">{request.requestMessage}</p>
                      </div>
                    )}
                    {request.reviewedAt && (
                      <p className="text-xs sm:text-sm">
                        처리일시:{" "}
                        {new Date(request.reviewedAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        })}
                      </p>
                    )}
                    {request.adminResponse && (
                      <div className={`p-2.5 sm:p-3 rounded border ${
                        request.status === "approved"
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-red-500/10 border-red-500/20"
                      }`}>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">관리자 응답</p>
                        <p className={`text-xs sm:text-sm break-words ${
                          request.status === "approved" ? "text-green-300" : "text-red-300"
                        }`}>{request.adminResponse}</p>
                      </div>
                    )}
                  </div>

                  {/* 승인/거부 버튼 - 모바일에서 전체 너비 */}
                  {request.status === "pending" && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 pt-3 border-t border-white/10">
                      <Button
                        onClick={() => openDialog(request, "approve")}
                        className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto h-10 sm:h-9 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        승인
                      </Button>
                      <Button
                        onClick={() => openDialog(request, "reject")}
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 w-full sm:w-auto h-10 sm:h-9 text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        거부
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog/Drawer - 모바일: Drawer, 데스크톱: Dialog */}
      {isDesktop ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-black/95 border-white/20 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-white">
                {actionType === "approve" ? "마케팅 지원 연장 승인" : "마케팅 지원 연장 거부"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-black/50 p-4 rounded border border-white/10">
                <p className="text-sm text-gray-400">신청자: {selectedRequest?.user.이름}</p>
                <p className="text-sm text-gray-400">이메일: {selectedRequest?.user.email}</p>
                <p className="text-sm text-gray-400 mt-2">
                  현재 종료일: {selectedRequest && new Date(selectedRequest.currentEndDate).toLocaleDateString("ko-KR")}
                </p>
                <p className="text-sm text-green-400 font-medium">
                  연장 후 종료일: {selectedRequest && new Date(selectedRequest.newEndDate).toLocaleDateString("ko-KR")}
                </p>
              </div>

              {actionType === "approve" && (
                <div className="bg-yellow-500/10 p-4 rounded border border-yellow-500/20">
                  <p className="text-sm font-medium text-yellow-300 mb-2">결제 정보 안내</p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>계좌번호: 우리은행 1005-302-954803</p>
                    <p>예금주: 폴라애드(이재호)</p>
                    <p>
                      금액: {formatWon(ONLINE_MARKETING_TOTAL_PRICE)}원 (VAT 포함,{" "}
                      {ONLINE_MARKETING_BILLING_MONTHS}개월분)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      월 {formatWon(ONLINE_MARKETING_MONTHLY_PRICE)}원 (VAT 포함)
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adminResponse" className="text-gray-300">
                  {actionType === "approve" ? "관리자 메시지 (선택사항)" : "거부 사유 (필수)"}
                </Label>
                <Textarea
                  id="adminResponse"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "승인 메시지를 입력하세요..."
                      : "거부 사유를 입력하세요..."
                  }
                  className="bg-black/50 border-white/20 text-white resize-none"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={processing}
                className="border-white/20 text-gray-400"
              >
                취소
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === "reject" && !adminResponse)}
                className={
                  actionType === "approve"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }
              >
                {processing ? "처리 중..." : actionType === "approve" ? "승인" : "거부"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent className="bg-black/95 border-white/20 max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-white text-lg">
                {actionType === "approve" ? "마케팅 지원 연장 승인" : "마케팅 지원 연장 거부"}
              </DrawerTitle>
            </DrawerHeader>

            <div className="px-4 space-y-3 overflow-y-auto flex-1">
              <div className="bg-black/50 p-3 rounded border border-white/10">
                <p className="text-sm text-gray-400">신청자: {selectedRequest?.user.이름}</p>
                <p className="text-sm text-gray-400 truncate">이메일: {selectedRequest?.user.email}</p>
                <p className="text-sm text-gray-400 mt-2">
                  현재 종료일: {selectedRequest && new Date(selectedRequest.currentEndDate).toLocaleDateString("ko-KR")}
                </p>
                <p className="text-sm text-green-400 font-medium">
                  연장 후 종료일: {selectedRequest && new Date(selectedRequest.newEndDate).toLocaleDateString("ko-KR")}
                </p>
              </div>

              {actionType === "approve" && (
                <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                  <p className="text-sm font-medium text-yellow-300 mb-2">결제 정보 안내</p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>계좌번호: 우리은행 1005-302-954803</p>
                    <p>예금주: 폴라애드(이재호)</p>
                    <p>
                      금액: {formatWon(ONLINE_MARKETING_TOTAL_PRICE)}원 (VAT 포함,{" "}
                      {ONLINE_MARKETING_BILLING_MONTHS}개월분)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      월 {formatWon(ONLINE_MARKETING_MONTHLY_PRICE)}원 (VAT 포함)
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adminResponseMobile" className="text-gray-300 text-sm">
                  {actionType === "approve" ? "관리자 메시지 (선택사항)" : "거부 사유 (필수)"}
                </Label>
                <Textarea
                  id="adminResponseMobile"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "승인 메시지를 입력하세요..."
                      : "거부 사유를 입력하세요..."
                  }
                  className="bg-black/50 border-white/20 text-white resize-none text-base"
                  rows={3}
                />
              </div>
            </div>

            <DrawerFooter className="pt-3">
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={handleAction}
                  disabled={processing || (actionType === "reject" && !adminResponse)}
                  className={`w-full h-11 text-base ${
                    actionType === "approve"
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {processing ? "처리 중..." : actionType === "approve" ? "승인" : "거부"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={processing}
                  className="w-full h-11 text-base border-white/20 text-gray-400"
                >
                  취소
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
