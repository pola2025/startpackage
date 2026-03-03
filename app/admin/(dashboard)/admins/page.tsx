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
import {
  Shield,
  Plus,
  Mail,
  Calendar,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Link2,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSetupUrlDialog, setShowSetupUrlDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [setupUrl, setSetupUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetting2fa, setResetting2fa] = useState(false);

  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    role: "operator",
  });

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

      const data = await response.json();

      if (response.ok) {
        setShowCreateDialog(false);
        setCreateForm({ email: "", name: "", role: "operator" });
        fetchAdmins();
        // 생성 후 2FA 설정 URL 표시
        if (data.setupUrl) {
          setSetupUrl(data.setupUrl);
          setSelectedAdmin({ ...data.admin, twoFactorEnabled: false });
          setShowSetupUrlDialog(true);
        }
      } else {
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

  const handleReset2fa = async (admin: Admin) => {
    const action = admin.twoFactorEnabled ? "재설정" : "설정 링크 생성";
    if (
      admin.twoFactorEnabled &&
      !confirm(
        `${admin.name}님의 2FA 인증을 재설정하시겠습니까?\n재설정 후 새로 Google Authenticator에 등록해야 합니다.`
      )
    )
      return;

    setResetting2fa(true);
    try {
      const response = await fetch("/api/admin/admins/reset-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: admin.id }),
      });

      const data = await response.json();

      if (response.ok && data.setupUrl) {
        setSetupUrl(data.setupUrl);
        setSelectedAdmin(admin);
        setShowSetupUrlDialog(true);
        fetchAdmins();
      } else {
        alert(data.error || `2FA ${action}에 실패했습니다.`);
      }
    } catch (error) {
      alert(`2FA ${action} 중 오류가 발생했습니다.`);
    } finally {
      setResetting2fa(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(setupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = setupUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      super: {
        label: "최고 관리자",
        color: "bg-gold-100 text-gold-700 border-gold-300",
      },
      designer: {
        label: "디자이너",
        color: "bg-purple-100 text-purple-700 border-purple-300",
      },
      operator: {
        label: "운영자",
        color: "bg-gold-100 text-gold-700 border-gold-300",
      },
    };

    const badge = badges[role] || badges.operator;
    return <Badge className={`${badge.color} border`}>{badge.label}</Badge>;
  };

  const get2faBadge = (enabled: boolean) => {
    if (enabled) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 border">
          <ShieldCheck className="w-3 h-3 mr-1" />
          2FA 등록
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-300 border">
        <ShieldAlert className="w-3 h-3 mr-1" />
        2FA 미등록
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            관리자 관리
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            시스템 관리자 계정 및 2FA 인증을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-50 rounded-lg border-2 border-purple-200">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <span className="text-lg sm:text-2xl font-bold text-purple-600">
              {admins.length}
            </span>
            <span className="text-xs sm:text-sm text-gray-600">명</span>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-navy-900 hover:bg-navy-800 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">관리자 추가</span>
            <span className="sm:hidden">추가</span>
          </Button>
        </div>
      </div>

      <Card className="bg-white border-2 border-gray-200 shadow-lg">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl text-gray-900">
            관리자 목록
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-gray-600">
            등록된 관리자 계정 및 2FA 인증 상태
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {admins.map((admin) => {
              const isCurrentUser =
                (session?.user as any)?.id === admin.id;
              return (
                <div
                  key={admin.id}
                  className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50"
                >
                  {/* Header: 이름 + 권한 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {admin.name}
                      </span>
                      {isCurrentUser && (
                        <Badge className="bg-green-100 text-green-700 border-green-300 border text-xs">
                          나
                        </Badge>
                      )}
                    </div>
                    {getRoleBadge(admin.role)}
                  </div>

                  {/* Info */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {new Date(admin.createdAt).toLocaleDateString("ko-KR")}{" "}
                        가입
                      </span>
                    </div>
                    <div className="pt-0.5">
                      {get2faBadge(admin.twoFactorEnabled)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReset2fa(admin)}
                      disabled={resetting2fa}
                      className={`flex-1 h-8 text-xs ${
                        admin.twoFactorEnabled
                          ? "hover:bg-amber-50 text-amber-700"
                          : "hover:bg-gold-50 text-gold-700"
                      }`}
                    >
                      {admin.twoFactorEnabled ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          2FA 재설정
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 mr-1" />
                          2FA 설정 링크
                        </>
                      )}
                    </Button>
                    {!isCurrentUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(admin.id)}
                        className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">
                    이름
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    이메일
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    권한
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    2FA 상태
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    생성일
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">
                    관리
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const isCurrentUser =
                    (session?.user as any)?.id === admin.id;
                  return (
                    <TableRow
                      key={admin.id}
                      className="border-gray-200 hover:bg-gray-50"
                    >
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
                      <TableCell>
                        {get2faBadge(admin.twoFactorEnabled)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(admin.createdAt).toLocaleDateString(
                            "ko-KR"
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReset2fa(admin)}
                            disabled={resetting2fa}
                            className={
                              admin.twoFactorEnabled
                                ? "hover:bg-amber-50 text-amber-700"
                                : "hover:bg-gold-50 text-gold-700"
                            }
                          >
                            {admin.twoFactorEnabled ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1" />
                                2FA 재설정
                              </>
                            ) : (
                              <>
                                <Link2 className="w-4 h-4 mr-1" />
                                2FA 설정 링크
                              </>
                            )}
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
            <DialogDescription>
              새로운 관리자 계정을 생성합니다. 생성 후 2FA 설정 링크가
              발급됩니다.
            </DialogDescription>
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
            <div className="rounded-lg bg-gold-50 border border-gold-200 p-3">
              <p className="text-sm text-navy-700">
                <ShieldCheck className="w-4 h-4 inline mr-1" />
                로그인은 Google Authenticator 2FA 인증으로만 가능합니다.
                관리자 생성 후 2FA 설정 링크를 전달해주세요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-navy-900 hover:bg-navy-800"
            >
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA 설정 URL 다이얼로그 */}
      <Dialog
        open={showSetupUrlDialog}
        onOpenChange={(open) => {
          setShowSetupUrlDialog(open);
          if (!open) {
            setSetupUrl("");
            setSelectedAdmin(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold-600" />
              2FA 설정 링크
            </DialogTitle>
            <DialogDescription>
              {selectedAdmin?.name}님 ({selectedAdmin?.email})에게 아래 링크를
              전달하세요.
              <br />
              이 링크로 접속하면 Google Authenticator에 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 pr-12 break-all text-sm text-gray-700 font-mono max-h-32 overflow-y-auto">
                {setupUrl}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                className="absolute top-2 right-2 h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 font-medium">
                링크가 클립보드에 복사되었습니다.
              </p>
            )}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-700">
                <ShieldAlert className="w-4 h-4 inline mr-1" />
                이 링크는 1회용입니다. 2FA 등록이 완료되면 자동으로
                만료됩니다. 링크를 안전하게 전달해주세요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCopyUrl}
              className="bg-navy-900 hover:bg-navy-800"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  복사 완료
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  링크 복사
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
