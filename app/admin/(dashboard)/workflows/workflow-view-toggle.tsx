"use client";

import { Users, LayoutGrid, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowViewToggleProps {
  currentView: "user" | "status" | "kanban";
  onViewChange: (view: "user" | "status" | "kanban") => void;
}

export default function WorkflowViewToggle({
  currentView,
  onViewChange,
}: WorkflowViewToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
      <Button
        variant={currentView === "user" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("user")}
        className={
          currentView === "user"
            ? "bg-white shadow-sm"
            : "hover:bg-gray-200"
        }
      >
        <Users className="w-4 h-4 mr-2" />
        사용자별
      </Button>
      <Button
        variant={currentView === "status" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("status")}
        className={
          currentView === "status"
            ? "bg-white shadow-sm"
            : "hover:bg-gray-200"
        }
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        상태별
      </Button>
      <Button
        variant={currentView === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("kanban")}
        className={
          currentView === "kanban"
            ? "bg-white shadow-sm"
            : "hover:bg-gray-200"
        }
      >
        <Columns3 className="w-4 h-4 mr-2" />
        칸반 보드
      </Button>
    </div>
  );
}
