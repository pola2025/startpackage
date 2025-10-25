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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, CheckCircle, XCircle, Clock, User, Mail, Phone, Calendar } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold neon-text-red">마케팅 지원 연장 신청</h1>
          <p className="text-gray-400 mt-2">사용자의 마케팅 지원 기간 연장 신청을 관리합니다</p>
        </div>
        <Megaphone className="w-8 h-8 text-neon-red" />
      </div>

      {/* Status Filter */}
      <Card className="glass border-white/10">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              className={
                statusFilter === "pending"
                  ? "bg-neon-red text-white"
                  : "border-white/20 text-gray-400"
              }
            >
              <Clock className="w-4 h-4 mr-2" />
              대기중
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={() => setStatusFilter("approved")}
              className={
                statusFilter === "approved"
                  ? "bg-neon-red text-white"
                  : "border-white/20 text-gray-400"
              }
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              승인됨
            </Button>
            <Button
              variant={statusFilter === "rejected" ? "default" : "outline"}
              onClick={() => setStatusFilter("rejected")}
              className={
                statusFilter === "rejected"
                  ? "bg-neon-red text-white"
                  : "border-white/20 text-gray-400"
              }
            >
              <XCircle className="w-4 h-4 mr-2" />
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
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {request.user.이름}
                    </CardTitle>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {request.user.email}
                    </p>
                    {request.user.cohort && (
                      <p className="text-sm text-gray-400 mt-1">
                        기수: {request.user.cohort.name}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/30 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">현재 종료일</p>
                      <p className="text-sm text-white font-medium flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {new Date(request.currentEndDate).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">연장 후 종료일</p>
                      <p className="text-sm text-green-400 font-medium flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-green-400" />
                        {new Date(request.newEndDate).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      연락처: {request.user.연락처}
                    </p>
                    <p>
                      신청일시:{" "}
                      {new Date(request.requestDate).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </p>
                    {request.requestMessage && (
                      <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                        <p className="text-xs text-gray-500 mb-1">요청 메시지</p>
                        <p className="text-sm text-blue-300">{request.requestMessage}</p>
                      </div>
                    )}
                    {request.reviewedAt && (
                      <p>
                        처리일시:{" "}
                        {new Date(request.reviewedAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        })}
                      </p>
                    )}
                    {request.adminResponse && (
                      <div className={`p-3 rounded border ${
                        request.status === "approved"
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-red-500/10 border-red-500/20"
                      }`}>
                        <p className="text-xs text-gray-500 mb-1">관리자 응답</p>
                        <p className={`text-sm ${
                          request.status === "approved" ? "text-green-300" : "text-red-300"
                        }`}>{request.adminResponse}</p>
                      </div>
                    )}
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => openDialog(request, "approve")}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        승인
                      </Button>
                      <Button
                        onClick={() => openDialog(request, "reject")}
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
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

      {/* Action Dialog */}
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
                  <p>금액: 660,000원 (VAT 포함, 3개월분)</p>
                  <p className="text-xs text-gray-500 mt-1">월 220,000원 (VAT 포함)</p>
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
    </div>
  );
}
