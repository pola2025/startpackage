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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
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
import { Settings, Calendar as CalendarIcon, History, Filter, Search, Zap, MessageSquare, Search as SearchIcon, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { HomepageBadge } from "@/components/admin/homepage-badge";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  homepageCompleted: boolean;
  homepageCompletedAt: Date | null;
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

  // 기수별 접기/펼치기 상태
  const [collapsedCohorts, setCollapsedCohorts] = useState<Set<string>>(new Set());

  // 선택된 사용자 및 토글 다이얼로그
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  // 광고 자동화
  const [adEnabled, setAdEnabled] = useState(false);
  const [adStartDate, setAdStartDate] = useState<Date>();
  const [adEndDate, setAdEndDate] = useState<Date>();

  // SMS 설정
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsStartDate, setSmsStartDate] = useState<Date>();
  const [smsEndDate, setSmsEndDate] = useState<Date>();

  // 네이버 광고 설정
  const [naverEnabled, setNaverEnabled] = useState(false);
  const [naverStartDate, setNaverStartDate] = useState<Date>();
  const [naverEndDate, setNaverEndDate] = useState<Date>();

  // 홈페이지 설정
  const [homepageCompleted, setHomepageCompleted] = useState(false);
  const [homepageCompletedAt, setHomepageCompletedAt] = useState<Date>();

  const [reason, setReason] = useState("");

  // 이력 조회
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [history, setHistory] = useState<AdAutomationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 모바일 감지
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

    // 광고 자동화
    setAdEnabled(user.adAutomationEnabled);
    setAdStartDate(user.adAutomationStartDate ? new Date(user.adAutomationStartDate) : undefined);
    setAdEndDate(user.adAutomationEndDate ? new Date(user.adAutomationEndDate) : undefined);

    // SMS 설정
    setSmsEnabled(user.smsSettingEnabled);
    setSmsStartDate(user.smsSettingStartDate ? new Date(user.smsSettingStartDate) : undefined);
    setSmsEndDate(user.smsSettingEndDate ? new Date(user.smsSettingEndDate) : undefined);

    // 네이버 광고 설정
    setNaverEnabled(user.naverAdSettingEnabled);
    setNaverStartDate(user.naverAdSettingStartDate ? new Date(user.naverAdSettingStartDate) : undefined);
    setNaverEndDate(user.naverAdSettingEndDate ? new Date(user.naverAdSettingEndDate) : undefined);

    // 홈페이지 설정
    setHomepageCompleted(user.homepageCompleted);
    setHomepageCompletedAt(user.homepageCompletedAt ? new Date(user.homepageCompletedAt) : undefined);

    setReason("");
    setToggleDialogOpen(true);
  };

  const handleToggle = async () => {
    if (!selectedUser) return;

    setToggling(true);
    try {
      const response = await fetch(`/api/admin/ad-automation/${selectedUser.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 광고 자동화
          adAutomationEnabled: adEnabled,
          adAutomationStartDate: adStartDate?.toISOString() || null,
          adAutomationEndDate: adEndDate?.toISOString() || null,

          // SMS 설정
          smsSettingEnabled: smsEnabled,
          smsSettingStartDate: smsStartDate?.toISOString() || null,
          smsSettingEndDate: smsEndDate?.toISOString() || null,

          // 네이버 광고 설정
          naverAdSettingEnabled: naverEnabled,
          naverAdSettingStartDate: naverStartDate?.toISOString() || null,
          naverAdSettingEndDate: naverEndDate?.toISOString() || null,

          // 홈페이지 설정
          homepageCompleted: homepageCompleted,
          homepageCompletedAt: homepageCompletedAt?.toISOString() || null,

          reason: reason || undefined,
        }),
      });

      if (response.ok) {
        alert("설정이 저장되었습니다.");
        setToggleDialogOpen(false);
        fetchUsers();
      } else {
        const data = await response.json();
        console.error("API Error:", data);
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

  // 기수별 사용자 그룹화
  const groupedByCohort = filteredUsers.reduce((acc, user) => {
    const cohortName = user.cohort?.name || "기수 미지정";
    if (!acc[cohortName]) {
      acc[cohortName] = [];
    }
    acc[cohortName].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  // 기수 이름 정렬 (숫자 기준 내림차순, "기수 미지정"은 마지막)
  const sortedCohortNames = Object.keys(groupedByCohort).sort((a, b) => {
    if (a === "기수 미지정") return 1;
    if (b === "기수 미지정") return -1;

    // 숫자 추출하여 내림차순 정렬
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numB - numA;
  });

  // 기수 접기/펼치기 토글
  const toggleCohort = (cohortName: string) => {
    setCollapsedCohorts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cohortName)) {
        newSet.delete(cohortName);
      } else {
        newSet.add(cohortName);
      }
      return newSet;
    });
  };

  // 전체 접기
  const collapseAll = () => {
    setCollapsedCohorts(new Set(sortedCohortNames));
  };

  // 전체 펼치기
  const expandAll = () => {
    setCollapsedCohorts(new Set());
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">광고 자동화 관리</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">사용자별 광고 자동화 상태 및 이력 관리</p>
      </div>

      {/* 필터 및 검색 - 모바일 최적화 */}
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2 md:col-span-1">
              <Label htmlFor="search" className="text-xs sm:text-sm">검색</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="이름 또는 이메일"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 sm:h-9 text-base sm:text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="text-xs sm:text-sm">상태 필터</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1 h-10 sm:h-9 text-base sm:text-sm">
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
              <Button onClick={fetchUsers} variant="outline" className="w-full h-10 sm:h-9 text-sm">
                <RefreshCw className="w-4 h-4 mr-2 sm:mr-1" />
                <span className="sm:inline">새로고침</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">
                사용자 목록 ({filteredUsers.length}명)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                광고 자동화 상태를 관리하고 이력을 확인할 수 있습니다
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs px-2 sm:px-3">
                전체 펼치기
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs px-2 sm:px-3">
                전체 접기
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
          {loading ? (
            <p className="text-center py-8 text-gray-500 text-sm">로딩 중...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">조건에 맞는 사용자가 없습니다</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sortedCohortNames.map((cohortName) => {
                const cohortUsers = groupedByCohort[cohortName];
                const isCollapsed = collapsedCohorts.has(cohortName);
                const enabledCount = cohortUsers.filter(u => u.adAutomationEnabled).length;

                return (
                  <div key={cohortName} className="border rounded-lg overflow-hidden">
                    {/* 기수 헤더 (클릭하여 접기/펼치기) */}
                    <button
                      type="button"
                      onClick={() => toggleCohort(cohortName)}
                      className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">{cohortName}</span>
                        <Badge variant="outline" className="bg-white text-xs">
                          {cohortUsers.length}명
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${enabledCount > 0 ? "bg-green-100 border-green-300 text-green-700" : "bg-gray-100"}`}
                        >
                          활성 {enabledCount}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500 hidden sm:inline">
                        {isCollapsed ? "클릭하여 펼치기" : "클릭하여 접기"}
                      </span>
                    </button>

                    {/* 사용자 목록 (접혀있지 않을 때만 표시) */}
                    {!isCollapsed && (
                      <>
                        {/* 데스크톱: 테이블 */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>이름</TableHead>
                                <TableHead>이메일</TableHead>
                                <TableHead className="text-center">광고 자동화</TableHead>
                                <TableHead className="text-center">SMS 설정</TableHead>
                                <TableHead className="text-center">네이버 설정</TableHead>
                                <TableHead className="text-center">홈페이지</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cohortUsers.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.이름}</TableCell>
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
                                  <TableCell className="text-center">
                                    <HomepageBadge
                                      completed={user.homepageCompleted}
                                      completedAt={user.homepageCompletedAt}
                                    />
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

                        {/* 모바일: 카드 형태 */}
                        <div className="md:hidden divide-y">
                          {cohortUsers.map((user) => (
                            <div key={user.id} className="p-3 space-y-2.5">
                              {/* 사용자 정보 */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm text-gray-900 truncate">{user.이름}</p>
                                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                {getStatusBadge(user)}
                              </div>

                              {/* 상태 배지들 */}
                              <div className="flex flex-wrap gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0.5 ${
                                    user.smsSettingEnabled
                                      ? "bg-green-100 border-green-300 text-green-700"
                                      : "bg-gray-100 border-gray-300 text-gray-700"
                                  }`}
                                >
                                  SMS {user.smsSettingEnabled ? "켜짐" : "꺼짐"}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0.5 ${
                                    user.naverAdSettingEnabled
                                      ? "bg-green-100 border-green-300 text-green-700"
                                      : "bg-gray-100 border-gray-300 text-gray-700"
                                  }`}
                                >
                                  네이버 {user.naverAdSettingEnabled ? "켜짐" : "꺼짐"}
                                </Badge>
                                <HomepageBadge
                                  completed={user.homepageCompleted}
                                  completedAt={user.homepageCompletedAt}
                                />
                              </div>

                              {/* 버튼 */}
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openToggleDialog(user)}
                                  className="flex-1 h-9 text-xs"
                                >
                                  <Settings className="w-3.5 h-3.5 mr-1" />
                                  설정
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openHistoryDialog(user)}
                                  className="h-9 text-xs px-3"
                                >
                                  <History className="w-3.5 h-3.5 mr-1" />
                                  이력
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 토글 다이얼로그/드로어 - 모바일 최적화 */}
      {isDesktop ? (
        <Dialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>광고 자동화 설정</DialogTitle>
              <DialogDescription>
                {selectedUser?.이름}님의 광고 자동화, SMS 설정, 네이버 광고 설정을 관리합니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 광고 자동화 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-gold-600" />
                  <h3 className="font-semibold text-lg">광고 자동화</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ad-enabled">활성화 상태</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{adEnabled ? "켜짐" : "꺼짐"}</span>
                    <Switch
                      id="ad-enabled"
                      checked={adEnabled}
                      onCheckedChange={(checked) => {
                        setAdEnabled(checked);
                        if (checked && !adStartDate) {
                          setAdStartDate(new Date());
                        }
                        if (checked && !adEndDate && selectedUser?.marketingSupportEndDate) {
                          setAdEndDate(new Date(selectedUser.marketingSupportEndDate));
                        }
                      }}
                    />
                  </div>
                </div>

                {adEnabled && (
                  <div className="space-y-3 mt-3">
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CalendarIcon className="w-4 h-4 text-gold-600 mt-0.5" />
                        <div className="flex-1 text-sm">
                          <p className="text-gray-700 mb-1">
                            <span className="font-medium">시작일:</span> {adStartDate ? format(adStartDate, "yyyy년 M월 d일", { locale: ko }) : "미설정"}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">종료일:</span> {adEndDate ? format(adEndDate, "yyyy년 M월 d일", { locale: ko }) : "미설정"}
                            {selectedUser?.marketingSupportEndDate && adEndDate &&
                             new Date(adEndDate).getTime() === new Date(selectedUser.marketingSupportEndDate).getTime() && (
                              <span className="ml-2 text-xs text-gold-600">(기수 마케팅 종료일)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (adEndDate) {
                          const newEndDate = new Date(adEndDate);
                          newEndDate.setMonth(newEndDate.getMonth() + 3);
                          setAdEndDate(newEndDate);
                        }
                      }}
                      disabled={!adEndDate}
                    >
                      + 3개월 연장
                    </Button>
                  </div>
                )}
              </div>

              {/* SMS 설정 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-lg">SMS 설정</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-enabled">활성화 상태</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{smsEnabled ? "켜짐" : "꺼짐"}</span>
                    <Switch
                      id="sms-enabled"
                      checked={smsEnabled}
                      onCheckedChange={(checked) => {
                        setSmsEnabled(checked);
                        if (checked && !smsStartDate) {
                          setSmsStartDate(new Date());
                        } else if (!checked) {
                          setSmsEndDate(new Date());
                        }
                      }}
                    />
                  </div>
                </div>

                {smsEnabled && smsStartDate && (
                  <div className="text-sm text-gray-600 mt-2">
                    설정 완료일: {format(smsStartDate, "yyyy년 M월 d일", { locale: ko })}
                  </div>
                )}
              </div>

              {/* 네이버 광고 설정 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <SearchIcon className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-lg">네이버 광고 설정</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="naver-enabled">활성화 상태</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{naverEnabled ? "켜짐" : "꺼짐"}</span>
                    <Switch
                      id="naver-enabled"
                      checked={naverEnabled}
                      onCheckedChange={(checked) => {
                        setNaverEnabled(checked);
                        if (checked && !naverStartDate) {
                          setNaverStartDate(new Date());
                        } else if (!checked) {
                          setNaverEndDate(new Date());
                        }
                      }}
                    />
                  </div>
                </div>

                {naverEnabled && naverStartDate && (
                  <div className="text-sm text-gray-600 mt-2">
                    설정 완료일: {format(naverStartDate, "yyyy년 M월 d일", { locale: ko })}
                  </div>
                )}
              </div>

              {/* 홈페이지 설정 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <h3 className="font-semibold text-lg">홈페이지</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="homepage-completed">완료 상태</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{homepageCompleted ? "완료" : "미완료"}</span>
                    <Switch
                      id="homepage-completed"
                      checked={homepageCompleted}
                      onCheckedChange={(checked) => {
                        setHomepageCompleted(checked);
                        if (checked) {
                          setHomepageCompletedAt(new Date());
                        } else {
                          setHomepageCompletedAt(undefined);
                        }
                      }}
                    />
                  </div>
                </div>

                {homepageCompleted && homepageCompletedAt && (
                  <div className="text-sm text-gray-600 mt-2">
                    완료일: {format(homepageCompletedAt, "yyyy년 M월 d일", { locale: ko })}
                  </div>
                )}
              </div>

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
      ) : (
        <Drawer open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg">광고 자동화 설정</DrawerTitle>
              <DrawerDescription className="text-sm">
                {selectedUser?.이름}님의 설정을 관리합니다
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 space-y-4 overflow-y-auto flex-1 pb-4">
              {/* 광고 자동화 */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gold-600" />
                  <h3 className="font-semibold text-sm">광고 자동화</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ad-enabled-mobile" className="text-sm">활성화</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{adEnabled ? "켜짐" : "꺼짐"}</span>
                    <Switch
                      id="ad-enabled-mobile"
                      checked={adEnabled}
                      onCheckedChange={(checked) => {
                        setAdEnabled(checked);
                        if (checked && !adStartDate) {
                          setAdStartDate(new Date());
                        }
                        if (checked && !adEndDate && selectedUser?.marketingSupportEndDate) {
                          setAdEndDate(new Date(selectedUser.marketingSupportEndDate));
                        }
                      }}
                    />
                  </div>
                </div>

                {adEnabled && (
                  <div className="space-y-2 mt-2">
                    <div className="bg-gold-50 border border-gold-200 rounded p-2 text-xs">
                      <p className="text-gray-700">시작: {adStartDate ? format(adStartDate, "yy.M.d", { locale: ko }) : "-"}</p>
                      <p className="text-gray-700">종료: {adEndDate ? format(adEndDate, "yy.M.d", { locale: ko }) : "-"}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        if (adEndDate) {
                          const newEndDate = new Date(adEndDate);
                          newEndDate.setMonth(newEndDate.getMonth() + 3);
                          setAdEndDate(newEndDate);
                        }
                      }}
                      disabled={!adEndDate}
                    >
                      + 3개월 연장
                    </Button>
                  </div>
                )}
              </div>

              {/* SMS 설정 */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-sm">SMS 설정</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-enabled-mobile" className="text-sm">활성화</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{smsEnabled ? "켜짐" : "꺼짐"}</span>
                    <Switch
                      id="sms-enabled-mobile"
                      checked={smsEnabled}
                      onCheckedChange={(checked) => {
                        setSmsEnabled(checked);
                        if (checked && !smsStartDate) {
                          setSmsStartDate(new Date());
                        } else if (!checked) {
                          setSmsEndDate(new Date());
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 네이버 광고 설정 */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <SearchIcon className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-sm">네이버 광고</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="naver-enabled-mobile" className="text-sm">활성화</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{naverEnabled ? "켜짐" : "꺼짐"}</span>
                    <Switch
                      id="naver-enabled-mobile"
                      checked={naverEnabled}
                      onCheckedChange={(checked) => {
                        setNaverEnabled(checked);
                        if (checked && !naverStartDate) {
                          setNaverStartDate(new Date());
                        } else if (!checked) {
                          setNaverEndDate(new Date());
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 홈페이지 설정 */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <h3 className="font-semibold text-sm">홈페이지</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="homepage-completed-mobile" className="text-sm">완료 상태</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{homepageCompleted ? "완료" : "미완료"}</span>
                    <Switch
                      id="homepage-completed-mobile"
                      checked={homepageCompleted}
                      onCheckedChange={(checked) => {
                        setHomepageCompleted(checked);
                        if (checked) {
                          setHomepageCompletedAt(new Date());
                        } else {
                          setHomepageCompletedAt(undefined);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason-mobile" className="text-sm">변경 사유 (선택)</Label>
                <Input
                  id="reason-mobile"
                  placeholder="예: 유료 결제 완료"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 text-base"
                />
              </div>
            </div>
            <DrawerFooter className="pt-2">
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={handleToggle} disabled={toggling} className="w-full h-11">
                  {toggling ? "변경 중..." : "변경"}
                </Button>
                <Button variant="outline" onClick={() => setToggleDialogOpen(false)} className="w-full h-11">
                  취소
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* 이력 다이얼로그/드로어 - 모바일 최적화 */}
      {isDesktop ? (
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
      ) : (
        <Drawer open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg">광고 자동화 이력</DrawerTitle>
              <DrawerDescription className="text-sm">
                {selectedUser?.이름}님의 변경 이력
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto flex-1 pb-4">
              {loadingHistory ? (
                <p className="text-center py-8 text-gray-500 text-sm">로딩 중...</p>
              ) : history.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">변경 이력이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            item.action === "enabled"
                              ? "bg-green-100 border-green-300 text-green-700"
                              : "bg-red-100 border-red-300 text-red-700"
                          }`}
                        >
                          {item.action === "enabled" ? "활성화" : "비활성화"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(item.createdAt), "yy.M.d HH:mm", { locale: ko })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">관리자:</span>
                          <span className="ml-1 text-gray-900">{item.actionByName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">시작:</span>
                          <span className="ml-1 text-gray-900">
                            {item.startDate ? format(new Date(item.startDate), "yy.M.d", { locale: ko }) : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">종료:</span>
                          <span className="ml-1 text-gray-900">
                            {item.endDate ? format(new Date(item.endDate), "yy.M.d", { locale: ko }) : "-"}
                          </span>
                        </div>
                      </div>
                      {item.reason && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DrawerFooter className="pt-2">
              <Button variant="outline" onClick={() => setHistoryDialogOpen(false)} className="w-full h-11">
                닫기
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
