"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";

export type WorkflowStatus =
  | "대기"
  | "시안중"
  | "발주대기"
  | "발주요청"
  | "발주완료"
  | "제작완료"
  | "발송완료";

const STATUS_CONFIG: Record<
  WorkflowStatus,
  { label: string; color: string; description: string }
> = {
  대기: {
    label: "대기",
    color: "bg-gray-100 border-gray-300",
    description: "대기 중인 워크플로우",
  },
  시안중: {
    label: "시안 작업중",
    color: "bg-gold-100 border-gold-300",
    description: "디자인 시안을 제작중",
  },
  발주대기: {
    label: "발주 대기",
    color: "bg-orange-100 border-orange-300",
    description: "발주를 대기하는 중",
  },
  발주요청: {
    label: "발주 요청",
    color: "bg-yellow-100 border-yellow-300",
    description: "고객이 발주를 요청한 상태",
  },
  발주완료: {
    label: "발주 완료",
    color: "bg-indigo-100 border-indigo-300",
    description: "발주가 완료된 상태",
  },
  제작완료: {
    label: "제작 완료",
    color: "bg-green-100 border-green-300",
    description: "제작이 완료된 상태",
  },
  발송완료: {
    label: "발송 완료",
    color: "bg-teal-100 border-teal-300",
    description: "발송이 완료된 상태",
  },
};

interface KanbanBoardProps {
  workflows: any[];
  onUpdateStatus: (
    workflowId: string,
    newStatus: WorkflowStatus,
  ) => Promise<void>;
}

export function KanbanBoard({ workflows, onUpdateStatus }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동해야 드래그 시작 (클릭과 구분)
      },
    }),
  );

  // 상태별로 워크플로우 그룹화
  const workflowsByStatus = Object.keys(STATUS_CONFIG).reduce(
    (acc, status) => {
      acc[status as WorkflowStatus] = workflows.filter(
        (workflow) => workflow.status === status,
      );
      return acc;
    },
    {} as Record<WorkflowStatus, any[]>,
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const workflowId = active.id as string;
    const newStatus = over.id as WorkflowStatus;

    // 상태가 실제로 변경된 경우에만 업데이트
    const workflow = workflows.find((w) => w.id === workflowId);
    if (workflow && workflow.status !== newStatus) {
      await onUpdateStatus(workflowId, newStatus);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeWorkflow = workflows.find((w) => w.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4">
        {(Object.keys(STATUS_CONFIG) as WorkflowStatus[]).map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={STATUS_CONFIG[status].label}
            color={STATUS_CONFIG[status].color}
            description={STATUS_CONFIG[status].description}
            count={workflowsByStatus[status]?.length || 0}
          >
            {workflowsByStatus[status]?.map((workflow) => (
              <KanbanCard key={workflow.id} workflow={workflow} />
            ))}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeWorkflow ? (
          <div className="rotate-3 opacity-80">
            <KanbanCard workflow={activeWorkflow} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
