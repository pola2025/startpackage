"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Calendar as CalendarIcon, History, Filter, Search, Zap, MessageSquare, Search as SearchIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface User {
  id: string;
  이름: string;
  email: string;
  연락처: string;
  cohort: { name: string } | null;
  adAutomationEnabled: boolean;
  adAutomationStartDate: Date | null;
  adAutomationEndDate: Date | null;
  smsSettingEnabled: boolean;
  smsSettingStartDate: Date | null;
  smsSettingEndDate: Date | null;
  naverAdSettingEnabled: boolean;
  naverAdSettingStartDate: Date | null;
  naverAdSettingEndDate: Date | null;
  marketingSupportEndDate: Date | null;
}

interface AdAutomationHistory {
  id: string;
  action: string;
  actionBy: string;
  actionByName: string;
  reason: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

export default function AdAutomationManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 선택된 사용자 및 토글 다이얼로그
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState("");

  // 이력 조회
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [history, setHistory] = useState<AdAutomationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.이름.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 상태 필터
    if (statusFilter === "enabled") {
      filtered = filtered.filter((user) => user.adAutomationEnabled);
    } else if (statusFilter === "disabled") {
      filtered = filtered.filter((user) => !user.adAutomationEnabled);
    }

    setFilteredUsers(filtered);
  };

  const openToggleDialog = (user: User) => {
    setSelectedUser(user);
    setEnabled(user.adAutomationEnabled);
    setStartDate(user.adAutomationStartDate ? new Date(user.adAutomationStartDate) : undefined);
    setEndDate(user.adAutomationEndDate ? new Date(user.adAutomationEndDate) : undefined);
    setReason("");
    setToggleDialogOpen(true);
  };

  const handleToggle = async () => {
    if (!selectedUser) return;

    setToggling(true);
    try {
      const response = await fetch(`/api/admin/ad-automation/${selectedUser.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          reason: reason || undefined,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      });

      if (response.ok) {
        alert(enabled ? "광고 자동화가 활성화되었습니다." : "광고 자동화가 비활성화되었습니다.");
        setToggleDialogOpen(false);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || "변경 실패");
      }
    } catch (error) {
      console.error("Toggle failed:", error);
      alert("변경 중 오류가 발생했습니다.");
    } finally {
      setToggling(false);
    }
  };

  const openHistoryDialog = async (user: User) => {
    setSelectedUser(user);
    setHistoryDialogOpen(true);
    setLoadingHistory(true);

    try {
      const response = await fetch(`/api/admin/ad-automation/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (user: User) => {
    if (!user.adAutomationEnabled) {
      return <Badge variant="outline" className="bg-gray-100 border-gray-300 text-gray-700">🔴 꺼짐</Badge>;
    }

    const daysRemaining = user.adAutomationEndDate
      ? Math.ceil((new Date(user.adAutomationEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysRemaining < 0) {
      return <Badge variant="outline" className="bg-red-100 border-red-300 text-red-700">🔴 만료됨</Badge>;
    }

    const isPaid = user.marketingSupportEndDate && user.adAutomationEndDate &&
      new Date(user.adAutomationEndDate) > new Date(user.marketingSupportEndDate);

    if (isPaid) {
      return <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-700">🟡 유료 (D-{daysRemaining})</Badge>;
    }

    return <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">🟢 켜짐 (D-{daysRemaining})</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">광고 자동화 관리</h1>
        <p className="text-gray-600 mt-2">사용자별 광고 자동화 상태 및 이력 관리</p>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="이름 또는 이메일"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">상태 필터</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="enabled">켜짐</SelectItem>
                  <SelectItem value="disabled">꺼짐</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchUsers} variant="outline" className="w-full">
                새로고침
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>
            사용자 목록 ({filteredUsers.length}명)
          </CardTitle>
          <CardDescription>
            광고 자동화 상태를 관리하고 이력을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">로딩 중...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">조건에 맞는 사용자가 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>기수</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead className="text-center">광고 자동화</TableHead>
                    <TableHead className="text-center">SMS 설정</TableHead>
                    <TableHead className="text-center">네이버 설정</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.이름}</TableCell>
                      <TableCell>
                        {user.cohort ? (
                          <Badge variant="outline">{user.cohort.name}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(user)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            user.smsSettingEnabled
                              ? "bg-green-100 border-green-300 text-green-700"
                              : "bg-gray-100 border-gray-300 text-gray-700"
                          }
                        >
                          {user.smsSettingEnabled ? "🟢 켜짐" : "🔴 꺼짐"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            user.naverAdSettingEnabled
                              ? "bg-green-100 border-green-300 text-green-700"
                              : "bg-gray-100 border-gray-300 text-gray-700"
                          }
                        >
                          {user.naverAdSettingEnabled ? "🟢 켜짐" : "🔴 꺼짐"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openToggleDialog(user)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            설정
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openHistoryDialog(user)}
                          >
                            <History className="w-4 h-4 mr-1" />
                            이력
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 토글 다이얼로그 */}
      <Dialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>광고 자동화 설정</DialogTitle>
            <DialogDescription>
              {selectedUser?.이름}님의 광고 자동화 상태를 변경합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">활성화 상태</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{enabled ? "켜짐" : "꺼짐"}</span>
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
            </div>

            {enabled && (
              <>
                <div className="space-y-2">
                  <Label>시작일</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {startDate ? format(startDate, "PPP", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>종료일</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {endDate ? format(endDate, "PPP", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">변경 사유 (선택)</Label>
              <Input
                id="reason"
                placeholder="예: 유료 결제 완료, 3개월 연장"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToggleDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleToggle} disabled={toggling}>
              {toggling ? "변경 중..." : "변경"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 이력 다이얼로그 */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>광고 자동화 이력</DialogTitle>
            <DialogDescription>
              {selectedUser?.이름}님의 광고 자동화 변경 이력입니다
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingHistory ? (
              <p className="text-center py-8 text-gray-500">로딩 중...</p>
            ) : history.length === 0 ? (
              <p className="text-center py-8 text-gray-500">변경 이력이 없습니다</p>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>일시</TableHead>
                      <TableHead>작업</TableHead>
                      <TableHead>관리자</TableHead>
                      <TableHead>시작일</TableHead>
                      <TableHead>종료일</TableHead>
                      <TableHead>사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.action === "enabled"
                                ? "bg-green-100 border-green-300 text-green-700"
                                : "bg-red-100 border-red-300 text-red-700"
                            }
                          >
                            {item.action === "enabled" ? "활성화" : "비활성화"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.actionByName}</TableCell>
                        <TableCell className="text-sm">
                          {item.startDate
                            ? format(new Date(item.startDate), "yyyy-MM-dd", { locale: ko })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.endDate
                            ? format(new Date(item.endDate), "yyyy-MM-dd", { locale: ko })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{item.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
