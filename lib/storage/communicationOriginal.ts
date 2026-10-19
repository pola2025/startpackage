/**
 * 문의 첨부 이미지 원본 (서버 전용)
 *
 * 화면에는 webp 로 바꾼 첨부를 보여 주고, 슬랙 Q&A 채널에는 교육생이 올린 원본을 올린다.
 * 업로드 때 원본을 R2 에 잠시 두었다가 문의가 접수되면 슬랙에 올리고 지운다.
 */

import { fileTypeFromBuffer } from "file-type";
import {
  deleteFromR2,
  getObjectBuffer,
  uploadToR2,
} from "@/lib/storage/r2Client";
import {
  postMessage,
  uploadOriginalImageToSlack,
} from "@/lib/notification/slackClient";

/** webp 키(communication/{userId}/communication_123.webp)와 짝이 되는 원본 키 */
function originalKeyOf(webpKey: string): string | null {
  const match = /^(communication\/[^/]+)\/(communication_\d+)\.webp$/.exec(
    webpKey,
  );
  return match ? `${match[1]}/_original/${match[2]}` : null;
}

export async function saveCommunicationOriginal(params: {
  webpKey: string;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  const key = originalKeyOf(params.webpKey);
  if (!key) return;
  const slash = key.lastIndexOf("/");
  await uploadToR2(
    params.buffer,
    key.slice(slash + 1),
    params.contentType,
    key.slice(0, slash),
  );
}

export interface CommunicationOriginal {
  url: string;
  key: string;
  buffer: Buffer;
  extension: string;
}

/**
 * 첨부 주소 가운데 이 교육생이 올린 이미지의 원본을 찾는다.
 * 원본이 없는 첨부(문서, 이 기능 전에 올린 이미지)는 결과에서 빠진다.
 */
export async function loadCommunicationOriginals(
  userId: string,
  urls: string[],
): Promise<CommunicationOriginal[]> {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!base) return [];
  // 다른 사람이 올린 첨부 주소를 넣어도 그 원본은 꺼내지 않는다.
  const prefix = `${base}/communication/${userId}/`;
  const originals: CommunicationOriginal[] = [];
  for (const url of urls) {
    if (!url.startsWith(prefix)) continue;
    const key = originalKeyOf(url.slice(base.length + 1));
    if (!key) continue;
    try {
      const buffer = await getObjectBuffer(key);
      const detected = await fileTypeFromBuffer(buffer).catch(() => null);
      originals.push({ url, key, buffer, extension: detected?.ext ?? "jpg" });
    } catch {
      // 원본이 없으면 슬랙에 webp 링크를 그대로 남긴다.
    }
  }
  return originals;
}

/**
 * 원본을 슬랙에 올리고, 올라간 원본은 서버에서 지운다.
 * 못 올린 원본은 지우지 않고 웹 표시용 링크라도 남긴다.
 * @returns 슬랙에 올린 개수
 */
export async function sendCommunicationOriginals(params: {
  channelId: string;
  originals: CommunicationOriginal[];
  sender: string;
}): Promise<number> {
  const failed: CommunicationOriginal[] = [];
  for (const [index, original] of params.originals.entries()) {
    const sent = await uploadOriginalImageToSlack({
      channelId: params.channelId,
      buffer: original.buffer,
      fileName: `문의첨부_원본_${Date.now()}_${index + 1}.${original.extension}`,
      title: "문의 첨부 원본",
      userName: params.sender,
    });
    if (!sent) {
      failed.push(original);
      continue;
    }
    await deleteFromR2(original.key).catch((error) =>
      console.error("[communicationOriginal] 원본 삭제 실패:", error),
    );
  }
  if (failed.length) {
    await postMessage({
      channelId: params.channelId,
      text: `⚠️ 첨부 원본을 슬랙에 올리지 못했습니다. 웹 표시용 사본:\n${failed.map((original) => `• <${original.url}>`).join("\n")}`,
    });
  }
  return params.originals.length - failed.length;
}
