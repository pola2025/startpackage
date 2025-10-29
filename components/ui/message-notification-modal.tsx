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
}

export function MessageNotificationModal({ onRead }: MessageNotificationModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UnreadMessage[]>([]);
  const [checking, setChecking] = useState(false);

  // 미확인 메시지 확인
  const checkUnreadMessages = async () => {
    if (checking) return;

    setChecking(true);
    try {
      const response = await fetch("/api/communication/unread-count");
      if (response.ok) {
        const data = await response.json();

        if (data.unreadCount > 0 && data.threadsWithUnread.length > 0) {
          setMessages(data.threadsWithUnread);
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to check unread messages:", error);
    } finally {
      setChecking(false);
    }
  };

  // 1분마다 미확인 메시지 확인
  useEffect(() => {
    checkUnreadMessages();

    const interval = setInterval(checkUnreadMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleGoToCommunication = () => {
    setIsOpen(false);
    router.push("/dashboard/communication");
    onRead(); // 미확인 카운트 새로고침
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  const totalUnread = messages.reduce((sum, m) => sum + m.count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white border-2 border-blue-500 shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
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
              className="p-3 bg-blue-50 rounded-lg border border-blue-200"
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            지금 확인하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
