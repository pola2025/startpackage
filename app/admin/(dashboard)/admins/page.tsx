"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Mail, Calendar, Trash2, Key, Edit } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "operator",
  });

  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    const userRole = (session?.user as any)?.role;
    if (userRole !== "super") {
      router.push("/admin");
      return;
    }
    fetchAdmins();
  }, [session, router]);

  const fetchAdmins = async () => {
    try {
      const response = await fetch("/api/admin/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error("관리자 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/admin/admins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        alert("관리자가 생성되었습니다.");
        setShowCreateDialog(false);
        setCreateForm({ email: "", name: "", password: "", role: "operator" });
        fetchAdmins();
      } else {
        const data = await response.json();
        alert(data.error || "관리자 생성에 실패했습니다.");
      }
    } catch (error) {
      alert("관리자 생성 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm("정말 이 관리자를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch("/api/admin/admins/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        alert("관리자가 삭제되었습니다.");
        fetchAdmins();
      } else {
        const data = await response.json();
        alert(data.error || "관리자 삭제에 실패했습니다.");
      }
    } catch (error) {
      alert("관리자 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin || !resetPassword) return;

    try {
      const response = await fetch("/api/admin/admins/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: selectedAdmin.id,
          newPassword: resetPassword,
        }),
      });

      if (response.ok) {
        alert("비밀번호가 초기화되었습니다.");
        setShowResetDialog(false);
        setSelectedAdmin(null);
        setResetPassword("");
      } else {
        const data = await response.json();
        alert(data.error || "비밀번호 초기화에 실패했습니다.");
      }
    } catch (error) {
      alert("비밀번호 초기화 중 오류가 발생했습니다.");
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      super: { label: "최고 관리자", color: "bg-red-100 text-red-700 border-red-300" },
      designer: { label: "디자이너", color: "bg-purple-100 text-purple-700 border-purple-300" },
      operator: { label: "운영자", color: "bg-blue-100 text-blue-700 border-blue-300" },
    };

    const badge = badges[role] || badges.operator;
    return (
      <Badge className={`${badge.color} border`}>
        {badge.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 관리</h1>
          <p className="text-gray-600">시스템 관리자 계정을 관리합니다</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border-2 border-purple-200">
            <Shield className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">
              {admins.length}
            </span>
            <span className="text-sm text-gray-600">명</span>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            관리자 추가
          </Button>
        </div>
      </div>

      <Card className="bg-white border-2 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">관리자 목록</CardTitle>
          <CardDescription className="text-gray-600">
            등록된 관리자 계정 정보
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">이름</TableHead>
                  <TableHead className="font-semibold text-gray-700">이메일</TableHead>
                  <TableHead className="font-semibold text-gray-700">권한</TableHead>
                  <TableHead className="font-semibold text-gray-700">생성일</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const isCurrentUser = (session?.user as any)?.id === admin.id;
                  return (
                    <TableRow key={admin.id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {admin.name}
                        {isCurrentUser && (
                          <Badge className="ml-2 bg-green-100 text-green-700 border-green-300 border">
                            나
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(admin.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowResetDialog(true);
                            }}
                            className="hover:bg-blue-50"
                          >
                            <Key className="w-4 h-4 mr-1" />
                            비밀번호
                          </Button>
                          {!isCurrentUser && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(admin.id)}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 관리자 추가 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 추가</DialogTitle>
            <DialogDescription>새로운 관리자 계정을 생성합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="홍길동"
              />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="최소 4자 이상"
              />
            </div>
            <div>
              <Label htmlFor="role">권한</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">운영자</SelectItem>
                  <SelectItem value="designer">디자이너</SelectItem>
                  <SelectItem value="super">최고 관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
            <DialogDescription>
              {selectedAdmin?.name}님의 비밀번호를 초기화합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="최소 4자 이상"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetDialog(false);
                setSelectedAdmin(null);
                setResetPassword("");
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleResetPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
