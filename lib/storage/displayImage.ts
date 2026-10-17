/**
 * 이미지 업로드 처리 (서버 전용) — 로고 참고 이미지, 기존 로고 파일, 사업자등록증 이미지
 * - 원본은 슬랙으로 전송 (디자인·확인용 원본 해상도)
 * - 관리자 화면 표시용 webp 는 압축해서 R2 에 저장
 * - 슬랙 채널이 아직 없으면 원본을 R2 에 보관했다가 채널이 생기면 올리고 지운다
 *
 * 원칙은 프로필 사진(lib/storage/profileUpload.ts)과 같다: 원본은 슬랙에 확보되므로
 * webp 는 언제든 다시 만들 수 있는 파생물이다.
 */

import sharp from "sharp";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import prisma from "@/lib/prisma";
import { uploadToR2WithRetry } from "@/lib/storage/profileUpload";
import {
  clearPendingDisplayOriginal,
  savePendingDisplayOriginal,
} from "@/lib/storage/displayOriginal";
import { uploadOriginalImageToSlack } from "@/lib/notification/slackClient";
import { SLACK_ONLY_MARKER } from "@/lib/constants/sensitiveFields";
import {
  DISPLAY_IMAGE_FIELDS,
  displayWebpFileName,
  type DisplayImageField,
} from "@/lib/constants/displayImageFields";

/**
 * 표시용 webp 로 압축 (기본 최대 1600px, 목표 ~400KB)
 * 로고·서류는 글자가 읽혀야 해서 프로필 사진(1000px, 200KB)보다 크게 둔다.
 */
export async function compressToDisplayWebp(
  buffer: Buffer,
  {
    maxWidth = 1600,
    targetBytes = 400 * 1024,
  }: { maxWidth?: number; targetBytes?: number } = {},
): Promise<Buffer> {
  let width = maxWidth;
  let quality = 85;
  const render = () =>
    sharp(buffer)
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

  let out = await render();
  while (out.length > targetBytes && quality > 45) {
    quality -= 10;
    out = await render();
  }
  while (out.length > targetBytes && width > 800) {
    width -= 200;
    out = await render();
  }
  return out;
}

export interface DisplayImageResult {
  url: string;
  slackSent: boolean;
  needsWebpRegen?: boolean;
}

export async function processDisplayImage(params: {
  userId: string;
  field: DisplayImageField;
  buffer: Buffer;
  originalFilename: string;
  /** 파일 내용으로 확인한 형식 (image/jpeg 등) */
  contentType: string;
}): Promise<DisplayImageResult> {
  const { userId, field, buffer, originalFilename, contentType } = params;
  const label = DISPLAY_IMAGE_FIELDS[field].label;

  const user = isD1RuntimeEnabled()
    ? await callDataService<{ slackChannelId: string | null; 이름: string }>(
        "shared-domain/profile-user",
        { userId },
      )
    : await prisma.user.findUnique({
        where: { id: userId },
        select: { slackChannelId: true, 이름: true },
      });

  // 1) 원본을 슬랙으로 (채널이 있을 때)
  let slackSent = false;
  if (user?.slackChannelId) {
    const ext = originalFilename.split(".").pop() || "jpg";
    slackSent = await uploadOriginalImageToSlack({
      channelId: user.slackChannelId,
      buffer,
      fileName: `${label.replace(/\s+/g, "_")}_원본_${Date.now()}.${ext}`,
      title: `${label} (원본)`,
      userName: user.이름,
    });
  }

  // 슬랙에 올라갔으면 서버에 원본을 남기지 않는다. 못 올렸으면 보관해 두고 채널이 생기면 올린다.
  try {
    if (slackSent) await clearPendingDisplayOriginal(userId, field);
    else
      await savePendingDisplayOriginal({ userId, field, buffer, contentType });
  } catch (error) {
    console.error(`[displayImage] ${label} 원본 보관 처리 실패:`, error);
  }

  // 2) 관리자 화면 표시용 webp
  let r2Url: string | null = null;
  try {
    const webp = await compressToDisplayWebp(buffer);
    const { url } = await uploadToR2WithRetry(
      webp,
      displayWebpFileName(field),
      "image/webp",
      userId,
    );
    r2Url = url;
  } catch (error) {
    console.error(`[displayImage] ${label} webp 저장 실패:`, error);
  }

  if (r2Url) return { url: r2Url, slackSent };
  if (slackSent)
    return { url: SLACK_ONLY_MARKER, slackSent: true, needsWebpRegen: true };
  throw new Error(`${label} 처리 실패 (슬랙/R2 모두 실패)`);
}
