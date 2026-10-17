/**
 * 슬랙에 아직 못 보낸 이미지 원본 (서버 전용)
 *
 * 업로드 시점에 슬랙 채널이 없으면 원본을 R2 에 잠시 두었다가,
 * 채널이 생기면 슬랙에 올리고 지운다. 슬랙에는 표시용 webp 가 아니라 이 원본만 올린다.
 */

import { fileTypeFromBuffer } from "file-type";
import {
  deleteFromR2,
  getObjectBuffer,
  uploadToR2,
} from "@/lib/storage/r2Client";
import {
  DISPLAY_IMAGE_FIELDS,
  type DisplayImageField,
} from "@/lib/constants/displayImageFields";

const pendingKey = (userId: string, field: DisplayImageField) =>
  `${userId}/_original/${DISPLAY_IMAGE_FIELDS[field].key}`;

/** 같은 필드로 새로 올리면 이전에 대기 중이던 원본을 덮어쓴다. */
export async function savePendingDisplayOriginal(params: {
  userId: string;
  field: DisplayImageField;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  await uploadToR2(
    params.buffer,
    DISPLAY_IMAGE_FIELDS[params.field].key,
    params.contentType,
    `${params.userId}/_original`,
  );
}

/** 대기 중인 원본이 없으면 null */
export async function loadPendingDisplayOriginal(
  userId: string,
  field: DisplayImageField,
): Promise<{ buffer: Buffer; extension: string } | null> {
  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer(pendingKey(userId, field));
  } catch {
    // 객체가 없거나 일시 장애다. 일시 장애면 원본이 남아 다음 기회에 다시 시도된다.
    return null;
  }
  const detected = await fileTypeFromBuffer(buffer).catch(() => null);
  return { buffer, extension: detected?.ext ?? "jpg" };
}

export async function clearPendingDisplayOriginal(
  userId: string,
  field: DisplayImageField,
): Promise<void> {
  await deleteFromR2(pendingKey(userId, field));
}
