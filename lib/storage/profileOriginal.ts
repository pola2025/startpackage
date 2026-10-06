/**
 * 슬랙에 아직 못 보낸 프로필 사진 원본 (서버 전용)
 *
 * 수강생이 사진을 올리는 시점에는 슬랙 채널이 아직 없는 경우가 많다.
 * 그때는 원본을 R2 에 잠시 두었다가 채널이 생기면 슬랙에 올리고 지운다.
 * 슬랙에는 표시용 webp 가 아니라 이 원본만 올린다.
 */

import { fileTypeFromBuffer } from "file-type";
import {
  deleteFromR2,
  getObjectBuffer,
  uploadToR2,
} from "@/lib/storage/r2Client";

const pendingKey = (userId: string) => `${userId}/_original/profile`;

/** 새로 올리면 이전에 대기 중이던 원본을 덮어쓴다. */
export async function savePendingProfileOriginal(params: {
  userId: string;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  await uploadToR2(
    params.buffer,
    "profile",
    params.contentType,
    `${params.userId}/_original`,
  );
}

/** 대기 중인 원본이 없으면 null */
export async function loadPendingProfileOriginal(
  userId: string,
): Promise<{ buffer: Buffer; extension: string } | null> {
  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer(pendingKey(userId));
  } catch {
    // 객체가 없거나 일시 장애다. 일시 장애면 원본이 그대로 남아 다음 기회에 다시 시도된다.
    return null;
  }
  const detected = await fileTypeFromBuffer(buffer).catch(() => null);
  return { buffer, extension: detected?.ext ?? "jpg" };
}

export async function clearPendingProfileOriginal(
  userId: string,
): Promise<void> {
  await deleteFromR2(pendingKey(userId));
}
