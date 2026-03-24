"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
} from "lucide-react";
import UserActions from "./user-actions";

type Cohort = {
  id: string;
  name: string;
  교육시작일: Date;
};

type UserWorkflow = {
  id: string;
  type: string;
  status: string;
};

type User = {
  id: string;
  이름: string;
  연락처: string;
  email: string;
  SMS수신동의: boolean;
  이메일수신동의: boolean;
  createdAt: Date;
  cohort: Cohort | null;
  cohortId: string;
  workflows: UserWorkflow[];
};

type SendResult = {
  userId: string;
  name: string;
  success: boolean;
  error?: string;
};

interface UsersClientProps {
  users: User[];
  cohorts: Cohort[];
}

export default function UsersClient({ users, cohorts }: UsersClientProps) {
  const [sortMode, setSortMode] = useState<"name" | "cohort">("name");
  const [activeYearTab, setActiveYearTab] = useState("2026");
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set());
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [bulkSmsTitle, setBulkSmsTitle] = useState("");
  const [bulkSmsMessage, setBulkSmsMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);

  const koreanCollator = useMemo(
    () => new Intl.Collator("ko-KR", { sensitivity: "base" }),
    [],
  );

  // 실제 가입자가 있는 기수만 필터링
  const activeCohorts = useMemo(() => {
    const cohortIdsWithUsers = new Set(
      users.map((u) => u.cohortId).filter(Boolean),
    );
    return cohorts.filter((c) => cohortIdsWithUsers.has(c.id));
  }, [users, cohorts]);

  // 기수를 연도별로 그룹화
  const cohortsByYear = useMemo(() => {
    const groups: Record<string, Cohort[]> = {};
    for (const cohort of activeCohorts) {
      const year = new Date(cohort.교육시작일).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(cohort);
    }
    return groups;
  }, [activeCohorts]);

  // 연도 탭 목록 (내림차순 — 최신 연도가 먼저)
  const yearTabs = useMemo(
    () => Object.keys(cohortsByYear).sort((a, b) => Number(b) - Number(a)),
    [cohortsByYear],
  );

  // 현재 탭의 기수 ID 집합
  const currentYearCohortIds = useMemo(() => {
    const cohortsInYear = cohortsByYear[activeYearTab] || [];
    return new Set(cohortsInYear.map((c) => c.id));
  }, [cohortsByYear, activeYearTab]);

  // 현재 탭에 해당하는 기수 목록
  const currentYearCohorts = useMemo(
    () => cohortsByYear[activeYearTab] || [],
    [cohortsByYear, activeYearTab],
  );

  const filteredUsers = useMemo(() => {
    let result = selectedCohortId
      ? users.filter((u) => u.cohortId === selectedCohortId)
      : users.filter((u) => currentYearCohortIds.has(u.cohortId));

    if (sortMode === "name") {
      return [...result].sort((a, b) =>
        koreanCollator.compare(a.이름.trim(), b.이름.trim()),
      );
    } else {
      const cohortOrder = cohorts.reduce(
        (acc, c, i) => ({ ...acc, [c.id]: i }),
        {} as Record<string, number>,
      );
      return [...result].sort((a, b) => {
        const cohortDiff =
          (cohortOrder[a.cohortId] ?? 999) - (cohortOrder[b.cohortId] ?? 999);
        if (cohortDiff !== 0) return cohortDiff;
        return koreanCollator.compare(a.이름.trim(), b.이름.trim());
      });
    }
  }, [
    users,
    cohorts,
    selectedCohortId,
    currentYearCohortIds,
    sortMode,
    koreanCollator,
  ]);

  const allFilteredIds = filteredUsers.map((u) => u.id);
  const isAllChecked =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => checkedUserIds.has(id));
  const isIndeterminate =
    !isAllChecked && allFilteredIds.some((id) => checkedUserIds.has(id));

  const toggleAll = () => {
    if (isAllChecked) {
      setCheckedUserIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setCheckedUserIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleUser = (id: string) => {
    setCheckedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearChecked = () => setCheckedUserIds(new Set());

  const checkedCount = checkedUserIds.size;

  const openBulkSms = () => {
    setSendResults([]);
    setBulkSmsOpen(true);
  };

  const handleBulkSend = async () => {
    setSending(true);
    const results: SendResult[] = [];
    const selectedUsers = filteredUsers.filter((u) => checkedUserIds.has(u.id));

    for (const user of selectedUsers) {
      try {
        const res = await fetch("/api/admin/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            channel: "SMS",
            title: bulkSmsTitle,
            message: bulkSmsMessage,
          }),
        });
        const data = await res.json();
        results.push({
          userId: user.id,
          name: user.이름,
          success: res.ok,
          error: data.error,
        });
      } catch {
        results.push({
          userId: user.id,
          name: user.이름,
          success: false,
          error: "발송 실패",
        });
      }
    }

    setSendResults(results);
    setSending(false);
  };

  const selectedUsersForDialog = filteredUsers.filter((u) =>
    checkedUserIds.has(u.id),
  );
  const sentCount = sendResults.filter((r) => r.success).length;
  const isDone = sendResults.length > 0 && !sending;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            사용자 관리
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            등록된 모든 사용자를 관리하고 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 정렬 버튼 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortMode("name")}
              className={
                sortMode === "name"
                  ? "border-gold-500 bg-gold-50 text-gold-700"
                  : "text-gray-600"
              }
            >
              가나다순
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortMode("cohort")}
              className={
                sortMode === "cohort"
                  ? "border-gold-500 bg-gold-50 text-gold-700"
                  : "text-gray-600"
              }
            >
              기수순
            </Button>
          </div>
          {/* 총 인원 뱃지 */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gold-50 rounded-lg border border-gold-200 self-start sm:self-auto">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gold-600" />
            <span className="text-xl sm:text-2xl font-bold text-gold-600">
              {filteredUsers.length}
            </span>
            <span className="text-xs sm:text-sm text-gray-600">명</span>
          </div>
        </div>
      </div>

      {/* 연도 탭 + 기수 필터 */}
      {yearTabs.length > 0 && (
        <div className="flex items-center gap-3">
          <Tabs
            value={activeYearTab}
            onValueChange={(val) => {
              setActiveYearTab(val);
              setSelectedCohortId(null);
              setCheckedUserIds(new Set());
            }}
          >
            <TabsList>
              {yearTabs.map((year) => {
                const count = users.filter((u) => {
                  const cohort = cohorts.find((c) => c.id === u.cohortId);
                  return (
                    cohort &&
                    new Date(cohort.교육시작일).getFullYear().toString() ===
                      year
                  );
                }).length;
                return (
                  <TabsTrigger key={year} value={year}>
                    {year}기수 ({count}명)
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <Select
            value={selectedCohortId ?? "all"}
            onValueChange={(val) =>
              setSelectedCohortId(val === "all" ? null : val)
            }
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="기수 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                전체 (
                {
                  users.filter((u) => currentYearCohortIds.has(u.cohortId))
                    .length
                }
                명)
              </SelectItem>
              {currentYearCohorts.map((cohort) => {
                const count = users.filter(
                  (u) => u.cohortId === cohort.id,
                ).length;
                return (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name} ({count}명)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 모바일: 카드 레이아웃 */}
      <div className="lg:hidden space-y-3">
        {filteredUsers.map((user) => {
          const completedWorkflows = user.workflows.filter(
            (w) => w.status === "완료",
          ).length;
          const totalWorkflows = user.workflows.length;
          const isChecked = checkedUserIds.has(user.id);

          return (
            <Card
              key={user.id}
              className={`bg-white border shadow-sm transition-colors ${
                isChecked ? "border-gold-400" : "border-gray-200"
              }`}
            >
              <CardContent className="p-4">
                {/* 헤더: 체크박스 + 이름 + 기수 + 작업버튼 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleUser(user.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-gold-600 cursor-pointer"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">
                        {user.이름.trim()}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-gold-300 text-gold-700 bg-gold-50 text-xs mt-1"
                      >
                        {user.cohort?.name || "미지정"}
                      </Badge>
                    </div>
                  </div>
                  <UserActions user={user} />
                </div>

                {/* 연락처/이메일 */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{user.연락처}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                {/* 푸터: 워크플로우 + 수신동의 + 가입일 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="text-xs">
                      <span className="text-gray-500">진행</span>
                      <span className="ml-1 font-medium text-green-700">
                        {completedWorkflows}
                      </span>
                      <span className="text-gray-400">/{totalWorkflows}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {user.SMS수신동의 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      {user.이메일수신동의 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 데스크탑: 테이블 레이아웃 */}
      <Card className="hidden lg:block bg-white border border-gray-200 shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl text-gray-900">
            전체 사용자 목록
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            기수별 사용자 정보 및 워크플로우 상태
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-gray-50">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-gold-600 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  이름
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  기수
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  연락처
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  이메일
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  워크플로우
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  수신동의
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  가입일
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  작업
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const completedWorkflows = user.workflows.filter(
                  (w) => w.status === "완료",
                ).length;
                const totalWorkflows = user.workflows.length;
                const isChecked = checkedUserIds.has(user.id);

                return (
                  <TableRow
                    key={user.id}
                    className={`border-gray-200 transition-colors ${
                      isChecked
                        ? "bg-gold-50 hover:bg-gold-100/70"
                        : "hover:bg-gold-50/50"
                    }`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUser(user.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gold-600 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {user.이름.trim()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-gold-300 text-gold-700 bg-gold-50"
                      >
                        {user.cohort?.name || "미지정"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-500" />
                        {user.연락처}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-500" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-green-700 font-medium">
                          {completedWorkflows}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className="text-gray-600">{totalWorkflows}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.SMS수신동의 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500">SMS</span>
                        {user.이메일수신동의 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500">Email</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserActions user={user} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 다중 선택 바 (sticky bottom) */}
      {checkedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-navy-900 text-white px-5 py-3 rounded-xl shadow-lg">
            <span className="text-sm font-medium">{checkedCount}명 선택됨</span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChecked}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white h-7 text-xs"
            >
              전체 해제
            </Button>
            <Button
              size="sm"
              onClick={openBulkSms}
              className="bg-white text-navy-900 hover:bg-gold-50 h-7 text-xs font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              SMS 발송
            </Button>
          </div>
        </div>
      )}

      {/* 일괄 SMS 다이얼로그 */}
      <Dialog
        open={bulkSmsOpen}
        onOpenChange={(open) => {
          if (!sending) setBulkSmsOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold-600" />
              일괄 SMS 발송
            </DialogTitle>
            <DialogDescription>
              선택된 {selectedUsersForDialog.length}명에게 SMS를 발송합니다.
            </DialogDescription>
          </DialogHeader>

          {/* 발송 대상 목록 */}
          <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {selectedUsersForDialog.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      user.SMS수신동의 ? "text-gray-800" : "text-red-500"
                    }
                  >
                    {user.이름.trim()}
                  </span>
                  {!user.SMS수신동의 && (
                    <span className="text-xs text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
                      수신 미동의
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-xs">{user.연락처}</span>
              </div>
            ))}
          </div>

          {/* 메시지 입력 (발송 결과가 없을 때만) */}
          {!isDone && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-sms-title">제목</Label>
                <Input
                  id="bulk-sms-title"
                  placeholder="SMS 제목을 입력하세요"
                  value={bulkSmsTitle}
                  onChange={(e) => setBulkSmsTitle(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-sms-message">메시지</Label>
                <Textarea
                  id="bulk-sms-message"
                  placeholder="발송할 메시지를 입력하세요"
                  value={bulkSmsMessage}
                  onChange={(e) => setBulkSmsMessage(e.target.value)}
                  rows={4}
                  disabled={sending}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleBulkSend}
                disabled={sending || !bulkSmsMessage.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {sendResults.length}명 중 {selectedUsersForDialog.length}명
                    발송 중...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {selectedUsersForDialog.length}명에게 발송
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 발송 결과 */}
          {isDone && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>
                  발송 완료: {sentCount}/{sendResults.length}명 성공
                </span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {sendResults.map((result) => (
                  <div
                    key={result.userId}
                    className="flex items-center gap-2 text-sm py-1"
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span
                      className={
                        result.success ? "text-gray-800" : "text-red-600"
                      }
                    >
                      {result.name}
                    </span>
                    {!result.success && result.error && (
                      <span className="text-xs text-red-400 ml-auto">
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setBulkSmsOpen(false)}
              >
                닫기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
