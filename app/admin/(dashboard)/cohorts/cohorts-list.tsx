"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import CohortActions from "./cohort-actions";
import {
  calculateMarketingSupportEndDate,
  getMarketingSupportDurationLabel,
} from "@/lib/marketing-support";

interface Cohort {
  id: string;
  name: string;
  교육요일: string;
  isActive: boolean;
  교육시작일: Date | null;
  자료제출마감일: Date | null;
  _count: {
    users: number;
  };
}

interface CohortsListProps {
  cohorts: Cohort[];
}

export default function CohortsList({ cohorts }: CohortsListProps) {
  const [showInactive, setShowInactive] = useState(false);

  const activeCohorts = cohorts.filter((c) => c.isActive);
  const inactiveCohorts = cohorts.filter((c) => !c.isActive);

  const renderCohortCard = (cohort: Cohort) => {
    const endDate = cohort.교육시작일
      ? calculateMarketingSupportEndDate(cohort.교육시작일, cohort.name)
      : null;
    const durationLabel = getMarketingSupportDurationLabel(cohort.name);
    const now = new Date();
    const isExpired = endDate ? now > endDate : false;
    const daysLeft = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <div
        key={cohort.id}
        className={`border rounded-lg p-3 space-y-2 ${
          cohort.isActive
            ? "border-gray-200 bg-gray-50/50"
            : "border-gray-200 bg-gray-100/50"
        }`}
      >
        {/* Header: 기수명 + 상태 + 액션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${cohort.isActive ? "text-gray-900" : "text-gray-500"}`}
            >
              {cohort.name}
            </span>
            {cohort.isActive ? (
              <Badge
                variant="outline"
                className="border-green-300 text-green-700 bg-green-50 text-xs"
              >
                활성
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-gray-300 text-gray-500 bg-gray-50 text-xs"
              >
                비활성
              </Badge>
            )}
          </div>
          <CohortActions cohort={cohort} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div
            className={`flex items-center gap-1.5 ${cohort.isActive ? "text-gray-600" : "text-gray-400"}`}
          >
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>{cohort.교육요일}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 ${cohort.isActive ? "text-gray-600" : "text-gray-400"}`}
          >
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>{cohort._count.users}명</span>
          </div>
        </div>

        {/* Dates */}
        <div
          className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${cohort.isActive ? "text-gray-500" : "text-gray-400"}`}
        >
          {cohort.교육시작일 && (
            <span>
              시작: {new Date(cohort.교육시작일).toLocaleDateString("ko-KR")}
            </span>
          )}
          {cohort.자료제출마감일 && (
            <span>
              마감:{" "}
              {new Date(cohort.자료제출마감일).toLocaleDateString("ko-KR")}
            </span>
          )}
        </div>

        {/* Marketing Support Status */}
        {endDate && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">마케팅 지원:</span>
            <span className="text-gray-600">
              ~{endDate.toLocaleDateString("ko-KR")} ({durationLabel})
            </span>
            {isExpired ? (
              <Badge
                variant="outline"
                className="text-xs border-gray-300 text-gray-500 bg-gray-50"
              >
                종료
              </Badge>
            ) : daysLeft <= 14 ? (
              <Badge
                variant="outline"
                className="text-xs border-orange-300 text-orange-600 bg-orange-50"
              >
                D-{daysLeft}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs border-gold-300 text-gold-600 bg-gold-50"
              >
                진행중
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCohortRow = (cohort: Cohort) => {
    return (
      <TableRow
        key={cohort.id}
        className={`border-gray-200 ${
          cohort.isActive
            ? "hover:bg-gold-50/50"
            : "bg-gray-50/50 hover:bg-gray-100/50"
        }`}
      >
        <TableCell
          className={`font-medium ${cohort.isActive ? "text-gray-900" : "text-gray-500"}`}
        >
          {cohort.name}
        </TableCell>
        <TableCell
          className={cohort.isActive ? "text-gray-700" : "text-gray-400"}
        >
          {cohort.교육요일}
        </TableCell>
        <TableCell>
          {cohort.isActive ? (
            <Badge
              variant="outline"
              className="border-green-300 text-green-700 bg-green-50"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              활성
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-gray-300 text-gray-500 bg-gray-50"
            >
              비활성
            </Badge>
          )}
        </TableCell>
        <TableCell
          className={cohort.isActive ? "text-gray-700" : "text-gray-400"}
        >
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-gray-500" />
            {cohort._count.users}명
          </div>
        </TableCell>
        <TableCell
          className={`text-sm ${cohort.isActive ? "text-gray-600" : "text-gray-400"}`}
        >
          {cohort.교육시작일 ? (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(cohort.교육시작일).toLocaleDateString("ko-KR")}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell
          className={`text-sm ${cohort.isActive ? "text-gray-600" : "text-gray-400"}`}
        >
          {cohort.자료제출마감일 ? (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(cohort.자료제출마감일).toLocaleDateString("ko-KR")}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell className="text-sm">
          {cohort.교육시작일 ? (
            (() => {
              const endDate = calculateMarketingSupportEndDate(
                cohort.교육시작일,
                cohort.name,
              );
              const durationLabel = getMarketingSupportDurationLabel(
                cohort.name,
              );
              const now = new Date();
              const isExpired = now > endDate;
              const daysLeft = Math.ceil(
                (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
              );

              return (
                <div className="flex flex-col gap-1">
                  <div
                    className={`flex items-center gap-1 ${cohort.isActive ? "text-gray-600" : "text-gray-400"}`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>
                      ~{endDate.toLocaleDateString("ko-KR")} ({durationLabel})
                    </span>
                  </div>
                  {isExpired ? (
                    <Badge
                      variant="outline"
                      className="text-xs border-gray-300 text-gray-500 bg-gray-50 w-fit"
                    >
                      종료됨
                    </Badge>
                  ) : daysLeft <= 14 ? (
                    <Badge
                      variant="outline"
                      className="text-xs border-orange-300 text-orange-600 bg-orange-50 w-fit"
                    >
                      D-{daysLeft}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs border-gold-300 text-gold-600 bg-gold-50 w-fit"
                    >
                      진행중
                    </Badge>
                  )}
                </div>
              );
            })()
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell>
          <CohortActions cohort={cohort} />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-lg">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-base sm:text-lg md:text-xl text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          기수 목록
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-gray-600">
          모든 기수 정보 및 활성화 상태
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-4">
        {/* 활성 기수 섹션 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            활성 기수 ({activeCohorts.length})
          </h3>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {activeCohorts.length > 0 ? (
              activeCohorts.map(renderCohortCard)
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                활성 기수가 없습니다
              </p>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-gray-700 font-semibold">
                    기수명
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    교육 요일
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    활성 상태
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    수강생 수
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    교육 시작일
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    자료 마감일
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    마케팅 지원 기간
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    작업
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCohorts.length > 0 ? (
                  activeCohorts.map(renderCohortRow)
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 py-4"
                    >
                      활성 기수가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 비활성 기수 섹션 (접기/펼치기) */}
        {inactiveCohorts.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowInactive(!showInactive)}
              className="w-full justify-between text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-auto py-2"
            >
              <span className="text-sm font-semibold flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-gray-300" />
                비활성 기수 ({inactiveCohorts.length})
              </span>
              {showInactive ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {showInactive && (
              <div className="mt-3">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {inactiveCohorts.map(renderCohortCard)}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 hover:bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">
                          기수명
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          교육 요일
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          활성 상태
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          수강생 수
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          교육 시작일
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          자료 마감일
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          마케팅 지원 기간
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          작업
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inactiveCohorts.map(renderCohortRow)}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
