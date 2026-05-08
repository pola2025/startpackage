"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Globe,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ChevronDown,
  ChevronRight,
  Palette,
  Clock,
  FileText,
  Bell,
} from "lucide-react";

interface HomepageWorkflow {
  id: string;
  status: string;
  시안URL: string | null;
  자료제출일: string | null;
  예상도착일: string | null;
  createdAt: string;
}

interface User {
  id: string;
  이름: string;
  email: string;
  연락처: string;
  cohort: { id: string; name: string } | null;
  homepageCompleted: boolean;
  submission: {
    브랜드명: string | null;
    홈페이지제작방식: string | null;
    홈페이지스타일: string | null;
    홈페이지컬러컨셉: string | null;
    도메인주소: string | null;
    도메인관리사이트: string | null;
    도메인관리ID: string | null;
    도메인관리PW: string | null;
    GmailID: string | null;
    GmailPW: string | null;
  } | null;
  homepageWorkflow: HomepageWorkflow | null;
}

interface Cohort {
  id: string;
  name: string;
}

// 스타일 이름 매핑
const STYLE_NAMES: Record<string, string> = {
  "https://www.jnipartners.co.kr": "스타일 1",
  "https://bizcoaching.co.kr/": "스타일 2",
  "https://jmbiz.imweb.me/": "스타일 3",
  "https://ksupport-center.imweb.me/": "스타일 4",
  "https://www.wiztion.com/": "스타일 5",
  "https://www.k-eai.kr/index.html": "스타일 6",
  // 레거시 URL 지원
  "https://mjgood.imweb.me/": "스타일 2",
  "https://fpbiz.imweb.me/": "스타일 6",
};

export default function HomepageManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 기수별 접기/펼치기 상태
  const [collapsedCohorts, setCollapsedCohorts] = useState<Set<string>>(
    new Set(),
  );

  // 상세 보기 다이얼로그
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const filterUsers = useCallback(() => {
    let filtered = [...users];

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.이름.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.submission?.브랜드명 || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // 기수 필터
    if (cohortFilter !== "all") {
      filtered = filtered.filter((user) => user.cohort?.id === cohortFilter);
    }

    // 상태 필터
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "requested":
          // 제작 요청됨 (스타일/컬러 선택 또는 워크플로우 존재)
          filtered = filtered.filter(
            (user) =>
              user.homepageWorkflow ||
              user.submission?.홈페이지스타일 ||
              user.submission?.홈페이지컬러컨셉,
          );
          break;
        case "in-progress":
          // 제작 진행 중
          filtered = filtered.filter(
            (user) =>
              user.homepageWorkflow &&
              user.homepageWorkflow.status === "제작 진행 중",
          );
          break;
        case "completed":
          // 제작 완료
          filtered = filtered.filter((user) => user.homepageCompleted);
          break;
        case "not-requested":
          // 미요청
          filtered = filtered.filter(
            (user) =>
              !user.homepageWorkflow &&
              !user.submission?.홈페이지스타일 &&
              !user.submission?.홈페이지컬러컨셉,
          );
          break;
        case "info-incomplete":
          // 정보 미완료 (요청했지만 도메인/카드 정보 미입력)
          filtered = filtered.filter((user) => {
            const hasRequest =
              user.homepageWorkflow || user.submission?.홈페이지스타일;
            const hasFullInfo = user.submission?.홈페이지제작방식;
            return hasRequest && !hasFullInfo;
          });
          break;
      }
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, cohortFilter, statusFilter]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, cohortsRes] = await Promise.all([
        fetch("/api/admin/homepage"),
        fetch("/api/admin/cohorts"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }

      if (cohortsRes.ok) {
        const data = await cohortsRes.json();
        setCohorts(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 기수별로 사용자 그룹화
  const groupedUsers = filteredUsers.reduce(
    (acc, user) => {
      const cohortName = user.cohort?.name || "기수 미지정";
      if (!acc[cohortName]) {
        acc[cohortName] = [];
      }
      acc[cohortName].push(user);
      return acc;
    },
    {} as Record<string, User[]>,
  );

  // 기수 순서대로 정렬
  const sortedCohortNames = Object.keys(groupedUsers).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numB - numA;
  });

  const toggleCohortCollapse = (cohortName: string) => {
    setCollapsedCohorts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cohortName)) {
        newSet.delete(cohortName);
      } else {
        newSet.add(cohortName);
      }
      return newSet;
    });
  };

  const getWorkflowStatusBadge = (user: User) => {
    if (user.homepageCompleted) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          제작 완료
        </Badge>
      );
    }

    if (user.homepageWorkflow) {
      const status = user.homepageWorkflow.status;
      if (status === "제작 진행 중") {
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            제작 진행 중
          </Badge>
        );
      }
      if (status === "제작 완료") {
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            제작 완료
          </Badge>
        );
      }
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          {status}
        </Badge>
      );
    }

    // 워크플로우 없지만 스타일/컬러 선택함
    if (user.submission?.홈페이지스타일 || user.submission?.홈페이지컬러컨셉) {
      return (
        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
          스타일 선택됨
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-500">
        미요청
      </Badge>
    );
  };

  const getInfoStatusBadge = (user: User) => {
    const submission = user.submission;
    if (!submission) {
      return (
        <Badge variant="outline" className="bg-gray-50">
          정보 없음
        </Badge>
      );
    }

    const hasDomain =
      submission.도메인주소 &&
      submission.도메인관리ID &&
      submission.도메인관리PW;

    if (hasDomain) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          정보 완료
        </Badge>
      );
    }

    // 스타일/컬러만 선택하고 도메인 정보는 아직 미입력
    if (submission.홈페이지스타일 || submission.홈페이지컬러컨셉) {
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          도메인 미입력
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-50">
        정보 없음
      </Badge>
    );
  };

  const getStyleName = (url: string | null | undefined) => {
    if (!url) return null;
    return STYLE_NAMES[url] || "커스텀";
  };

  const openDetailDialog = (user: User) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  // 최근 7일 내 접수된 요청
  const recentRequests = users
    .filter((u) => {
      if (!u.homepageWorkflow?.자료제출일) return false;
      const submitted = new Date(u.homepageWorkflow.자료제출일);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return submitted >= sevenDaysAgo;
    })
    .sort((a, b) => {
      const dateA = new Date(a.homepageWorkflow!.자료제출일!).getTime();
      const dateB = new Date(b.homepageWorkflow!.자료제출일!).getTime();
      return dateB - dateA;
    });

  // 통계
  const stats = {
    total: users.length,
    requested: users.filter(
      (u) =>
        u.homepageWorkflow ||
        u.submission?.홈페이지스타일 ||
        u.submission?.홈페이지컬러컨셉,
    ).length,
    inProgress: users.filter(
      (u) => u.homepageWorkflow && u.homepageWorkflow.status === "제작 진행 중",
    ).length,
    completed: users.filter((u) => u.homepageCompleted).length,
    notRequested: users.filter(
      (u) =>
        !u.homepageWorkflow &&
        !u.submission?.홈페이지스타일 &&
        !u.submission?.홈페이지컬러컨셉,
    ).length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          홈페이지 관리
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          사용자별 홈페이지 제작 요청 및 진행 상태를 관리합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">전체 사용자</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">제작 요청</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.requested}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">제작 진행 중</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.inProgress}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">제작 완료</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">미요청</p>
            <p className="text-2xl font-bold text-gray-400">
              {stats.notRequested}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 접수 알림 */}
      {recentRequests.length > 0 && (
        <Card className="border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <Bell className="w-4 h-4" />
              최근 접수 ({recentRequests.length}건)
              <Badge className="bg-blue-100 text-blue-600 text-xs">
                최근 7일
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentRequests.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => openDetailDialog(user)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {user.이름}
                      </span>
                      {user.cohort && (
                        <Badge variant="outline" className="text-xs">
                          {user.cohort.name}
                        </Badge>
                      )}
                    </div>
                    {user.submission?.브랜드명 && (
                      <span className="text-sm text-gray-600">
                        {user.submission.브랜드명}
                      </span>
                    )}
                    {user.submission?.홈페이지스타일 && (
                      <span className="text-sm text-blue-600">
                        {getStyleName(user.submission.홈페이지스타일)}
                      </span>
                    )}
                    {user.submission?.홈페이지컬러컨셉 && (
                      <div className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{
                            backgroundColor: user.submission.홈페이지컬러컨셉,
                          }}
                        />
                        <span className="text-xs font-mono text-gray-500">
                          {user.submission.홈페이지컬러컨셉}
                        </span>
                      </div>
                    )}
                    {user.submission?.홈페이지제작방식 && (
                      <Badge variant="outline" className="text-xs">
                        {user.submission.홈페이지제작방식}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      {user.homepageWorkflow?.자료제출일 &&
                        new Date(
                          user.homepageWorkflow.자료제출일,
                        ).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                    </span>
                    {getWorkflowStatusBadge(user)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="이름, 이메일 또는 브랜드명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="기수 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 기수</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="진행 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="requested">제작 요청됨</SelectItem>
                <SelectItem value="in-progress">제작 진행 중</SelectItem>
                <SelectItem value="completed">제작 완료</SelectItem>
                <SelectItem value="info-incomplete">정보 미완료</SelectItem>
                <SelectItem value="not-requested">미요청</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>홈페이지 제작 현황</CardTitle>
          <CardDescription>
            제작 요청 정보와 진행 상태를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              조건에 맞는 사용자가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCohortNames.map((cohortName) => {
                const cohortUsers = groupedUsers[cohortName];
                const isCollapsed = collapsedCohorts.has(cohortName);

                return (
                  <div
                    key={cohortName}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCohortCollapse(cohortName)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {cohortName}
                        </span>
                        <Badge variant="outline">{cohortUsers.length}명</Badge>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>이름</TableHead>
                              <TableHead>브랜드명</TableHead>
                              <TableHead>선택 스타일</TableHead>
                              <TableHead>컬러</TableHead>
                              <TableHead>제작방식</TableHead>
                              <TableHead>접수일</TableHead>
                              <TableHead>진행 상태</TableHead>
                              <TableHead>정보 입력</TableHead>
                              <TableHead className="text-right">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cohortUsers.map((user) => (
                              <TableRow
                                key={user.id}
                                className={
                                  user.homepageWorkflow &&
                                  !user.homepageCompleted
                                    ? ""
                                    : user.homepageCompleted
                                      ? "bg-green-50/30"
                                      : ""
                                }
                              >
                                <TableCell className="font-medium">
                                  {user.이름}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {user.submission?.브랜드명 || (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {user.submission?.홈페이지스타일 ? (
                                    <a
                                      href={user.submission.홈페이지스타일}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {getStyleName(
                                        user.submission.홈페이지스타일,
                                      )}
                                    </a>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {user.submission?.홈페이지컬러컨셉 ? (
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className="w-5 h-5 rounded border border-gray-300"
                                        style={{
                                          backgroundColor:
                                            user.submission.홈페이지컬러컨셉,
                                        }}
                                      />
                                      <span className="text-xs font-mono text-gray-500">
                                        {user.submission.홈페이지컬러컨셉}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {user.submission?.홈페이지제작방식 ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {user.submission.홈페이지제작방식}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-gray-500">
                                  {user.homepageWorkflow?.자료제출일 ? (
                                    new Date(
                                      user.homepageWorkflow.자료제출일,
                                    ).toLocaleDateString("ko-KR", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getWorkflowStatusBadge(user)}
                                </TableCell>
                                <TableCell>
                                  {getInfoStatusBadge(user)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDetailDialog(user)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    상세
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 정보 다이얼로그 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {selectedUser?.이름} - 홈페이지 정보
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.cohort?.name} · {selectedUser?.email}
              {selectedUser?.submission?.브랜드명 && (
                <> · 브랜드: {selectedUser.submission.브랜드명}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 mt-4">
              {/* 제작 요청 정보 (스타일 + 컬러) */}
              {(selectedUser.submission?.홈페이지스타일 ||
                selectedUser.submission?.홈페이지컬러컨셉) && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    제작 요청 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="text-xs text-blue-600">
                        선택 스타일
                      </Label>
                      {selectedUser.submission?.홈페이지스타일 ? (
                        <a
                          href={selectedUser.submission.홈페이지스타일}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {getStyleName(selectedUser.submission.홈페이지스타일)}
                        </a>
                      ) : (
                        <p className="text-gray-400 mt-1">선택 안됨</p>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="text-xs text-blue-600">컬러 컨셉</Label>
                      {selectedUser.submission?.홈페이지컬러컨셉 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-8 h-8 rounded-lg border border-gray-200"
                            style={{
                              backgroundColor:
                                selectedUser.submission.홈페이지컬러컨셉,
                            }}
                          />
                          <span className="font-mono text-sm">
                            {selectedUser.submission.홈페이지컬러컨셉}
                          </span>
                        </div>
                      ) : (
                        <p className="text-gray-400 mt-1">선택 안됨</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 워크플로우 진행 상태 */}
              {selectedUser.homepageWorkflow && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-purple-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    제작 진행 상태
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="text-xs text-purple-600">상태</Label>
                      <div className="mt-1">
                        {getWorkflowStatusBadge(selectedUser)}
                      </div>
                    </div>
                    {selectedUser.homepageWorkflow.예상도착일 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Label className="text-xs text-purple-600">
                          예상 완료일
                        </Label>
                        <p className="font-medium text-gray-900 mt-1">
                          {selectedUser.homepageWorkflow.예상도착일}
                        </p>
                      </div>
                    )}
                    {selectedUser.homepageWorkflow.자료제출일 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Label className="text-xs text-purple-600">
                          요청일
                        </Label>
                        <p className="font-medium text-gray-900 mt-1">
                          {new Date(
                            selectedUser.homepageWorkflow.자료제출일,
                          ).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    )}
                    {selectedUser.homepageWorkflow.시안URL && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Label className="text-xs text-purple-600">
                          홈페이지 URL
                        </Label>
                        <a
                          href={selectedUser.homepageWorkflow.시안URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-purple-600 hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          사이트 보기
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 도메인 정보 */}
              {selectedUser.submission &&
                (selectedUser.submission.도메인주소 ||
                  selectedUser.submission.도메인관리ID ||
                  selectedUser.submission.도메인관리PW) && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-purple-700 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      도메인 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUser.submission.도메인주소 && (
                        <div className="p-3 bg-purple-50 rounded-lg md:col-span-2">
                          <Label className="text-xs text-purple-600">
                            도메인 주소
                          </Label>
                          <p className="font-medium text-gray-900 mt-1">
                            {selectedUser.submission.도메인주소}
                          </p>
                        </div>
                      )}
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Label className="text-xs text-purple-600">
                          도메인 관리 사이트
                        </Label>
                        <p className="font-medium text-gray-900 mt-1">
                          {selectedUser.submission.도메인관리사이트 || "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Label className="text-xs text-purple-600">
                          도메인 관리 ID
                        </Label>
                        <p className="font-medium text-gray-900 mt-1 font-mono">
                          {selectedUser.submission.도메인관리ID || "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <Label className="text-xs text-purple-600">
                          도메인 관리 PW
                        </Label>
                        <p className="font-medium text-gray-900 mt-1 font-mono">
                          {selectedUser.submission.도메인관리PW || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Gmail 계정 정보 */}
              {selectedUser.submission &&
                (selectedUser.submission.GmailID ||
                  selectedUser.submission.GmailPW) && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-green-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Gmail 계정 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Label className="text-xs text-green-600">
                          Gmail ID
                        </Label>
                        <p className="font-medium text-gray-900 mt-1 font-mono">
                          {selectedUser.submission.GmailID || "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Label className="text-xs text-green-600">
                          Gmail PW
                        </Label>
                        <p className="font-medium text-gray-900 mt-1 font-mono">
                          {selectedUser.submission.GmailPW || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* 미요청 상태 */}
              {!selectedUser.submission?.홈페이지스타일 &&
                !selectedUser.submission?.홈페이지컬러컨셉 &&
                !selectedUser.homepageWorkflow && (
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      아직 홈페이지 제작을 요청하지 않았습니다.
                    </p>
                  </div>
                )}

              {/* 제작 완료 상태 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-gray-500">
                      제작 완료 상태
                    </Label>
                    <p className="font-medium mt-1">
                      {selectedUser.homepageCompleted ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          완료
                        </span>
                      ) : (
                        <span className="text-gray-400">미완료</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
