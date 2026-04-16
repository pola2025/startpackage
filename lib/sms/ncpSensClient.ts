/**
 * NCP SENS SMS 발송 클라이언트
 *
 * Naver Cloud Platform Simple & Easy Notification Service
 * 문서: https://api.ncloud-docs.com/docs/ai-application-service-sens-smsv2
 */

import crypto from "crypto";

// ============================================
// 타입 정의
// ============================================

export interface SMSMessage {
  to: string; // 수신 번호 (하이픈 제거: 01012345678)
  content: string; // 메시지 내용
}

export interface SMSRequest {
  type: "SMS" | "LMS" | "MMS"; // SMS: 단문(80byte), LMS: 장문(2000byte)
  from: string; // 발신 번호
  subject?: string; // 제목 (LMS/MMS만)
  content?: string; // 기본 내용 (모든 수신자에게 동일)
  messages: SMSMessage[]; // 개별 메시지
}

export interface SMSResponse {
  statusCode: string; // "202": 성공
  statusName: string;
  requestId: string;
  requestTime: string;
}

// ============================================
// NCP SENS Client
// ============================================

export class NCPSensClient {
  private serviceId: string;
  private accessKey: string;
  private secretKey: string;
  private senderPhone: string;
  private baseUrl: string;

  constructor() {
    // 환경변수에서 로드
    this.serviceId = process.env.NCP_SERVICE_ID || "";
    this.accessKey = process.env.NCP_ACCESS_KEY || "";
    this.secretKey = process.env.NCP_SECRET_KEY || "";
    this.senderPhone =
      process.env.NCP_SENDER_PHONE || process.env.NCP_PHONE_NUMBER || "";
    this.baseUrl = "https://sens.apigw.ntruss.com";

    // 환경변수 체크는 실제 발송 시점에 수행
    console.log("🔧 NCP SENS 설정:");
    console.log("  SERVICE_ID:", this.serviceId ? "✅ 설정됨" : "❌ 없음");
    console.log("  ACCESS_KEY:", this.accessKey ? "✅ 설정됨" : "❌ 없음");
    console.log("  SECRET_KEY:", this.secretKey ? "✅ 설정됨" : "❌ 없음");
    console.log(
      "  SENDER_PHONE:",
      this.senderPhone ? `✅ ${this.senderPhone}` : "❌ 없음",
    );
  }

  /**
   * 환경변수 설정 여부 확인
   */
  private checkConfig(): void {
    if (!this.serviceId || !this.accessKey || !this.secretKey) {
      throw new Error(
        "NCP SENS 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.\n" +
          "필요한 환경변수: NCP_SERVICE_ID, NCP_ACCESS_KEY, NCP_SECRET_KEY, NCP_SENDER_PHONE",
      );
    }
  }

  /**
   * HMAC SHA256 서명 생성
   */
  private makeSignature(
    timestamp: string,
    method: string,
    url: string,
  ): string {
    const space = " ";
    const newLine = "\n";

    const hmac = crypto.createHmac("sha256", this.secretKey);
    const message = [
      method,
      space,
      url,
      newLine,
      timestamp,
      newLine,
      this.accessKey,
    ].join("");

    const signature = hmac.update(message).digest("base64");
    return signature;
  }

  /**
   * SMS 발송
   *
   * @param to - 수신 번호 (01012345678 형식)
   * @param content - 메시지 내용
   * @param type - SMS(단문) 또는 LMS(장문)
   */
  async sendSMS(
    to: string,
    content: string,
    type: "SMS" | "LMS" = "LMS",
    options?: { from?: string },
  ): Promise<SMSResponse> {
    // 하이픈 제거
    const cleanPhone = to.replace(/-/g, "");

    const request: SMSRequest = {
      type,
      from: options?.from || this.senderPhone,
      content, // 기본 내용
      messages: [
        {
          to: cleanPhone,
          content, // 개별 메시지 내용
        },
      ],
    };

    return this.send(request);
  }

  /**
   * 대량 SMS 발송
   */
  async sendBulkSMS(
    messages: SMSMessage[],
    type: "SMS" | "LMS" = "LMS",
  ): Promise<SMSResponse> {
    const request: SMSRequest = {
      type,
      from: this.senderPhone,
      messages: messages.map((msg) => ({
        ...msg,
        to: msg.to.replace(/-/g, ""), // 하이픈 제거
      })),
    };

    return this.send(request);
  }

  /**
   * 실제 API 호출
   */
  private async send(request: SMSRequest): Promise<SMSResponse> {
    // 환경변수 체크
    this.checkConfig();

    const timestamp = Date.now().toString();
    const method = "POST";
    const url = `/sms/v2/services/${this.serviceId}/messages`;

    const signature = this.makeSignature(timestamp, method, url);

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": this.accessKey,
      "x-ncp-apigw-signature-v2": signature,
    };

    console.log("📤 SMS 발송 요청:");
    console.log(`  발신: ${request.from}`);
    console.log(`  수신: ${request.messages.map((m) => m.to).join(", ")}`);
    console.log(`  타입: ${request.type}`);
    console.log(`  내용: ${request.messages[0].content.substring(0, 50)}...`);

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ SMS 발송 실패:", data);
        throw new Error(
          `SMS 발송 실패: ${data.statusName || response.statusText}`,
        );
      }

      console.log("✅ SMS 발송 성공:", data);

      return data as SMSResponse;
    } catch (error) {
      console.error("❌ SMS 발송 에러:", error);
      throw error;
    }
  }

  /**
   * 메시지 길이에 따라 자동으로 SMS/LMS 선택
   */
  async sendAuto(
    to: string,
    content: string,
    options?: { from?: string },
  ): Promise<SMSResponse> {
    // SMS: 한글 45자(90byte), 영문 80자
    // LMS: 한글 1000자(2000byte), 영문 2000자
    const byteLength = Buffer.byteLength(content, "utf-8");

    const type = byteLength <= 90 ? "SMS" : "LMS";

    return this.sendSMS(to, content, type, options);
  }
}

// ============================================
// 싱글톤 인스턴스
// ============================================

let smsClient: NCPSensClient | null = null;

export function getSMSClient(): NCPSensClient {
  if (!smsClient) {
    smsClient = new NCPSensClient();
  }
  return smsClient;
}

// ============================================
// 편의 함수
// ============================================

/**
 * SMS 간편 발송
 * @param options.from - 발신번호 오버라이드 (NCP SENS에 등록된 번호여야 함)
 */
export async function sendSMS(
  to: string,
  content: string,
  options?: { from?: string },
): Promise<SMSResponse> {
  const client = getSMSClient();
  return client.sendAuto(to, content, options);
}

/**
 * 대량 SMS 발송
 */
export async function sendBulkSMS(
  messages: SMSMessage[],
): Promise<SMSResponse> {
  const client = getSMSClient();
  return client.sendBulkSMS(messages);
}

// ============================================
// 관리자별 발신번호 매핑
// ============================================

const ADMIN_SENDER_MAP: Record<string, string> = {
  "contact@polarad.co.kr": "01066246615",
};

/**
 * 관리자 이메일에 따른 발신번호 반환
 * 매핑이 없으면 undefined (기본 발신번호 사용)
 */
export function getSenderPhoneByAdmin(
  adminEmail?: string | null,
): string | undefined {
  if (!adminEmail) return undefined;
  return ADMIN_SENDER_MAP[adminEmail];
}

// ============================================
// 내보내기
// ============================================

export default {
  NCPSensClient,
  getSMSClient,
  sendSMS,
  sendBulkSMS,
};
