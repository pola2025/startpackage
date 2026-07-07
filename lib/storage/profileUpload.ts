/**
 * 프로필 사진 처리 (서버 전용)
 * - 원본은 슬랙으로 전송 (디자인 작업용 원본 해상도)
 * - 표시용 webp(~200KB)는 R2에 저장
 *
 * 원칙: 원본은 슬랙에 확보되므로 R2 webp는 언제든 재생성 가능한 파생물.
 *       따라서 슬랙 전송 성공 = 성공 처리. R2 일시장애여도 원본 손실 없음.
 */

import sharp from "sharp";
import prisma from "@/lib/prisma";
import { uploadToR2, generateFileName } from "@/lib/storage/r2Client";
import { uploadProfilePhotoToSlack } from "@/lib/notification/slackClient";
import { SLACK_ONLY_MARKER } from "@/lib/constants/sensitiveFields";

/**
 * 프로필 사진을 표시용 webp로 압축 (목표 ~200KB)
 * - EXIF 방향 보정(rotate) 후 최대 1000px로 리사이즈
 * - quality를 낮춰가며 목표 용량에 맞춤, 그래도 크면 해상도 축소
 */
export async function compressProfileToWebp(
  buffer: Buffer,
  targetBytes = 200 * 1024,
): Promise<Buffer> {
  let width = 1000;
  let quality = 82;

  const render = () =>
    sharp(buffer)
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

  let out = await render();

  // 1차: 품질 조정 (82 → 40)
  while (out.length > targetBytes && quality > 40) {
    quality -= 10;
    out = await render();
  }

  // 2차: 해상도 축소 (1000 → 400)
  while (out.length > targetBytes && width > 400) {
    width -= 200;
    out = await render();
  }

  return out;
}

/**
 * R2 업로드 (일시 장애 대비 지수 백오프 재시도)
 */
export async function uploadToR2WithRetry(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  userId: string,
  retries = 3,
): Promise<{ url: string; key: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadToR2(fileBuffer, fileName, contentType, userId);
    } catch (error) {
      lastError = error;
      console.error(
        `[profileUpload] R2 업로드 실패 (${attempt}/${retries})`,
        error,
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
  }
  throw lastError;
}

export interface ProfilePhotoResult {
  url: string;
  slackSent: boolean;
  needsWebpRegen?: boolean;
}

/**
 * 프로필 원본 버퍼를 받아 (1) 슬랙 원본 전송 + (2) webp 압축 R2 저장까지 처리
 * @returns url: 표시용 webp URL (R2 실패 시 SLACK_ONLY_MARKER)
 * @throws 슬랙/R2 모두 실패한 경우
 */
export async function processProfilePhoto(params: {
  userId: string;
  buffer: Buffer;
  originalFilename: string;
}): Promise<ProfilePhotoResult> {
  const { userId, buffer, originalFilename } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { slackChannelId: true, 이름: true },
  });

  // 1) 원본을 슬랙으로 전송 (채널이 있을 때) — 디자인 작업용 원본 해상도
  let slackSent = false;
  if (user?.slackChannelId) {
    const ext = originalFilename.split(".").pop() || "jpg";
    slackSent = await uploadProfilePhotoToSlack({
      channelId: user.slackChannelId,
      buffer,
      fileName: `프로필사진_원본_${Date.now()}.${ext}`,
      userName: user.이름,
    });
  } else {
    console.log(
      "📸 [profileUpload] 슬랙 채널 없음 - 원본 전송 스킵 (webp만 저장)",
    );
  }

  // 2) 표시용 webp(~200KB) 압축 후 R2 저장 (일시 장애 대비 재시도)
  let r2Url: string | null = null;
  try {
    const webpBuffer = await compressProfileToWebp(buffer);
    console.log(
      `📸 [profileUpload] webp 압축 완료: ${(webpBuffer.length / 1024).toFixed(0)}KB`,
    );
    const webpFilename = generateFileName("프로필사진URL", "profile.webp");
    const { url } = await uploadToR2WithRetry(
      webpBuffer,
      webpFilename,
      "image/webp",
      userId,
    );
    r2Url = url;
    console.log("📸 [profileUpload] webp R2 저장 완료:", url);
  } catch (error) {
    console.error("📸 [profileUpload] webp 압축/R2 저장 실패:", error);
  }

  // 3) 성공 판정 (원본은 슬랙에 안전 → webp는 재생성 가능한 파생물)
  if (r2Url) {
    return { url: r2Url, slackSent };
  }

  // R2 일시 장애: 원본이 슬랙에 전송됐으면 성공 처리 (표시용 webp는 추후 복구)
  if (slackSent) {
    console.warn(
      "📸 [profileUpload] R2 저장 실패했으나 원본 슬랙 전송 성공 → 성공 처리 (webp 재생성 대기)",
    );
    return { url: SLACK_ONLY_MARKER, slackSent: true, needsWebpRegen: true };
  }

  // 슬랙/R2 모두 실패
  throw new Error("프로필 사진 처리 실패 (슬랙/R2 모두 실패)");
}
