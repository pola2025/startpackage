"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  description: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({
  id,
  title,
  color,
  description,
  count,
  children,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // children에서 모든 ID 추출
  const items = Array.isArray(children)
    ? children.map((child: any) => child?.key).filter(Boolean)
    : children
      ? [(children as any).key].filter(Boolean)
      : [];

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* 컬럼 헤더 */}
      <div className={cn("rounded-t-lg p-3 border-2 border-b-0", color)}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="bg-white/80 rounded-full px-2 py-0.5 text-xs font-medium">
            {count}
          </span>
        </div>
        <p className="text-xs opacity-75">{description}</p>
      </div>

      {/* 드롭 영역 */}
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 rounded-b-lg border-2 border-t-0 p-2 transition-colors min-h-[400px]",
            color.replace("bg-", "border-"),
            isOver && "bg-gold-50 border-gold-400 border-dashed",
          )}
        >
          {children && <div className="space-y-2">{children}</div>}

          {/* 빈 상태 메시지 */}
          {!children && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              카드를 여기로 드래그하세요
            </div>
          )}

          {/* 드래그 오버 표시 */}
          {isOver && (
            <div className="mt-2 p-4 border-2 border-dashed border-gold-400 rounded-lg bg-gold-50 text-center text-sm text-gold-600">
              여기에 놓으세요
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
