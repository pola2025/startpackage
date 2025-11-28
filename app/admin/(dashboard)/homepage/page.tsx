"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Upload,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  CreditCard,
} from "lucide-react";
// toast 대신 alert 사용

interface User {
  id: string;
  이름: string;
  email: string;
  연락처: string;
  cohort: { id: string; name: string } | null;
  homepageCompleted: boolean;
  submission: {
    홈페이지제작방식: string | null;
    홈페이지스타일: string | null;
    홈페이지컬러컨셉: string | null;
    아임웹ID: string | null;
    아임웹PW: string | null;
    아임웹관리자PW: string | null;
    도메인관리사이트: string | null;
    도메인관리ID: string | null;
    도메인관리PW: string | null;
    해외결제카드앞면URL: string | null;
    해외결제카드뒷면URL: string | null;
    해외결제카드유효기간: string | null;
  } | null;
}

interface Cohort {
  id: string;
  name: string;
}

export default function HomepageManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // 기수별 접기/펼치기 상태
  const [collapsedCohorts, setCollapsedCohorts] = useState<Set<string>>(new Set());

  // 상세 보기 다이얼로그
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 이미지 미리보기
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 기수 필터
    if (cohortFilter !== "all") {
      filtered = filtered.filter((user) => user.cohort?.id === cohortFilter);
    }

    // 제작 방식 필터
    if (methodFilter !== "all") {
      if (methodFilter === "none") {
        filtered = filtered.filter((user) => !user.submission?.홈페이지제작방식);
      } else {
        filtered = filtered.filter(
          (user) => user.submission?.홈페이지제작방식 === methodFilter
        );
      }
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, cohortFilter, methodFilter]);

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
  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const cohortName = user.cohort?.name || "기수 미지정";
    if (!acc[cohortName]) {
      acc[cohortName] = [];
    }
    acc[cohortName].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  // 기수 순서대로 정렬
  const sortedCohortNames = Object.keys(groupedUsers).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numB - numA; // 최신 기수가 위로
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

  const getMethodBadge = (method: string | null | undefined) => {
    if (!method) {
      return <Badge variant="outline" className="bg-gray-50">미선택</Badge>;
    }
    if (method === "아임웹") {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">아임웹</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">외부서비스</Badge>;
  };

  const getStatusBadge = (user: User) => {
    const submission = user.submission;
    if (!submission?.홈페이지제작방식) {
      return <Badge variant="outline" className="bg-gray-50">제작방식 미선택</Badge>;
    }

    if (submission.홈페이지제작방식 === "아임웹") {
      const hasAllImweb = submission.아임웹ID && submission.아임웹PW && submission.아임웹관리자PW;
      if (hasAllImweb) {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">정보 완료</Badge>;
      }
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">정보 미완료</Badge>;
    }

    if (submission.홈페이지제작방식 === "외부서비스") {
      const hasAllExternal =
        submission.도메인관리사이트 &&
        submission.도메인관리ID &&
        submission.도메인관리PW &&
        submission.해외결제카드앞면URL &&
        submission.해외결제카드뒷면URL &&
        submission.해외결제카드유효기간;
      if (hasAllExternal) {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">정보 완료</Badge>;
      }
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">정보 미완료</Badge>;
    }

    return <Badge variant="outline">알 수 없음</Badge>;
  };

  const openDetailDialog = (user: User) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  // 통계
  const stats = {
    total: users.length,
    imweb: users.filter((u) => u.submission?.홈페이지제작방식 === "아임웹").length,
    external: users.filter((u) => u.submission?.홈페이지제작방식 === "외부서비스").length,
    notSelected: users.filter((u) => !u.submission?.홈페이지제작방식).length,
    completed: users.filter((u) => u.homepageCompleted).length,
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-7 h-7" />
          홈페이지 관리
        </h1>
        <p className="text-gray-600 mt-1">
          사용자별 홈페이지 제작 방식 및 제출 정보를 관리합니다.
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
            <p className="text-sm text-gray-500">아임웹 선택</p>
            <p className="text-2xl font-bold text-blue-600">{stats.imweb}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">외부서비스 선택</p>
            <p className="text-2xl font-bold text-purple-600">{stats.external}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">미선택</p>
            <p className="text-2xl font-bold text-gray-400">{stats.notSelected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">제작 완료</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="이름 또는 이메일로 검색..."
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
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="제작 방식" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="아임웹">아임웹</SelectItem>
                <SelectItem value="외부서비스">외부서비스</SelectItem>
                <SelectItem value="none">미선택</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자별 홈페이지 정보</CardTitle>
          <CardDescription>
            제작 방식과 제출 상태를 확인하고 상세 정보를 조회할 수 있습니다.
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
                  <div key={cohortName} className="border rounded-lg overflow-hidden">
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
                        <span className="font-semibold text-gray-900">{cohortName}</span>
                        <Badge variant="outline">{cohortUsers.length}명</Badge>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이름</TableHead>
                            <TableHead>이메일</TableHead>
                            <TableHead>제작 방식</TableHead>
                            <TableHead>제출 상태</TableHead>
                            <TableHead>제작 완료</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cohortUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.이름}</TableCell>
                              <TableCell className="text-gray-500">{user.email}</TableCell>
                              <TableCell>{getMethodBadge(user.submission?.홈페이지제작방식)}</TableCell>
                              <TableCell>{getStatusBadge(user)}</TableCell>
                              <TableCell>
                                {user.homepageCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
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
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 mt-4">
              {/* 제작 방식 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm text-gray-500">제작 방식</Label>
                <div className="mt-1">
                  {getMethodBadge(selectedUser.submission?.홈페이지제작방식)}
                </div>
              </div>

              {/* 아임웹 정보 */}
              {selectedUser.submission?.홈페이지제작방식 === "아임웹" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    아임웹 계정 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Label className="text-xs text-blue-600">아임웹 ID</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.아임웹ID || "-"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Label className="text-xs text-blue-600">아임웹 PW</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.아임웹PW ? "●●●●●●" : "-"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg md:col-span-2">
                      <Label className="text-xs text-blue-600">아임웹 관리자 PW</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.아임웹관리자PW ? "●●●●●●" : "-"}
                      </p>
                    </div>
                  </div>

                  {/* 홈페이지 스타일/컬러 */}
                  {(selectedUser.submission?.홈페이지스타일 || selectedUser.submission?.홈페이지컬러컨셉) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {selectedUser.submission?.홈페이지스타일 && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Label className="text-xs text-gray-500">홈페이지 스타일</Label>
                          <a
                            href={selectedUser.submission.홈페이지스타일}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            샘플 보기
                          </a>
                        </div>
                      )}
                      {selectedUser.submission?.홈페이지컬러컨셉 && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Label className="text-xs text-gray-500">컬러 컨셉</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: selectedUser.submission.홈페이지컬러컨셉 }}
                            />
                            <span className="font-mono text-sm">
                              {selectedUser.submission.홈페이지컬러컨셉}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 외부 서비스 정보 */}
              {selectedUser.submission?.홈페이지제작방식 === "외부서비스" && (
                <div className="space-y-4">
                  {/* 도메인 정보 */}
                  <h3 className="font-semibold text-purple-700 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    도메인 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="text-xs text-purple-600">도메인 관리 사이트</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.도메인관리사이트 || "-"}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="text-xs text-purple-600">도메인 ID</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.도메인관리ID || "-"}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="text-xs text-purple-600">도메인 PW</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.도메인관리PW ? "●●●●●●" : "-"}
                      </p>
                    </div>
                  </div>

                  {/* 카드 정보 */}
                  <h3 className="font-semibold text-purple-700 flex items-center gap-2 mt-6">
                    <CreditCard className="w-4 h-4" />
                    해외결제 카드 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="text-xs text-purple-600">카드 앞면</Label>
                      {selectedUser.submission?.해외결제카드앞면URL ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setPreviewImage(selectedUser.submission?.해외결제카드앞면URL || null)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          이미지 보기
                        </Button>
                      ) : (
                        <p className="text-gray-400 mt-1">미등록</p>
                      )}
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="text-xs text-purple-600">카드 뒷면</Label>
                      {selectedUser.submission?.해외결제카드뒷면URL ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setPreviewImage(selectedUser.submission?.해외결제카드뒷면URL || null)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          이미지 보기
                        </Button>
                      ) : (
                        <p className="text-gray-400 mt-1">미등록</p>
                      )}
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg md:col-span-2">
                      <Label className="text-xs text-purple-600">카드 유효기간</Label>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedUser.submission?.해외결제카드유효기간 || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 미선택 상태 */}
              {!selectedUser.submission?.홈페이지제작방식 && (
                <div className="p-6 bg-gray-50 rounded-lg text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">아직 제작 방식을 선택하지 않았습니다.</p>
                </div>
              )}

              {/* 제작 완료 상태 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-gray-500">제작 완료 상태</Label>
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

      {/* 이미지 미리보기 다이얼로그 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>카드 이미지</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="카드 이미지"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
