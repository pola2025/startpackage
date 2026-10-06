/**
 * 수강생 안내 발송: 알림톡을 먼저 요청하고, 안 되면 문자로 보낸다.
 *
 * - 알림톡 설정이 없거나 이 안내에 맞는 템플릿이 없으면 지금까지처럼 문자를 보낸다.
 * - 알림톡 요청이 거절되면 같은 내용을 문자로 바로 보낸다.
 * - 요청이 접수된 뒤 실패하면(검수 전 템플릿 등) SENS 가 문자로 대체 발송한다.
 */

import { getSMSClient, sendSMS, smsTypeFor } from "@/lib/sms/ncpSensClient";
import {
  getAlimtalkResult,
  isAlimtalkConfigured,
  requestAlimtalk,
  type AlimtalkMessage,
} from "@/lib/sms/ncpAlimtalkClient";
import type { OutboundNoticeChannel } from "./notificationService";

export type NoticeSend =
  | { via: "sms"; channel: "SMS" | "LMS"; note?: string }
  | {
      via: "alimtalk";
      messageId: string;
      smsChannel: "SMS" | "LMS";
      requestedAt: number;
    };

export type NoticeOutcome = { channel: OutboundNoticeChannel; note?: string };

// 실측에서 결과가 1초 안팎에 정해졌다. 한 번 더 기다려도 없으면 확인 전으로 기록한다.
const FIRST_LOOKUP_AFTER_MS = 1500;
const SECOND_LOOKUP_AFTER_MS = 2000;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function sendMemberNotice(input: {
  to: string;
  /** 이 안내에 쓸 템플릿. null 이면 문자로만 보낸다. */
  alimtalk: AlimtalkMessage | null;
  sms: { content: string; from?: string; forceLms?: boolean };
}): Promise<NoticeSend> {
  const { to, alimtalk, sms } = input;
  const smsChannel = sms.forceLms ? "LMS" : smsTypeFor(sms.content);

  let rejection: string | undefined;
  if (alimtalk && isAlimtalkConfigured()) {
    const requested = await requestAlimtalk({
      to,
      message: alimtalk,
      failover: { content: sms.content, from: sms.from },
    });
    if (requested.accepted) {
      return {
        via: "alimtalk",
        messageId: requested.messageId,
        smsChannel,
        requestedAt: Date.now(),
      };
    }
    rejection = requested.reason;
  }

  const options = sms.from ? { from: sms.from } : undefined;
  if (sms.forceLms)
    await getSMSClient().sendSMS(to, sms.content, "LMS", options);
  else await sendSMS(to, sms.content, options);

  return {
    via: "sms",
    channel: smsChannel,
    ...(rejection
      ? { note: `알림톡 요청 거절(${rejection})로 문자 발송` }
      : {}),
  };
}

/** 실제로 어떤 경로로 나갔는지 확인한다. 슬랙 발송 기록에 쓴다. */
export async function resolveNoticeOutcome(
  send: NoticeSend,
  options: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<NoticeOutcome> {
  if (send.via === "sms")
    return { channel: send.channel, ...(send.note ? { note: send.note } : {}) };

  const sleep = options.sleep ?? defaultSleep;
  const elapsed = Date.now() - send.requestedAt;
  if (elapsed < FIRST_LOOKUP_AFTER_MS)
    await sleep(FIRST_LOOKUP_AFTER_MS - elapsed);

  let result = await getAlimtalkResult(send.messageId);
  if (result.state === "pending") {
    await sleep(SECOND_LOOKUP_AFTER_MS);
    result = await getAlimtalkResult(send.messageId);
  }

  switch (result.state) {
    case "delivered":
      return { channel: "알림톡" };
    case "failover":
      return {
        channel: send.smsChannel,
        note: `알림톡 실패(${result.description})로 문자 대체 발송`,
      };
    case "failed":
      return {
        channel: "알림톡",
        note: `알림톡 실패(${result.description}), 문자 대체 발송도 확인되지 않음`,
      };
    default:
      return {
        channel: "알림톡",
        note: "결과 확인 전, 실패하면 문자로 대체 발송",
      };
  }
}
