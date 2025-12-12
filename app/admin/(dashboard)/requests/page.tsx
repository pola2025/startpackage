"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserPlus, CheckCircle, XCircle, Clock, Mail, Phone, Calendar } from "lucide-react";

interface AdminRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  rejectReason?: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [assignedRole, setAssignedRole] = useState<"super" | "designer" | "operator">(
    "operator"
  );
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/requests?status=${statusFilter}`);
      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests);
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

  const openDialog = (request: AdminRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
    setRejectReason("");
    setAssignedRole("operator");
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);

    try {
      const response = await fetch("/api/admin/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: actionType,
          rejectReason: actionType === "reject" ? rejectReason : undefined,
          assignedRole: actionType === "approve" ? assignedRole : undefined,
        }),
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
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            대기중
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            승인됨
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">가입 신청</h1>
          <p className="text-sm sm:text-base text-gray-600">관리자 가입 신청을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-50 rounded-lg border-2 border-blue-200">
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <span className="text-lg sm:text-2xl font-bold text-blue-600">{requests.length}</span>
          <span className="text-xs sm:text-sm text-gray-600">건</span>
        </div>
      </div>

      {/* Status Filter */}
      <Card className="bg-white border-2 border-gray-200 shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              size="sm"
              className={
                statusFilter === "pending"
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              대기중
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={() => setStatusFilter("approved")}
              size="sm"
              className={
                statusFilter === "approved"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              승인됨
            </Button>
            <Button
              variant={statusFilter === "rejected" ? "default" : "outline"}
              onClick={() => setStatusFilter("rejected")}
              size="sm"
              className={
                statusFilter === "rejected"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              거부됨
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardContent className="py-8">
            <p className="text-center text-gray-500">로딩 중...</p>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardContent className="py-8">
            <p className="text-center text-gray-500">가입 신청이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="bg-white border-2 border-gray-200 shadow-md">
              <CardContent className="p-3 sm:p-4">
                {/* Header: 이름 + 상태 */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{request.name}</h3>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{request.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{request.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>
                      신청: {new Date(request.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </span>
                  </div>
                  {request.reviewedAt && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>
                        처리: {new Date(request.reviewedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </span>
                    </div>
                  )}
                  {request.rejectReason && (
                    <p className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                      거부 사유: {request.rejectReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {request.status === "pending" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      onClick={() => openDialog(request, "approve")}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      승인
                    </Button>
                    <Button
                      onClick={() => openDialog(request, "reject")}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-9"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      거부
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {actionType === "approve" ? "가입 신청 승인" : "가입 신청 거부"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">이름: <strong>{selectedRequest?.name}</strong></p>
              <p className="text-sm text-gray-700">이메일: <strong>{selectedRequest?.email}</strong></p>
            </div>

            {actionType === "approve" && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700">
                  권한 부여
                </Label>
                <Select value={assignedRole} onValueChange={(value: any) => setAssignedRole(value)}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operator (일반 관리자)</SelectItem>
                    <SelectItem value="designer">Designer (디자이너)</SelectItem>
                    <SelectItem value="super">Super (최고 관리자)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejectReason" className="text-gray-700">
                  거부 사유
                </Label>
                <Input
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거부 사유를 입력하세요"
                  className="border-gray-300"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processing}
              className="border-gray-300"
            >
              취소
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === "reject" && !rejectReason)}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
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
