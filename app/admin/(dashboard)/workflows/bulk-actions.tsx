"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  MessageSquare,
  Download,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: string) => void;
}

export default function BulkActions({
  selectedCount,
  onClearSelection,
  onBulkAction,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white border-2 border-gold-500 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gold-600" />
          <span className="font-semibold text-gray-900">
            {selectedCount}개 선택됨
          </span>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                상태 변경
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onBulkAction("status:대기")}>
                대기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction("status:시안중")}>
                시안 작업중
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction("status:발주대기")}>
                발주 대기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction("status:발주완료")}>
                발주 완료
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction("status:제작완료")}>
                제작 완료
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction("status:발송완료")}>
                발송 완료
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction("sms")}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS 발송
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction("export")}
          >
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>

          <DropdownMenuSeparator />

          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction("delete")}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-gray-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
