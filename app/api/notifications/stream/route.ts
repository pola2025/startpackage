import { auth } from "@/auth";
import { notificationManager } from "@/lib/notifications/notification-manager";

/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events (SSE) 스트림
 * 사용자가 접속 중일 때 실시간 알림을 받기 위한 연결 유지
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as any).id;

  // SSE 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      // 클라이언트 등록
      notificationManager.addClient(userId, controller);

      // 연결 확인용 초기 메시지
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`)
      );

      // Keep-alive: 30초마다 heartbeat 전송
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (error) {
          console.error("Heartbeat failed, closing connection");
          clearInterval(keepAliveInterval);
          notificationManager.removeClient(userId, controller);
        }
      }, 30000);

      // 연결 종료 시 정리
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        notificationManager.removeClient(userId, controller);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
