"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { DesignConfirmationModal } from "@/components/ui/design-confirmation-modal";
import { MessageNotificationModal } from "@/components/ui/message-notification-modal";
import { SystemAlertModal } from "@/components/ui/system-alert-modal";
import { MobileMoreMenu } from "@/components/ui/mobile-more-menu";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingDesignCount, setPendingDesignCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 미확인 메시지 가져오기
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/communication/unread-count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // 시안 검토 요청 개수 가져오기
  const fetchPendingDesignCount = async () => {
    try {
      const response = await fetch("/api/workflows/pending-confirmation");
      if (response.ok) {
        const data = await response.json();
        setPendingDesignCount(data.workflows?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch pending design count:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (
      status === "authenticated" &&
      (session?.user as any)?.role === "admin"
    ) {
      router.push("/admin");
    } else if (status === "authenticated") {
      // 초기 데이터 가져오기
      fetchUnreadCount();
      fetchPendingDesignCount();

      // ✅ SSE 연결로 실시간 알림 받기
      const eventSource = new EventSource("/api/notifications/stream");

      eventSource.onopen = () => {
        console.log("✅ SSE 연결 성공");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📩 SSE 이벤트 수신:", data);

          if (data.type === "new_message") {
            // 배지 카운트 새로고침
            fetchUnreadCount();

            // 문의하기 페이지가 아닌 경우에만 모달 표시
            if (!pathname.includes("/communication")) {
              setShowNotificationModal(true);
            }
          }
        } catch (error) {
          console.error("SSE 메시지 파싱 실패:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ SSE 연결 오류:", error);
        eventSource.close();
      };

      return () => {
        console.log("🔌 SSE 연결 종료");
        eventSource.close();
      };
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-white animate-pulse">로딩 중...</div>
      </div>
    );
  }

  if (
    status === "unauthenticated" ||
    (session?.user as any)?.role === "admin"
  ) {
    return null;
  }

  // 수료생이면 리다이렉트 중이므로 로딩 화면 표시
  const cohortName = (session?.user as any)?.cohortName;

  // 수료생 여부 확인
  const isGraduated = (session?.user as any)?.isGraduated === true;

  // 일반 사용자 레이아웃
  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* 시스템 알림 모달 - 모든 사용자 */}
      <SystemAlertModal />

      {/* 시안 확인 자동 모달 - 수료생 제외 */}
      {!isGraduated && <DesignConfirmationModal />}

      {/* 메시지 알림 모달 - SSE로 제어 */}
      {showNotificationModal && (
        <MessageNotificationModal
          onRead={() => {
            fetchUnreadCount();
            setShowNotificationModal(false);
          }}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {/* Subtle Pattern Background */}
      <div className="fixed inset-0 pattern-background opacity-50" />

      {/* Sidebar */}
      <Sidebar
        userName={session?.user?.name || "사용자"}
        isGraduated={isGraduated}
        unreadCount={unreadCount}
        pendingDesignCount={pendingDesignCount}
      />

      {/* Main Content */}
      <main className="relative lg:ml-64 pt-16 lg:pt-0 min-h-screen pb-bottom-bar">
        <div className="mx-auto p-3 sm:p-4 md:p-6 lg:max-w-[900px]">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 border-t border-gray-200 bg-white py-4 sm:py-6">
          <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-gray-500">
            <p>© 비즈액터스쿨 스타트패키지. All rights reserved.</p>
          </div>
        </footer>
      </main>

      {/* 모바일 하단 탭 바 - 수료생 제외 */}
      {!isGraduated && (
        <BottomTabBar
          pendingDesignCount={pendingDesignCount}
          onMoreClick={() => setShowMoreMenu(true)}
        />
      )}

      {/* 모바일 더보기 메뉴 */}
      <MobileMoreMenu
        open={showMoreMenu}
        onOpenChange={setShowMoreMenu}
        userName={session?.user?.name || "사용자"}
        isGraduated={isGraduated}
        unreadCount={unreadCount}
      />
    </div>
  );
}
