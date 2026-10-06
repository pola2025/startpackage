/**
 * NCP SENS 알림톡 클라이언트
 *
 * 문서: https://api.ncloud-docs.com/docs/sens-alimtalk-send
 *
 * 요청이 접수(202·A000)돼도 실제 결과는 뒤에 정해진다. 검수 전 템플릿은 접수된 뒤
 * "템플릿을 찾을 수 없음"(3015)으로 실패하고, 대체발송을 켜 두면 SENS 가 문자를 대신 보낸다
 * (2026-10-06 실측). 그래서 모든 요청에 대체발송을 켠다.
 */

import crypto from "crypto";
import { smsTypeFor } from "./ncpSensClient";

export type AlimtalkButton =
  | { type: "WL"; name: string; linkMobile: string; linkPc: string }
  | { type: "DS"; name: string };

/** 본문과 버튼은 검수받은 템플릿과 글자 하나까지 같아야 한다. */
export interface AlimtalkMessage {
  templateCode: string;
  content: string;
  buttons?: AlimtalkButton[];
}

export type AlimtalkRequestResult =
  | { accepted: true; messageId: string }
  | { accepted: false; reason: string };

export type AlimtalkResult = {
  /** delivered: 알림톡 도착, failover: 문자로 대체 발송, failed: 둘 다 실패, pending: 아직 결과 없음 */
  state: "delivered" | "failover" | "failed" | "pending";
  description?: string;
};

const BASE_URL = "https://sens.apigw.ntruss.com";
const REQUEST_TIMEOUT_MS = 10_000;

function config() {
  return {
    serviceId: process.env.NCP_KAKAO_SERVICE_ID || "",
    channelId: process.env.NCP_KAKAO_CHANNEL_ID || "",
    accessKey: process.env.NCP_ACCESS_KEY || "",
    secretKey: process.env.NCP_SECRET_KEY || "",
  };
}

/** 알림톡 설정이 없으면 호출 쪽이 기존 문자 발송을 그대로 쓴다. */
export function isAlimtalkConfigured(): boolean {
  const { serviceId, channelId, accessKey, secretKey } = config();
  return Boolean(serviceId && channelId && accessKey && secretKey);
}

async function call(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const { accessKey, secretKey } = config();
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${method} ${path}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return { status: response.status, body: await response.json().catch(() => null) };
}

function messagesPath(): string {
  return `/alimtalk/v2/services/${encodeURIComponent(config().serviceId)}/messages`;
}

/**
 * 알림톡 발송을 요청한다. 실패하면 SENS 가 failover.content 를 문자로 보낸다.
 * 요청이 거절되면 accepted: false 를 돌려주고, 응답을 받지 못하면(시간 초과 등) 예외를 던진다.
 * 응답을 못 받은 경우는 SENS 가 이미 접수했을 수 있으므로 호출 쪽에서 문자를 다시 보내지 않는다.
 */
export async function requestAlimtalk(input: {
  to: string;
  message: AlimtalkMessage;
  failover: { content: string; from?: string };
}): Promise<AlimtalkRequestResult> {
  const { message, failover } = input;
  const response = await call("POST", messagesPath(), {
    plusFriendId: config().channelId,
    templateCode: message.templateCode,
    messages: [
      {
        to: input.to.replace(/\D/g, ""),
        content: message.content,
        ...(message.buttons?.length ? { buttons: message.buttons } : {}),
        useSmsFailover: true,
        failoverConfig: {
          type: smsTypeFor(failover.content),
          ...(failover.from ? { from: failover.from } : {}),
          content: failover.content,
        },
      },
    ],
  });

  const first = response.body?.messages?.[0];
  if (response.status === 202 && first?.requestStatusCode === "A000" && first.messageId) {
    return { accepted: true, messageId: String(first.messageId) };
  }

  return {
    accepted: false,
    reason: String(
      first?.requestStatusDesc ||
        response.body?.errors?.join?.(", ") ||
        response.body?.statusName ||
        `HTTP ${response.status}`,
    ).slice(0, 100),
  };
}

/** 접수된 알림톡의 실제 결과를 조회한다. 조회에 실패하면 pending 으로 본다. */
export async function getAlimtalkResult(messageId: string): Promise<AlimtalkResult> {
  try {
    const response = await call("GET", `${messagesPath()}/${encodeURIComponent(messageId)}`);
    const result = response.body;
    if (response.status !== 200 || !result) return { state: "pending" };

    if (result.messageStatusName === "success") return { state: "delivered" };
    if (result.messageStatusName !== "fail") return { state: "pending" };

    const description = String(result.messageStatusDesc || result.messageStatusCode || "").slice(0, 60);
    const failover = result.failover;
    if (!failover) return { state: "failed", description };
    // 대체 문자가 접수됐고 실패로 끝나지 않았으면 문자로 나간 것으로 본다.
    if (failover.requestStatusName === "success" && failover.messageStatusName !== "fail") {
      return { state: "failover", description };
    }
    return { state: "failed", description };
  } catch (error) {
    console.error("알림톡 결과 조회 실패:", error);
    return { state: "pending" };
  }
}
