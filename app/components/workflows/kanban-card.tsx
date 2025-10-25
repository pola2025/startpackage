"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { GripVertical, Clock, MessageSquare, Package } from 'lucide-react'

interface KanbanCardProps {
  workflow: any
}

export function KanbanCard({ workflow }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: workflow.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // 경과 시간 계산
  const daysSinceCreation = workflow.자료제출일
    ? Math.floor(
        (new Date().getTime() - new Date(workflow.자료제출일).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0

  // 긴급도 판단
  const isUrgent = daysSinceCreation >= 14
  const isFeedbackNeeded = workflow.feedback
  const isOrderRequested = workflow.status === '발주요청'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="mb-2"
    >
      <Card className="p-3 cursor-move hover:shadow-md transition-shadow bg-white border-l-4 border-l-transparent hover:border-l-blue-500">
        {/* 드래그 핸들 */}
        <div
          {...listeners}
          className="flex items-start gap-2 mb-2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {workflow.type}
            </h4>
            <p className="text-xs text-gray-600 truncate">
              {workflow.user?.이름}
            </p>
          </div>
        </div>

        {/* 긴급 태그들 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {isOrderRequested && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
              발주 대기
            </Badge>
          )}
          {isFeedbackNeeded && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
              <MessageSquare className="h-3 w-3 mr-1" />
              피드백
            </Badge>
          )}
          {isUrgent && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
              <Clock className="h-3 w-3 mr-1" />
              {daysSinceCreation}일 경과
            </Badge>
          )}
        </div>

        {/* 작업 정보 */}
        <div className="space-y-1 text-xs text-gray-600">
          {workflow.자료제출일 && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(workflow.자료제출일), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
          )}

          {workflow.수정횟수 > 0 && (
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span className="truncate">수정 {workflow.수정횟수}회</span>
            </div>
          )}
        </div>

        {/* 피드백 카운트 */}
        {workflow.feedback && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <MessageSquare className="h-3 w-3" />
              <span className="truncate">피드백 있음</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
