"use client";

/**
 * 이미지 클라이언트 업로드 (로고 참고 이미지·기존 로고·사업자등록증 이미지)
 * presign URL 발급 → R2 직접 PUT(원본, 20MB까지) → finalize(원본은 슬랙, 표시용 webp 는 R2)
 * PDF 처럼 이미지가 아닌 파일은 호출하는 쪽에서 기존 /api/upload 를 쓴다.
 */

import {
  PROFILE_MAX_SIZE,
  ProfileUploadError,
  putToR2,
} from "@/lib/submission/uploadProfile";
import type { DisplayImageField } from "@/lib/constants/displayImageFields";

const FILE_UPLOAD_CONTACT = "mkt@polarad.co.kr";

export async function uploadDisplayImage(
  file: File,
  field: DisplayImageField,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  if (file.size > PROFILE_MAX_SIZE) {
    throw new ProfileUploadError(
      `파일 크기는 20MB 이하여야 합니다. 더 큰 파일은 ${FILE_UPLOAD_CONTACT}로 메일 발송 부탁드립니다.`,
      false,
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new ProfileUploadError("이미지 파일만 업로드할 수 있습니다.", false);
  }

  let presign: { uploadUrl: string; tempKey: string };
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new ProfileUploadError(
        e.error || "업로드 준비에 실패했습니다.",
        false,
      );
    }
    presign = await res.json();
  } catch (err) {
    if (err instanceof ProfileUploadError) throw err;
    throw new ProfileUploadError(
      "업로드 준비 중 네트워크 오류가 발생했습니다.",
      true,
    );
  }

  await putToR2(presign.uploadUrl, file, onProgress);

  try {
    const res = await fetch("/api/upload/image-finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempKey: presign.tempKey,
        field,
        filename: file.name,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      throw new ProfileUploadError(
        data?.error || "이미지 처리에 실패했습니다.",
        false,
      );
    }
    return data.url as string;
  } catch (err) {
    if (err instanceof ProfileUploadError) throw err;
    throw new ProfileUploadError(
      "이미지 처리 중 네트워크 오류가 발생했습니다.",
      true,
    );
  }
}
