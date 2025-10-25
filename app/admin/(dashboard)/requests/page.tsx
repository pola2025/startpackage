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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserPlus, CheckCircle, XCircle, Clock } from "lucide-react";

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
          <h1 className="text-3xl font-bold neon-text-red">관리자 가입 신청</h1>
          <p className="text-gray-400 mt-2">관리자 가입 신청을 관리합니다</p>
        </div>
        <UserPlus className="w-8 h-8 text-neon-red" />
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
            <p className="text-center text-gray-400">가입 신청이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{request.name}</CardTitle>
                    <p className="text-sm text-gray-400 mt-1">{request.email}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>전화번호: {request.phone}</p>
                  <p>
                    신청일시:{" "}
                    {new Date(request.createdAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </p>
                  {request.reviewedAt && (
                    <p>
                      처리일시:{" "}
                      {new Date(request.reviewedAt).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </p>
                  )}
                  {request.rejectReason && (
                    <p className="text-red-400">거부 사유: {request.rejectReason}</p>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-black/95 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === "approve" ? "가입 신청 승인" : "가입 신청 거부"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">이름: {selectedRequest?.name}</p>
              <p className="text-sm text-gray-400">이메일: {selectedRequest?.email}</p>
            </div>

            {actionType === "approve" && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-300">
                  권한 부여
                </Label>
                <Select value={assignedRole} onValueChange={(value: any) => setAssignedRole(value)}>
                  <SelectTrigger className="bg-black/50 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/95 border-white/20">
                    <SelectItem value="operator">Operator (일반 관리자)</SelectItem>
                    <SelectItem value="designer">Designer (디자이너)</SelectItem>
                    <SelectItem value="super">Super (최고 관리자)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejectReason" className="text-gray-300">
                  거부 사유
                </Label>
                <Input
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거부 사유를 입력하세요"
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>
            )}
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
              disabled={processing || (actionType === "reject" && !rejectReason)}
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
