"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkflowFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  cohorts: { id: string; name: string }[];
  workflowTypes: string[];
}

export interface FilterState {
  search: string;
  status: string;
  type: string;
  cohort: string;
  hasFeedback?: boolean;
  isDelayed?: boolean;
}

const WORKFLOW_STATUSES = [
  { value: "all", label: "전체 상태" },
  { value: "대기", label: "대기" },
  { value: "시안중", label: "시안 작업중" },
  { value: "발주대기", label: "발주 대기" },
  { value: "발주요청", label: "발주 요청" },
  { value: "발주완료", label: "발주 완료" },
  { value: "제작완료", label: "제작 완료" },
  { value: "발송완료", label: "발송 완료" },
];

export default function WorkflowFilters({
  onFilterChange,
  cohorts,
  workflowTypes,
}: WorkflowFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    type: "all",
    cohort: "all",
  });

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      search: "",
      status: "all",
      type: "all",
      cohort: "all",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFilterCount = [
    filters.search,
    filters.status !== "all",
    filters.type !== "all",
    filters.cohort !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">필터</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {activeFilterCount}개 적용됨
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-1" />
            초기화
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="사용자 이름, 연락처 검색..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 상태 필터 */}
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter("status", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 제작물 타입 필터 */}
        <Select
          value={filters.type}
          onValueChange={(value) => updateFilter("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="제작물 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 타입</SelectItem>
            {workflowTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 코호트 필터 */}
        <Select
          value={filters.cohort}
          onValueChange={(value) => updateFilter("cohort", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="코호트" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 코호트</SelectItem>
            {cohorts.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id}>
                {cohort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
