"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

interface EditCohortDialogProps {
  cohort: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCohortDialog({
  cohort,
  open,
  onOpenChange,
}: EditCohortDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [교육요일, set교육요일] = useState("");
  const [교육시작일, set교육시작일] = useState("");
  const [자료제출마감일, set자료제출마감일] = useState("");

  useEffect(() => {
    if (cohort) {
      setName(cohort.name);
      set교육요일(cohort.교육요일);
      // Convert Date to YYYY-MM-DD format
      set교육시작일(
        new Date(cohort.교육시작일).toISOString().split("T")[0]
      );
      set자료제출마감일(
        new Date(cohort.자료제출마감일).toISOString().split("T")[0]
      );
    }
  }, [cohort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/cohorts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: cohort.id,
          name,
          교육요일,
          교육시작일: 교육시작일 ? new Date(교육시작일).toISOString() : null,
          자료제출마감일: 자료제출마감일
            ? new Date(자료제출마감일).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error("수정 실패");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      alert("기수 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-2 border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            기수 수정
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            기수 정보를 수정하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">기수명</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 19기"
              required
              className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">교육 요일</Label>
            <Input
              value={교육요일}
              onChange={(e) => set교육요일(e.target.value)}
              placeholder="예: 목, 금"
              required
              className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">교육 시작일</Label>
            <Input
              type="date"
              value={교육시작일}
              onChange={(e) => set교육시작일(e.target.value)}
              required
              className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">자료 제출 마감일</Label>
            <Input
              type="date"
              value={자료제출마감일}
              onChange={(e) => set자료제출마감일(e.target.value)}
              required
              className="bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-2 border-gray-300 hover:bg-gray-100 text-gray-900"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            >
              {loading ? "수정 중..." : "수정"}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
