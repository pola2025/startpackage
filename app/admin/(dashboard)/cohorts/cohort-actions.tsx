"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreVertical, Power, PowerOff, Trash2, Edit } from "lucide-react";
import EditCohortDialog from "./edit-cohort-dialog";

interface CohortActionsProps {
  cohort: any;
}

export default function CohortActions({ cohort }: CohortActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const toggleActivation = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/cohorts/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: cohort.id,
          isActive: !cohort.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("업데이트 실패");
      }

      router.refresh();
    } catch (error) {
      alert("업데이트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/cohorts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId: cohort.id }),
      });

      if (!response.ok) {
        throw new Error("삭제 실패");
      }

      router.refresh();
      setShowDeleteDialog(false);
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white border-gray-200" align="end">
          <DropdownMenuItem
            onClick={() => setShowEditDialog(true)}
            disabled={loading}
            className="text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <Edit className="w-4 h-4 mr-2 text-blue-600" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={toggleActivation}
            disabled={loading}
            className="text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            {cohort.isActive ? (
              <>
                <PowerOff className="w-4 h-4 mr-2 text-orange-600" />
                비활성화
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-2 text-green-600" />
                활성화
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
            className="text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>기수 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <strong>{cohort.name}</strong> 기수를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditCohortDialog
        cohort={cohort}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  );
}
