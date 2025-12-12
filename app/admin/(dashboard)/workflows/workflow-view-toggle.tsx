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
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("user")}
        className={
          currentView === "user"
            ? "bg-white shadow-sm text-gray-900 hover:bg-white"
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        }
      >
        <Users className="w-4 h-4 sm:mr-1.5" />
        <span className="hidden sm:inline">사용자별</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("status")}
        className={
          currentView === "status"
            ? "bg-white shadow-sm text-gray-900 hover:bg-white"
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        }
      >
        <LayoutGrid className="w-4 h-4 sm:mr-1.5" />
        <span className="hidden sm:inline">상태별</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("kanban")}
        className={
          currentView === "kanban"
            ? "bg-white shadow-sm text-gray-900 hover:bg-white"
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        }
      >
        <Columns3 className="w-4 h-4 sm:mr-1.5" />
        <span className="hidden sm:inline">칸반</span>
      </Button>
    </div>
  );
}
