"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";

interface User {
  id: string;
  이름: string;
  email: string;
  cohort?: {
    name: string;
  };
}

export default function WorkflowCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [userId, setUserId] = useState("");
  const [workflowType, setWorkflowType] = useState("");
  const [customType, setCustomType] = useState("");

  // 사용자 목록 불러오기
  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("사용자 목록 불러오기 실패:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    const finalType = workflowType === "기타" ? customType : workflowType;

    if (!userId || !finalType) {
      alert("사용자와 제작물 타입을 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/workflows/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: finalType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "워크플로우 생성 실패");
      }

      setOpen(false);
      setUserId("");
      setWorkflowType("");
      setCustomType("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "워크플로우 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          추가 제작물 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900">
            워크플로우 추가
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            추가 제작물에 대한 워크플로우를 생성합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label className="text-gray-700">사용자 선택</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : (
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue placeholder="사용자를 선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 max-h-[300px]">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.이름} ({user.cohort?.name || "기수 미지정"}) - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Workflow Type Selection */}
          <div className="space-y-2">
            <Label className="text-gray-700">제작물 타입</Label>
            <Select value={workflowType} onValueChange={setWorkflowType}>
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="제작물을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="명함">명함</SelectItem>
                <SelectItem value="명찰">명찰</SelectItem>
                <SelectItem value="대봉투">대봉투</SelectItem>
                <SelectItem value="자문계약서 내지">자문계약서 내지</SelectItem>
                <SelectItem value="기타">기타 (직접입력)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Type Input */}
          {workflowType === "기타" && (
            <div className="space-y-2">
              <Label className="text-gray-700">제작물 명칭</Label>
              <Input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="제작물 명칭을 입력하세요 (예: 명함 추가제작)"
                className="bg-white border-gray-300"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setUserId("");
                setWorkflowType("");
                setCustomType("");
              }}
              className="flex-1 border-gray-300 hover:bg-gray-100"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !userId || !workflowType || (workflowType === "기타" && !customType)}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  생성
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
