"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
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
import {
  Bell,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Notification {
  id: string;
  channel: string;
  type: string;
  title: string;
  message: string;
  status: string;
  createdAt: Date;
  user: {
    이름: string | null;
    연락처: string | null;
    email: string | null;
  } | null;
}

interface NotificationsClientProps {
  notifications: Notification[];
}

export default function NotificationsClient({ notifications }: NotificationsClientProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // 날짜별로 그룹화
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Notification[]> = {};

    notifications.forEach((notification) => {
      const dateKey = new Date(notification.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    return groups;
  }, [notifications]);

  const toggleDate = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  // 모든 날짜 펼치기/접기
  const toggleAll = () => {
    if (expandedDates.size === Object.keys(groupedByDate).length) {
      setExpandedDates(new Set());
    } else {
      setExpandedDates(new Set(Object.keys(groupedByDate)));
    }
  };

  return (
    <>
      {/* 헤더 + 전체 펼치기/접기 버튼 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          발송 이력
        </h2>
        <button
          onClick={toggleAll}
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
        >
          {expandedDates.size === Object.keys(groupedByDate).length ? "전체 접기" : "전체 펼치기"}
        </button>
      </div>

      {/* 날짜별 그룹 */}
      <div className="space-y-3">
        {Object.entries(groupedByDate).map(([dateKey, dateNotifications]) => {
          const isExpanded = expandedDates.has(dateKey);
          const successCount = dateNotifications.filter(n => n.status === "성공").length;
          const failCount = dateNotifications.filter(n => n.status === "실패").length;

          return (
            <div key={dateKey}>
              {/* 날짜 헤더 */}
              <button
                onClick={() => toggleDate(dateKey)}
                className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{dateKey}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">{dateNotifications.length}건</span>
                  {successCount > 0 && (
                    <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs">
                      성공 {successCount}
                    </Badge>
                  )}
                  {failCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 text-xs">
                      실패 {failCount}
                    </Badge>
                  )}
                </div>
              </button>

              {/* 알림 목록 */}
              {isExpanded && (
                <div className="mt-2 space-y-2 pl-2 sm:pl-4">
                  {/* 모바일: 카드 레이아웃 */}
                  <div className="lg:hidden space-y-2">
                    {dateNotifications.map((notification) => (
                      <Card key={notification.id} className="bg-white border border-gray-200 shadow-sm">
                        <CardContent className="p-3">
                          {/* Header: 수신자 + 상태 */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {notification.user?.이름 || "-"}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  notification.channel === "SMS"
                                    ? "border-blue-300 text-blue-700 bg-blue-50"
                                    : "border-orange-300 text-orange-700 bg-orange-50"
                                }`}
                              >
                                {notification.channel === "SMS" ? (
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                ) : (
                                  <Mail className="w-3 h-3 mr-1" />
                                )}
                                {notification.channel}
                              </Badge>
                            </div>
                            {notification.status === "성공" ? (
                              <div className="flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs">성공</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">실패</span>
                              </div>
                            )}
                          </div>

                          {/* 유형 + 제목 */}
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50 text-xs">
                              {notification.type}
                            </Badge>
                            <span className="text-sm text-gray-900 truncate flex-1">
                              {notification.title}
                            </span>
                          </div>

                          {/* 내용 */}
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>

                          {/* Footer: 연락처 + 시간 */}
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                            <span>{notification.user?.연락처 || notification.user?.email || "-"}</span>
                            <span>
                              {new Date(notification.createdAt).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* 데스크탑: 테이블 레이아웃 */}
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 hover:bg-gray-50">
                          <TableHead className="text-gray-700 font-semibold">시간</TableHead>
                          <TableHead className="text-gray-700 font-semibold">수신자</TableHead>
                          <TableHead className="text-gray-700 font-semibold">연락처</TableHead>
                          <TableHead className="text-gray-700 font-semibold">채널</TableHead>
                          <TableHead className="text-gray-700 font-semibold">유형</TableHead>
                          <TableHead className="text-gray-700 font-semibold">제목</TableHead>
                          <TableHead className="text-gray-700 font-semibold">내용</TableHead>
                          <TableHead className="text-gray-700 font-semibold">상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateNotifications.map((notification) => (
                          <TableRow
                            key={notification.id}
                            className="border-gray-200 hover:bg-blue-50/50"
                          >
                            <TableCell className="text-gray-600 text-sm">
                              {new Date(notification.createdAt).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">
                              {notification.user?.이름 || "-"}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {notification.user?.연락처 || notification.user?.email || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  notification.channel === "SMS"
                                    ? "border-blue-300 text-blue-700 bg-blue-50"
                                    : "border-orange-300 text-orange-700 bg-orange-50"
                                }
                              >
                                {notification.channel === "SMS" ? (
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                ) : (
                                  <Mail className="w-3 h-3 mr-1" />
                                )}
                                {notification.channel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-gray-300 text-gray-700 bg-gray-50"
                              >
                                {notification.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-900 max-w-xs truncate">
                              {notification.title}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm max-w-sm truncate">
                              {notification.message}
                            </TableCell>
                            <TableCell>
                              {notification.status === "성공" ? (
                                <div className="flex items-center gap-1 text-green-700">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-sm">성공</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-sm">실패</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
