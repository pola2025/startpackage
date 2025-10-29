/**
 * 실시간 알림 관리 시스템
 * Server-Sent Events (SSE)를 사용하여 관리자 메시지 알림을 실시간으로 전송
 */

export type NotificationEvent = {
  type: "new_message";
  data: {
    threadId: string;
    count: number;
    timestamp: string;
  };
};

type Client = {
  userId: string;
  controller: ReadableStreamDefaultController;
};

class NotificationManager {
  private clients: Map<string, Client[]> = new Map();

  /**
   * 새로운 클라이언트 연결 등록
   */
  addClient(userId: string, controller: ReadableStreamDefaultController) {
    const existingClients = this.clients.get(userId) || [];
    existingClients.push({ userId, controller });
    this.clients.set(userId, existingClients);

    console.log(`✅ SSE 클라이언트 연결: ${userId} (총 ${existingClients.length}개 연결)`);
  }

  /**
   * 클라이언트 연결 해제
   */
  removeClient(userId: string, controller: ReadableStreamDefaultController) {
    const existingClients = this.clients.get(userId) || [];
    const filteredClients = existingClients.filter(
      (client) => client.controller !== controller
    );

    if (filteredClients.length > 0) {
      this.clients.set(userId, filteredClients);
    } else {
      this.clients.delete(userId);
    }

    console.log(`❌ SSE 클라이언트 연결 해제: ${userId} (남은 연결: ${filteredClients.length}개)`);
  }

  /**
   * 특정 사용자에게 알림 전송
   */
  notifyUser(userId: string, event: NotificationEvent) {
    const clients = this.clients.get(userId);

    if (!clients || clients.length === 0) {
      console.log(`ℹ️  알림 대상 미접속: ${userId}`);
      return;
    }

    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    clients.forEach((client) => {
      try {
        client.controller.enqueue(data);
        console.log(`📤 알림 전송 성공: ${userId}`);
      } catch (error) {
        console.error(`❌ 알림 전송 실패: ${userId}`, error);
        this.removeClient(userId, client.controller);
      }
    });
  }

  /**
   * 연결된 클라이언트 수 조회
   */
  getClientCount(userId?: string): number {
    if (userId) {
      return this.clients.get(userId)?.length || 0;
    }
    return Array.from(this.clients.values()).reduce(
      (sum, clients) => sum + clients.length,
      0
    );
  }
}

// 싱글톤 인스턴스
export const notificationManager = new NotificationManager();
