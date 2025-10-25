"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2 } from "lucide-react";

export default function AddCohortButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [교육요일, set교육요일] = useState("");
  const [교육시작일, set교육시작일] = useState("");
  const [자료제출마감일, set자료제출마감일] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/cohorts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          교육요일,
          교육시작일: 교육시작일 ? new Date(교육시작일).toISOString() : null,
          자료제출마감일: 자료제출마감일
            ? new Date(자료제출마감일).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error("생성 실패");
      }

      setOpen(false);
      setName("");
      set교육요일("");
      set교육시작일("");
      set자료제출마감일("");
      router.refresh();
    } catch (error) {
      alert("기수 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          기수 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-2 border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">새 기수 추가</DialogTitle>
          <DialogDescription className="text-gray-700">
            새로운 기수를 생성하세요
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
              onClick={() => setOpen(false)}
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
              {loading ? "생성 중..." : "생성"}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
