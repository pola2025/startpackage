"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";

interface UnreadMessage {
  threadId: string;
  count: number;
  threadTitle?: string;
  latestMessage?: string;
}

interface MessageNotificationModalProps {
  onRead: () => void; // 메시지 읽음 처리 후 호출할 콜백
  onClose: () => void; // 모달 닫기 콜백
}

export function MessageNotificationModal({
  onRead,
  onClose,
}: MessageNotificationModalProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<UnreadMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // 컴포넌트 마운트 시 미확인 메시지 가져오기
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/communication/unread-count");
        if (response.ok) {
          const data = await response.json();
          setMessages(data.threadsWithUnread || []);
        }
      } catch (error) {
        console.error("Failed to fetch unread messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const handleGoToCommunication = () => {
    onClose();
    router.push("/dashboard/communication");
    onRead(); // 미확인 카운트 새로고침
  };

  const handleDismiss = () => {
    onClose();
  };

  const totalUnread = messages.reduce((sum, m) => sum + m.count, 0);

  if (loading || messages.length === 0) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-white border-2 border-gold-500 shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-navy-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-gold-600" />
            새로운 답변이 도착했습니다
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            관리자가 회신한 메시지가 {totalUnread}개 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {messages.slice(0, 3).map((message, index) => (
            <div
              key={message.threadId}
              className="p-3 bg-gold-50 rounded-lg border border-gold-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-semibold text-gray-900">
                    새 메시지 {message.count}개
                  </span>
                </div>
              </div>
            </div>
          ))}

          {messages.length > 3 && (
            <p className="text-sm text-gray-500 text-center">
              외 {messages.length - 3}개의 대화
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1 border-gray-300"
          >
            <X className="w-4 h-4 mr-2" />
            나중에 확인
          </Button>
          <Button
            onClick={handleGoToCommunication}
            className="flex-1 bg-navy-900 hover:bg-navy-800 text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            지금 확인하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
